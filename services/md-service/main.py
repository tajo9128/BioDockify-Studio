"""
MD Service - OpenMM molecular dynamics simulation + MD-Suite Integration
Features: Dynamics, Minimization, MMGBSA, Analysis, Nanobot Monitoring, Notifications
"""

import os
import logging
import uuid
import json
import threading
import time
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import redis
import httpx

from md_analysis import (
    RMSDAnalyzer,
    RMSFAnalyzer,
    EnergyAnalyzer,
    GyrationAnalyzer,
    SASAAnalyzer,
    HydrogenBondAnalyzer,
)
from publication import PublicationPackager
from notifications import NotificationManager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("md-service")

STORAGE_DIR = Path("/app/storage/md")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
ANALYSIS_DIR = STORAGE_DIR / "analysis"
ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
API_BACKEND_URL = os.getenv("API_BACKEND_URL", "http://api-backend:8000")

try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    redis_available = True
except Exception:
    redis_client = None
    redis_available = False

notifications = NotificationManager()

# VRAM thresholds (MB)
VRAM_4GB = 4096
VRAM_8GB = 8192
VRAM_12GB = 12288


def _detect_gpu_vram():
    """Detect available GPU VRAM in MB. Returns (vram_mb, platform_name) or (None, None)."""
    import openmm as mm

    for platform_name in ["CUDA", "OpenCL", "HIP"]:
        try:
            platform = mm.Platform.getPlatformByName(platform_name)
            if platform_name == "CUDA":
                import subprocess
                try:
                    result = subprocess.run(
                        ["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"],
                        capture_output=True, text=True, timeout=5
                    )
                    if result.returncode == 0:
                        lines = result.stdout.strip().split("\n")
                        if lines:
                            vram = int(lines[0].strip())
                            logger.info(f"GPU detected: {platform_name}, VRAM: {vram} MB")
                            return vram, platform_name
                except (FileNotFoundError, subprocess.TimeoutExpired):
                    pass
            elif platform_name == "OpenCL":
                try:
                    import pyopencl as cl
                    for plat in cl.get_platforms():
                        for device in plat.get_devices(device_type=cl.device_type.GPU):
                            vram = device.global_mem_size // (1024 * 1024)
                            logger.info(f"GPU detected: {platform_name}, VRAM: {vram} MB")
                            return vram, platform_name
                except ImportError:
                    pass
        except Exception:
            pass

    logger.info("No GPU detected or VRAM detection failed")
    return None, None


def _get_best_platform(vram_mb=None, force_cpu=False):
    """Get the best available OpenMM platform with VRAM-aware configuration.

    Returns (platform, platform_properties_dict, use_cpu_fallback).
    For GPUs with < 8GB VRAM, uses mixed precision and reduced memory settings.
    """
    import openmm as mm

    if force_cpu:
        logger.info("CPU forced, using CPU platform")
        return mm.Platform.getPlatformByName("CPU"), {}, True

    if vram_mb is None:
        vram_mb, platform_name = _detect_gpu_vram()

    if vram_mb is None:
        logger.info("GPU not available, using CPU platform")
        return mm.Platform.getPlatformByName("CPU"), {}, True

    platform_props = {}

    if vram_mb < VRAM_4GB:
        logger.warning(f"GPU VRAM {vram_mb}MB is below minimum (4GB). Falling back to CPU.")
        return mm.Platform.getPlatformByName("CPU"), {}, True

    if vram_mb < VRAM_8GB:
        logger.info(f"GPU VRAM {vram_mb}MB detected — using mixed precision (4GB-class GPU)")
        platform_props["CudaPrecision"] = "mixed"
        platform_props["CudaUseStreams"] = "true"
    elif vram_mb < VRAM_12GB:
        logger.info(f"GPU VRAM {vram_mb}MB detected — using mixed precision (8GB-class GPU)")
        platform_props["CudaPrecision"] = "mixed"
    else:
        logger.info(f"GPU VRAM {vram_mb}MB detected — using double precision (12GB+ GPU)")
        platform_props["CudaPrecision"] = "double"

    try:
        platform = mm.Platform.getPlatformByName("CUDA")
        logger.info(f"Using GPU platform: CUDA with props {platform_props}")
        return platform, platform_props, False
    except Exception:
        pass

    try:
        platform = mm.Platform.getPlatformByName("OpenCL")
        platform_props["OpenCLPrecision"] = "mixed" if vram_mb < VRAM_8GB else "single"
        logger.info(f"Using GPU platform: OpenCL with props {platform_props}")
        return platform, platform_props, False
    except Exception:
        pass

    logger.info("GPU platforms failed, falling back to CPU")
    return mm.Platform.getPlatformByName("CPU"), {}, True


def _set_job_status(
    job_id: str,
    status: str,
    result: Optional[Dict] = None,
    error: Optional[str] = None,
    progress: int = 0,
    message: str = "",
):
    if redis_client:
        data = {
            "status": status,
            "progress": progress,
            "message": message,
            "updated_at": datetime.now().isoformat(),
        }
        if result:
            data["result"] = result
        if error:
            data["error"] = error
        redis_client.setex(f"md_job:{job_id}", 7200, json.dumps(data))


def _get_job_status(job_id: str) -> Optional[Dict]:
    if not redis_client:
        return None
    data = redis_client.get(f"md_job:{job_id}")
    return json.loads(data) if data else None


def _persist_to_db(job_id: str, request: "DynamicsRequest", result: Dict[str, Any]):
    """Persist completed MD job result to PostgreSQL and Nanobot memory via api-backend."""
    try:
        payload = {
            "job_uuid": job_id,
            "project_name": request.name,
            "n_steps": result.get("n_steps"),
            "sim_time_ns": result.get("sim_time_ns"),
            "temperature_K": result.get("temperature_K"),
            "solvent_model": result.get("solvent_model"),
            "ionic_strength": request.ionic_strength,
            "n_frames": result.get("n_frames"),
            "avg_energy_kj_mol": result.get("avg_energy_kj_mol"),
            "trajectory_path": result.get("trajectory_path"),
            "final_frame_path": result.get("final_frame_path"),
            "energy_csv_path": result.get("energy_csv_path"),
        }
        result_summary = (
            f"ns={result.get('sim_time_ns', 0):.2f}, "
            f"frames={result.get('n_frames', 0)}, "
            f"avg_energy={result.get('avg_energy_kj_mol', 0):.1f}kJ/mol, "
            f"T={result.get('temperature_K', 0)}K, "
            f"solvent={result.get('solvent_model', 'N/A')}"
        )
        with httpx.Client(timeout=15.0) as client:
            client.post(f"{API_BACKEND_URL}/db/md/save", json=payload)
            client.post(
                f"{API_BACKEND_URL}/memory/auto记住",
                params={
                    "user_id": job_id,
                    "job_uuid": job_id,
                    "job_type": "md",
                    "job_name": request.name,
                    "result_summary": result_summary,
                },
            )
        logger.info(f"Persisted MD result and memory for job {job_id}")
    except Exception as e:
        logger.warning(f"Failed to persist MD result/memory: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("MD Service starting up...")
    logger.info(f"Redis available: {redis_available}")
    logger.info("MD-Suite Nanobot integration: ACTIVE")
    logger.info("Engine: OpenMM (Auto-detect: GPU preferred, CPU fallback)")
    logger.info("=" * 60)
    yield
    logger.info("MD Service shutting down...")


app = FastAPI(
    title="MD Service API",
    description="OpenMM MD simulation + MD-Suite Nanobot analysis (RMSD/RMSF/Energy/Gyration/SASA/H-bonds) + Notifications",
    version="2.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "md-service",
        "engine": "OpenMM",
        "modules": [
            "dynamics",
            "minimize",
            "mmgbsa",
            "analysis",
            "nanobot_monitoring",
            "notifications",
            "publication_packager",
        ],
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/gpu/status")
def gpu_status():
    """Check GPU availability for MD simulations with VRAM detection"""
    try:
        import openmm as mm

        available_platforms = []
        gpu_platforms = []
        vram_mb, detected_platform = _detect_gpu_vram()

        for platform in mm.Platform.getPlatforms():
            name = platform.getName()
            available_platforms.append(name)

            if name in ["CUDA", "OpenCL", "HIP"]:
                props = platform.getProperties()
                gpu_info = {"name": name, "properties": props, "vram_mb": vram_mb}

                if name == "CUDA":
                    gpu_info["device_count"] = props.get("CudaDeviceIndex", "Unknown")
                elif name == "OpenCL":
                    gpu_info["device_count"] = props.get("OpenCLDeviceIndex", "Unknown")

                gpu_platforms.append(gpu_info)

        gpu_available = len(gpu_platforms) > 0
        platform_name = gpu_platforms[0]["name"] if gpu_platforms else "CPU"

        if vram_mb and vram_mb < VRAM_4GB:
            message = f"GPU VRAM {vram_mb}MB below minimum (4GB) — CPU fallback"
            platform_name = "CPU"
            gpu_available = False
        elif vram_mb and vram_mb < VRAM_8GB:
            message = f"GPU {vram_mb}MB — mixed precision mode (GTX 1650 class)"
        elif vram_mb and vram_mb < VRAM_12GB:
            message = f"GPU {vram_mb}MB — mixed precision mode (RTX 3060 8GB class)"
        elif vram_mb:
            message = f"GPU {vram_mb}MB — full precision (RTX 3060 12GB+ class)"
        else:
            message = "No GPU found, using CPU"

        return {
            "gpu_available": gpu_available,
            "gpu_platforms": gpu_platforms,
            "all_platforms": available_platforms,
            "recommended_platform": platform_name,
            "vram_mb": vram_mb,
            "message": message,
        }
    except Exception as e:
        return {"gpu_available": False, "error": str(e), "recommended_platform": "CPU"}


@app.get("/")
def root():
    return {"service": "MD Service (MD-Suite)", "version": "2.0.0", "engine": "OpenMM"}


# ============================================================
# DYNAMICS ENDPOINTS (already exists)
# ============================================================


class DynamicsRequest(BaseModel):
    pdb_content: str
    steps: int = 50000
    temperature: float = 300.0
    pressure: float = 1.0
    frame_interval: int = 500
    solvent_model: str = "tip3p"
    ionic_strength: float = 0.0
    name: str = "simulation"
    notify_on_start: bool = False
    notify_on_complete: bool = True


@app.post("/dynamics")
def run_dynamics(request: DynamicsRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())[:8]
    _set_job_status(job_id, "pending", progress=0)
    background_tasks.add_task(_run_dynamics, job_id, request)
    return {
        "job_id": job_id,
        "status": "pending",
        "message": f"Dynamics queued ({request.steps} steps = {request.steps * 0.002 / 1000:.1f}ns)",
    }


def _compute_adaptive_box_size(pdb):
    """Compute adaptive solvation box size based on protein dimensions.
    Adds 1.0nm padding around the protein (minimum 2.5nm box for small peptides).
    This prevents excessive solvation that would blow VRAM on small GPUs.
    """
    from openmm import unit
    import numpy as np

    positions = np.array([
        list(pdb.positions[i].value_in_unit(unit.nanometer))
        for i in range(len(pdb.positions))
    ])

    mins = positions.min(axis=0)
    maxs = positions.max(axis=0)
    protein_size = maxs - mins

    padding = 1.0
    box = protein_size + 2 * padding

    box_size = max(box.max(), 2.5)

    return box_size


def _run_dynamics(job_id: str, request: DynamicsRequest):
    try:
        import openmm as mm
        import openmm.app as app
        from openmm import unit
        from io import StringIO
        import numpy as np

        _set_job_status(job_id, "running", progress=5)
        if request.notify_on_start:
            notifications.notify_simulation_started(
                job_id, request.steps * 0.002 / 1000
            )

        pdb = app.PDBFile(StringIO(request.pdb_content))

        platform, platform_props, use_cpu = _get_best_platform()

        n_atoms = pdb.topology.getNumAtoms()
        is_small_system = n_atoms < 500

        _set_job_status(job_id, "running", progress=10,
                        message=f"System: {n_atoms} atoms, Platform: {platform.getName()}{' (CPU)' if use_cpu else ''}")

        modeller = app.Modeller(pdb.topology, pdb.positions)

        water = {
            "tip3p": "amber14/tip3p.xml",
            "spce": "amber14/spce.xml",
            "tip4pew": "amber14/tip4pew.xml",
        }.get(request.solvent_model, "amber14/tip3p.xml")
        forcefield = app.ForceField("amber14/protein.ff14SB.xml", water)

        _update_progress(job_id, 15, "Adding hydrogens...")
        modeller.addHydrogens(forcefield)

        _update_progress(job_id, 25, "Solvating (adaptive box)...")
        box_size = _compute_adaptive_box_size(pdb)
        modeller.addSolvent(
            forcefield,
            boxSize=mm.Vec3(box_size, box_size, box_size) * unit.nanometer,
            model=request.solvent_model,
        )

        if request.ionic_strength > 0:
            _update_progress(job_id, 35, f"Adding ions ({request.ionic_strength}M)...")
            modeller.addSolvent(
                forcefield,
                model=request.solvent_model,
                ionicStrength=request.ionic_strength * unit.molar,
            )

        _update_progress(job_id, 45, "Creating OpenMM system...")

        if is_small_system and use_cpu:
            nonbonded_method = app.CutoffPeriodic
            logger.info(f"Small system ({n_atoms} atoms) on CPU: using CutoffPeriodic for speed")
        else:
            nonbonded_method = app.PME

        system = forcefield.createSystem(
            modeller.topology,
            nonbondedMethod=nonbonded_method,
            nonbondedCutoff=1.0 * unit.nanometer,
            constraints=app.HBonds,
        )
        system.addForce(
            mm.MonteCarloBarostat(
                1 * unit.atmosphere, request.temperature * unit.kelvin, 25
            )
        )

        integrator = mm.LangevinIntegrator(
            request.temperature * unit.kelvin,
            1 / unit.picosecond,
            0.002 * unit.picosecond,
        )
        integrator.setConstraintTolerance(1e-5)

        context = mm.Context(system, integrator, platform, platform_props)
        context.setPositions(modeller.positions)

        _update_progress(job_id, 55, "Energy minimizing...")
        mm.LocalEnergyMinimizer.minimize(context, maxIterations=5000)

        _update_progress(job_id, 60, "NVT equilibration (10ps)...")
        context.setVelocitiesToTemperature(request.temperature * unit.kelvin)
        integrator.step(5000)

        _update_progress(job_id, 65, f"Production MD: {request.steps} steps...")

        traj_path = STORAGE_DIR / f"trajectory_{job_id}.pdb"
        energy_csv_path = STORAGE_DIR / f"energies_{job_id}.pdb"

        energies = []
        total_frames = request.steps // request.frame_interval
        frame_count = 0

        with open(traj_path, "w") as traj_file:
            app.PDBFile.writeFile(modeller.topology, modeller.positions, traj_file)

            with open(energy_csv_path, "w") as energy_file:
                energy_file.write("step,energy_kj_mol\n")

                for i in range(0, request.steps, request.frame_interval):
                    integrator.step(request.frame_interval)
                    state = context.getState(getPositions=True, getEnergy=True)
                    positions = state.getPositions(asNumpy=True).value_in_unit(unit.nanometer)
                    energy = state.getPotentialEnergy().value_in_unit(unit.kilojoule_per_mole)
                    energies.append(float(energy))

                    traj_file.write("MODEL\n")
                    app.PDBFile.writeFile(modeller.topology, positions * unit.nanometer, traj_file)
                    traj_file.write("ENDMDL\n")

                    energy_file.write(f"{i * request.frame_interval},{energy}\n")
                    frame_count += 1

                    pct = 65 + int(30 * (i // request.frame_interval) / max(total_frames, 1))
                    _update_progress(job_id, pct, f"Step {i}/{request.steps} ({frame_count} frames)")

                    if i % (request.frame_interval * 5) == 0 and request.notify_on_complete:
                        pct_total = int(65 + 30 * i / max(request.steps, 1))
                        notifications.notify_simulation_progress(
                            job_id,
                            pct_total,
                            f"Step {i}/{request.steps} ({i * 0.002 / 1000:.1f}ns)",
                        )

        _update_progress(job_id, 95, "Saving final frame...")

        last_frame_path = STORAGE_DIR / f"frame_last_{job_id}.pdb"
        last_state = context.getState(getPositions=True)
        with open(last_frame_path, "w") as f:
            app.PDBFile.writeFile(
                modeller.topology,
                last_state.getPositions(asNumpy=True).value_in_unit(unit.nanometer),
                f,
            )

        avg_e = float(np.mean(energies[-10:])) if energies else 0.0
        sim_time_ns = request.steps * 0.002 / 1000

        result = {
            "trajectory_path": str(traj_path),
            "final_frame_path": str(last_frame_path),
            "energy_csv_path": str(energy_csv_path),
            "n_frames": frame_count,
            "n_steps": request.steps,
            "sim_time_ns": sim_time_ns,
            "temperature_K": request.temperature,
            "avg_energy_kj_mol": round(avg_e, 4),
            "solvent_model": request.solvent_model,
            "platform": platform.getName(),
            "n_atoms": n_atoms,
        }
        _set_job_status(job_id, "completed", result=result, progress=100)

        _persist_to_db(job_id, request, result)

        if request.notify_on_complete:
            notifications.notify_simulation_completed(
                job_id,
                {
                    "sim_time_ns": sim_time_ns,
                    "avg_energy": avg_e,
                },
            )

        logger.info(f"Dynamics job {job_id} completed: {sim_time_ns}ns, {frame_count} frames, platform={platform.getName()}")

    except ImportError as e:
        _set_job_status(job_id, "failed", error=f"OpenMM not available: {e}")
    except Exception as e:
        logger.error(f"Dynamics failed: {e}")
        _set_job_status(job_id, "failed", error=str(e))
        notifications.notify_simulation_error(job_id, str(e))


# ============================================================
# ANALYSIS ENDPOINTS (MD-Suite integration)
# ============================================================


class AnalysisRequest(BaseModel):
    job_id: str
    trajectory_path: Optional[str] = None
    energy_csv_path: Optional[str] = None


@app.post("/analysis/rmsd")
def analyze_rmsd(request: AnalysisRequest):
    """RMSD analysis — adapted from MD-Suite analysis/rmsd.py"""
    traj_path = request.trajectory_path or (
        STORAGE_DIR / f"trajectory_{request.job_id}.pdb"
    )
    if not os.path.exists(str(traj_path)):
        raise HTTPException(
            status_code=404, detail=f"Trajectory not found: {traj_path}"
        )

    analyzer = RMSDAnalyzer(STORAGE_DIR)
    result = analyzer.calculate(str(traj_path))
    return result


@app.post("/analysis/rmsf")
def analyze_rmsf(request: AnalysisRequest):
    """RMSF analysis — adapted from MD-Suite analysis/rmsf.py"""
    traj_path = request.trajectory_path or (
        STORAGE_DIR / f"trajectory_{request.job_id}.pdb"
    )
    if not os.path.exists(str(traj_path)):
        raise HTTPException(
            status_code=404, detail=f"Trajectory not found: {traj_path}"
        )

    analyzer = RMSFAnalyzer(STORAGE_DIR)
    result = analyzer.calculate(str(traj_path))
    return result


@app.post("/analysis/energy")
def analyze_energy(request: AnalysisRequest):
    """Energy analysis — adapted from MD-Suite analysis/energy.py"""
    energy_path = request.energy_csv_path or (
        STORAGE_DIR / f"energies_{request.job_id}.csv"
    )
    if not os.path.exists(str(energy_path)):
        raise HTTPException(
            status_code=404, detail=f"Energy CSV not found: {energy_path}"
        )

    analyzer = EnergyAnalyzer(STORAGE_DIR)
    result = analyzer.parse_energies(str(energy_path))
    return result


@app.post("/analysis/gyration")
def analyze_gyration(request: AnalysisRequest):
    """Radius of gyration — adapted from MD-Suite analysis/gyration.py"""
    traj_path = request.trajectory_path or (
        STORAGE_DIR / f"trajectory_{request.job_id}.pdb"
    )
    if not os.path.exists(str(traj_path)):
        raise HTTPException(
            status_code=404, detail=f"Trajectory not found: {traj_path}"
        )

    analyzer = GyrationAnalyzer(STORAGE_DIR)
    result = analyzer.calculate(str(traj_path))
    return result


@app.post("/analysis/sasa")
def analyze_sasa(request: AnalysisRequest):
    """SASA analysis — adapted from MD-Suite analysis/sasa.py"""
    traj_path = request.trajectory_path or (
        STORAGE_DIR / f"trajectory_{request.job_id}.pdb"
    )
    if not os.path.exists(str(traj_path)):
        raise HTTPException(
            status_code=404, detail=f"Trajectory not found: {traj_path}"
        )

    analyzer = SASAAnalyzer(STORAGE_DIR)
    result = analyzer.calculate(str(traj_path))
    return result


@app.post("/analysis/hbonds")
def analyze_hbonds(request: AnalysisRequest):
    """H-bond analysis — adapted from MD-Suite analysis/"""
    traj_path = request.trajectory_path or (
        STORAGE_DIR / f"trajectory_{request.job_id}.pdb"
    )
    if not os.path.exists(str(traj_path)):
        raise HTTPException(
            status_code=404, detail=f"Trajectory not found: {traj_path}"
        )

    analyzer = HydrogenBondAnalyzer(STORAGE_DIR)
    result = analyzer.calculate(str(traj_path))
    return result


@app.post("/analysis/all")
def analyze_all(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """Run full MD-Suite analysis pipeline (RMSD, RMSF, Energy, Gyration, SASA, H-bonds)"""
    job_id = str(uuid.uuid4())[:8]
    _set_job_status(job_id, "pending", message="Running full analysis pipeline...")
    background_tasks.add_task(_run_analysis_pipeline, job_id, request.job_id)
    return {
        "job_id": job_id,
        "status": "pending",
        "message": "Full MD-Suite analysis pipeline queued",
    }


def _run_analysis_pipeline(pipeline_job_id: str, dynamics_job_id: str):
    """Run all analysis modules for a dynamics job"""
    try:
        traj_path = STORAGE_DIR / f"trajectory_{dynamics_job_id}.pdb"
        energy_path = STORAGE_DIR / f"energies_{dynamics_job_id}.csv"

        _set_job_status(pipeline_job_id, "running", progress=10)

        results = {}

        if traj_path.exists():
            _update_progress(pipeline_job_id, 20, "Computing RMSD...")
            results["rmsd"] = RMSDAnalyzer(STORAGE_DIR).calculate(str(traj_path))

            _update_progress(pipeline_job_id, 35, "Computing RMSF...")
            results["rmsf"] = RMSFAnalyzer(STORAGE_DIR).calculate(str(traj_path))

            _update_progress(pipeline_job_id, 50, "Computing Radius of Gyration...")
            results["gyration"] = GyrationAnalyzer(STORAGE_DIR).calculate(
                str(traj_path)
            )

            _update_progress(pipeline_job_id, 65, "Computing SASA...")
            results["sasa"] = SASAAnalyzer(STORAGE_DIR).calculate(str(traj_path))

            _update_progress(pipeline_job_id, 80, "Computing H-bonds...")
            results["hbonds"] = HydrogenBondAnalyzer(STORAGE_DIR).calculate(
                str(traj_path)
            )

        if energy_path.exists():
            _update_progress(pipeline_job_id, 90, "Analyzing energies...")
            results["energy"] = EnergyAnalyzer(STORAGE_DIR).parse_energies(
                str(energy_path)
            )

        _set_job_status(
            pipeline_job_id,
            "completed",
            result={"analyses": results, "dynamics_job_id": dynamics_job_id},
            progress=100,
        )

        logger.info(
            f"Analysis pipeline {pipeline_job_id} completed for job {dynamics_job_id}"
        )

    except Exception as e:
        logger.error(f"Analysis pipeline failed: {e}")
        _set_job_status(pipeline_job_id, "failed", error=str(e))


# ============================================================
# PUBLICATION PACKAGE ENDPOINT (MD-Suite integration)
# ============================================================


class PublicationRequest(BaseModel):
    job_id: str
    project_name: str = "md_project"
    analysis_job_id: Optional[str] = None
    compress: bool = True
    notify_on_complete: bool = False


@app.post("/publication/package")
def create_publication_package(request: PublicationRequest):
    """
    Create publication-ready package — adapted from MD-Suite core/publication_packager.py
    Generates ZIP with trajectory, structure, energy, analysis plots, and metadata.
    """
    try:
        packager = PublicationPackager(request.project_name, STORAGE_DIR)

        analysis_results = None
        if request.analysis_job_id:
            status = _get_job_status(request.analysis_job_id)
            if status and status.get("result"):
                analysis_results = status["result"].get("analyses")

        result = packager.create_package(
            job_id=request.job_id,
            analysis_results=analysis_results,
            compress=request.compress,
        )

        if request.notify_on_complete:
            notifications.notify_simulation_completed(
                f"pub-{request.job_id}", {"package": result.get("package_path")}
            )

        return result

    except Exception as e:
        logger.error(f"Publication package failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# NOTIFICATION MANAGEMENT (MD-Suite integration)
# ============================================================


class NotifyRequest(BaseModel):
    event: str
    title: str
    message: str
    details: Optional[Dict] = None


@app.post("/notify")
def send_notification(request: NotifyRequest):
    """Send notification to all configured channels"""
    result = notifications.send(
        request.event, request.title, request.message, request.details
    )
    return result


@app.get("/notify/status")
def notification_status():
    """Check which notification channels are configured"""
    return {
        "telegram": bool(notifications.telegram_token),
        "discord": bool(notifications.discord_webhook),
        "slack": bool(notifications.slack_webhook),
        "email": bool(notifications.email_from and notifications.email_to),
    }


@app.post("/notify/test")
def test_notification(channel: str = "discord"):
    """Test a notification channel"""
    result = notifications.send(
        "started",
        "Test Notification",
        "Docking Studio MD-Suite notification test successful!",
    )
    return result


# ============================================================
# JOB STATUS (shared utility)
# ============================================================


@app.get("/job/{job_id}")
def get_job_status(job_id: str):
    """Get MD job status from Redis"""
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis not available")
    data = redis_client.get(f"md_job:{job_id}")
    if data is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return json.loads(data)


@app.get("/job/{job_id}/trajectory")
def download_trajectory(job_id: str):
    from fastapi.responses import FileResponse

    path = STORAGE_DIR / f"trajectory_{job_id}.pdb"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Trajectory not found")
    return FileResponse(
        path, media_type="chemical/x-pdb", filename=f"trajectory_{job_id}.pdb"
    )


@app.get("/job/{job_id}/frame")
def download_last_frame(job_id: str):
    from fastapi.responses import FileResponse

    path = STORAGE_DIR / f"frame_last_{job_id}.pdb"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Frame not found")
    return FileResponse(
        path, media_type="chemical/x-pdb", filename=f"frame_{job_id}.pdb"
    )


@app.get("/job/{job_id}/energies")
def download_energies(job_id: str):
    from fastapi.responses import FileResponse

    path = STORAGE_DIR / f"energies_{job_id}.csv"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Energy data not found")
    return FileResponse(path, media_type="text/csv", filename=f"energies_{job_id}.csv")


# ============================================================
# MINIMIZE (already exists)
# ============================================================


@app.post("/minimize")
def minimize(pdb_content: str, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())[:8]
    _set_job_status(job_id, "pending")
    background_tasks.add_task(_run_minimize, job_id, pdb_content)
    return {"job_id": job_id, "status": "pending"}


def _run_minimize(job_id: str, pdb_content: str):
    try:
        import openmm as mm
        import openmm.app as app
        from openmm import unit
        from io import StringIO

        _set_job_status(job_id, "running", progress=50)
        pdb = app.PDBFile(StringIO(pdb_content))
        forcefield = app.ForceField("amber14/protein.ff14SB.xml", "amber14/tip3p.xml")
        modeller = app.Modeller(pdb.topology, pdb.positions)
        modeller.addHydrogens(forcefield)

        platform, platform_props, _ = _get_best_platform()

        system = forcefield.createSystem(
            modeller.topology,
            nonbondedMethod=app.PME,
            nonbondedCutoff=1.0 * unit.nanometer,
        )
        integrator = mm.LangevinIntegrator(
            300 * unit.kelvin, 1 / unit.picosecond, 0.002 * unit.picosecond
        )
        context = mm.Context(system, integrator, platform, platform_props)
        context.setPositions(modeller.positions)
        mm.LocalEnergyMinimizer.minimize(context, maxIterations=1000)
        state = context.getState(getPositions=True)
        out_path = STORAGE_DIR / f"minimized_{job_id}.pdb"
        with open(out_path, "w") as f:
            app.PDBFile.writeFile(
                pdb.topology,
                state.getPositions(asNumpy=True).value_in_unit(unit.nanometer),
                f,
            )
        _set_job_status(
            job_id,
            "completed",
            result={
                "output_path": str(out_path),
                "energy_kj_mol": round(
                    state.getPotentialEnergy().value_in_unit(unit.kilojoule_per_mole), 4
                ),
                "platform": platform.getName(),
            },
            progress=100,
        )
    except Exception as e:
        _set_job_status(job_id, "failed", error=str(e))


def _update_progress(job_id: str, progress: int, message: str):
    if redis_client:
        data = redis_client.get(f"md_job:{job_id}")
        if data:
            d = json.loads(data)
            d.update(
                {
                    "progress": progress,
                    "message": message,
                    "updated_at": datetime.now().isoformat(),
                }
            )
            redis_client.setex(f"md_job:{job_id}", 7200, json.dumps(d))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8006)
