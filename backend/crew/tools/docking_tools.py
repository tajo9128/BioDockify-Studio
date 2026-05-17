"""
Docking tools for CrewAI - Wraps backend docking endpoints
"""
import httpx
from typing import Optional
from pydantic import BaseModel, Field

BACKEND_URL = "http://localhost:8000"


class DockingInput(BaseModel):
    """Input for molecular docking"""
    smiles: Optional[str] = Field(default=None, description="SMILES string of ligand")
    receptor_content: Optional[str] = Field(default=None, description="PDB content of receptor")
    ligand_content: Optional[str] = Field(default=None, description="Ligand file content")
    center_x: float = Field(default=0.0, description="Grid center X coordinate")
    center_y: float = Field(default=0.0, description="Grid center Y coordinate")
    center_z: float = Field(default=0.0, description="Grid center Z coordinate")
    size_x: float = Field(default=20.0, description="Grid size X (Angstroms)")
    size_y: float = Field(default=20.0, description="Grid size Y (Angstroms)")
    size_z: float = Field(default=20.0, description="Grid size Z (Angstroms)")
    exhaustiveness: int = Field(default=32, description="Vina exhaustiveness level")
    num_modes: int = Field(default=10, description="Number of binding modes to generate")
    scoring: str = Field(default="vina", description="Scoring function: vina, gnina, or rf")


class BatchDockingInput(BaseModel):
    """Input for batch docking"""
    receptor_content: str = Field(description="PDB content of receptor")
    smiles_list: list[str] = Field(description="List of SMILES strings to dock")
    center_x: float = Field(default=0.0)
    center_y: float = Field(default=0.0)
    center_z: float = Field(default=0.0)
    size_x: float = Field(default=20.0)
    size_y: float = Field(default=20.0)
    size_z: float = Field(default=20.0)
    exhaustiveness: int = Field(default=32)


def run_docking(input: DockingInput) -> str:
    """
    Run molecular docking simulation using AutoDock Vina, GNINA, or RF-Score.
    
    Use this tool to dock a ligand molecule against a protein receptor.
    Returns binding energy scores and docking poses.
    
    Args:
        smiles: SMILES string of the ligand
        receptor_content: PDB content of the receptor protein
        center_x/y/z: Grid box center coordinates
        size_x/y/z: Grid box dimensions in Angstroms
        exhaustiveness: Search thoroughness (8-128, default 32)
        num_modes: Number of binding modes (1-20, default 10)
        scoring: Scoring function - vina, gnina, or rf
    
    Returns:
        JSON string with docking results including binding energy and poses
    """
    try:
        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{BACKEND_URL}/api/docking/run",
                json={
                    "smiles": input.smiles,
                    "receptor_content": input.receptor_content,
                    "ligand_content": input.ligand_content,
                    "center_x": input.center_x,
                    "center_y": input.center_y,
                    "center_z": input.center_z,
                    "size_x": input.size_x,
                    "size_y": input.size_y,
                    "size_z": input.size_z,
                    "exhaustiveness": input.exhaustiveness,
                    "num_modes": input.num_modes,
                    "scoring": input.scoring,
                }
            )
            return response.text
    except Exception as e:
        return f"Error running docking: {str(e)}"


def batch_docking(input: BatchDockingInput) -> str:
    """
    Run batch docking for a library of compounds against a protein receptor.
    
    Use this tool to screen multiple ligands efficiently.
    
    Args:
        receptor_content: PDB content of the receptor protein
        smiles_list: List of SMILES strings to dock
        center_x/y/z: Grid box center coordinates
        size_x/y/z: Grid box dimensions in Angstroms
        exhaustiveness: Search thoroughness (default 32)
    
    Returns:
        JSON string with batch docking job ID and progress info
    """
    try:
        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{BACKEND_URL}/batch/docking",
                json={
                    "receptor_content": input.receptor_content,
                    "smiles_list": input.smiles_list,
                    "center_x": input.center_x,
                    "center_y": input.center_y,
                    "center_z": input.center_z,
                    "size_x": input.size_x,
                    "size_y": input.size_y,
                    "size_z": input.size_z,
                    "exhaustiveness": input.exhaustiveness,
                }
            )
            return response.text
    except Exception as e:
        return f"Error running batch docking: {str(e)}"
