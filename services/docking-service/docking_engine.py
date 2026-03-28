"""
Docking Engine - AutoDock Vina execution
"""
import os
import logging
import subprocess
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def check_vina() -> bool:
    try:
        from vina import Vina
        return True
    except ImportError:
        return False


def convert_pdb_to_pdbqt(input_path: str, output_path: str, is_ligand: bool = False) -> bool:
    try:
        from rdkit import Chem
        from meeko import PDBQTMoleculeWriter, MoleculePreparation

        mol = Chem.MolFromPDBFile(input_path, removeHs=False)
        if mol is None:
            logger.error(f"Failed to read PDB file: {input_path}")
            return False

        if is_ligand:
            preparator = MoleculePreparation()
            mol_setups = preparator.prepare(mol)
            if mol_setups is None or len(mol_setups) == 0:
                logger.error("MeeKo preparation failed for ligand")
                return False
            setup = mol_setups[0]

            with open(output_path, 'w') as f:
                writer = PDBQTMoleculeWriter(f)
                writer.write([setup])
                writer.close()
        else:
            with open(input_path, 'r') as inf, open(output_path, 'w') as outf:
                for line in inf:
                    if line.startswith(('ATOM', 'HETATM')):
                        if len(line) < 66:
                            line = line.rstrip() + ' ' * (66 - len(line))
                        outf.write(line)

        logger.info(f"Converted {input_path} to {output_path}")
        return True

    except ImportError as e:
        logger.warning(f"Conversion libraries not available: {e}")
        return False
    except Exception as e:
        logger.error(f"Conversion error: {e}")
        return False


def prepare_receptor_file(receptor_path: str, output_dir: str = "/tmp") -> Optional[str]:
    _, ext = os.path.splitext(receptor_path)
    ext = ext.lower()

    if ext == '.pdbqt':
        return receptor_path

    if ext == '.pdb':
        output_path = os.path.join(output_dir, f"prepared_receptor_{os.path.basename(receptor_path)}.pdbqt")
        if convert_pdb_to_pdbqt(receptor_path, output_path, is_ligand=False):
            return output_path
        return receptor_path

    logger.error(f"Unsupported receptor format: {ext}")
    return None


def prepare_ligand_file(ligand_path: str, output_dir: str = "/tmp") -> Optional[str]:
    _, ext = os.path.splitext(ligand_path)
    ext = ext.lower()

    if ext == '.pdbqt':
        return ligand_path

    if ext in ['.pdb', '.sdf', '.mol2']:
        output_path = os.path.join(output_dir, f"prepared_ligand_{os.path.basename(ligand_path)}.pdbqt")
        if convert_pdb_to_pdbqt(ligand_path, output_path, is_ligand=True):
            return output_path
        return None

    logger.error(f"Unsupported ligand format: {ext}")
    return None


def run_vina_docking(
    receptor_path: str,
    ligand_path: str,
    center_x: float = 0.0,
    center_y: float = 0.0,
    center_z: float = 0.0,
    size_x: float = 20.0,
    size_y: float = 20.0,
    size_z: float = 20.0,
    exhaustiveness: int = 8,
    num_modes: int = 9,
    output_dir: str = "/tmp"
) -> Dict[str, Any]:
    try:
        from vina import Vina
    except ImportError:
        return {
            "success": False,
            "error": "Vina Python package not installed",
            "results": []
        }

    os.makedirs(output_dir, exist_ok=True)

    receptor_file = prepare_receptor_file(receptor_path, output_dir)
    if receptor_file is None:
        return {"success": False, "error": "Failed to prepare receptor", "results": []}

    ligand_file = prepare_ligand_file(ligand_path, output_dir)
    if ligand_file is None:
        return {"success": False, "error": "Failed to prepare ligand", "results": []}

    try:
        logger.info("Initializing Vina...")
        v = Vina(sf_name='vina')

        v.set_receptor(rigid_pdbqt_filename=receptor_file)
        v.set_ligand_from_file(ligand_file)
        v.compute_vina_maps(center=[center_x, center_y, center_z], box_size=[size_x, size_y, size_z])
        v.dock(exhaustiveness=exhaustiveness, n_poses=num_modes)

        energies = v.energies
        poses = v.poses(n_poses=num_modes, coordinates_only=False)

        results = []
        for i, pose in enumerate(poses):
            energy = float(energies[i][0]) if i < len(energies) else 0.0
            results.append({
                "pose_id": i + 1,
                "vina_score": energy,
                "gnina_score": None,
                "rf_score": None
            })

        output_file = os.path.join(output_dir, "vina_results.pdbqt")
        try:
            v.write_pose(output_file, overwrite=True)
        except:
            pass

        return {
            "success": True,
            "engine": "vina",
            "results": results,
            "output_file": output_file if os.path.exists(output_file) else None
        }

    except Exception as e:
        logger.error(f"Vina docking error: {e}")
        return {"success": False, "error": str(e), "results": []}


def run_docking(
    receptor_path: str,
    ligand_path: str,
    engine: str = "vina",
    center_x: float = 0.0,
    center_y: float = 0.0,
    center_z: float = 0.0,
    size_x: float = 20.0,
    size_y: float = 20.0,
    size_z: float = 20.0,
    exhaustiveness: int = 8,
    num_modes: int = 9,
    output_dir: str = "/tmp"
) -> Dict[str, Any]:
    engine = engine.lower()

    if engine == "vina":
        return run_vina_docking(
            receptor_path, ligand_path,
            center_x, center_y, center_z,
            size_x, size_y, size_z,
            exhaustiveness, num_modes, output_dir
        )

    return {
        "success": False,
        "error": f"Unknown engine: {engine}. Use: vina",
        "results": []
    }


if __name__ == "__main__":
    print(f"Vina available: {check_vina()}")
