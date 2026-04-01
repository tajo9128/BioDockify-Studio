"""
Analysis tools for CrewAI - Wraps backend analysis endpoints
"""
import httpx
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

BACKEND_URL = "http://localhost:8000"


class InteractionInput(BaseModel):
    """Input for interaction analysis"""
    receptor_pdb: str = Field(description="Receptor PDB content")
    ligand_pdb: str = Field(description="Ligand PDB content")


class LigandRecord(BaseModel):
    """Ligand record for ranking"""
    ligand_id: str
    smiles: Optional[str] = None
    vina_score: Optional[float] = None
    gnina_score: Optional[float] = None
    rf_score: Optional[float] = None
    md_stability: Optional[float] = None
    mw: Optional[float] = None
    logp: Optional[float] = None
    tpsa: Optional[float] = None
    h_bond_count: Optional[int] = None
    hydrophobic_count: Optional[int] = None
    num_rotatable_bonds: Optional[int] = None


class RankInput(BaseModel):
    """Input for ranking"""
    ligands: List[LigandRecord]
    weights: Optional[Dict[str, float]] = None


class ConsensusInput(BaseModel):
    """Input for consensus scoring"""
    ligands: List[LigandRecord]


class ExportInput(BaseModel):
    """Input for export"""
    docking_results: List[Dict[str, Any]]
    top_n: int = 10
    sort_by: str = "vina_score"
    format: str = "csv"


def analyze_interactions(input: InteractionInput) -> str:
    """
    Analyze protein-ligand interactions (H-bonds, hydrophobic, pi-stacking, salt bridges).
    
    Use this tool to understand the binding mode and key interactions.
    
    Args:
        receptor_pdb: PDB content of the receptor
        ligand_pdb: PDB content of the ligand
    
    Returns:
        JSON with interaction analysis results
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{BACKEND_URL}/analyze",
                json={"receptor": input.receptor_pdb, "ligand": input.ligand_pdb}
            )
            return response.text
    except Exception as e:
        return f"Error analyzing interactions: {str(e)}"


def rank_ligands(input: RankInput) -> str:
    """
    Rank a list of ligands using weighted consensus scoring.
    
    Weights default: vina_score=0.4, md_stability=0.3, admet=0.3
    
    Args:
        ligands: List of ligand records with scores
        weights: Custom weights for scoring (optional)
    
    Returns:
        JSON with ranked ligands and consensus scores
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            ligands_data = [l.model_dump() for l in input.ligands]
            response = client.post(
                f"{BACKEND_URL}/analysis/rank",
                json={"ligands": ligands_data, "weights": input.weights}
            )
            return response.text
    except Exception as e:
        return f"Error ranking ligands: {str(e)}"


def consensus_score(input: ConsensusInput) -> str:
    """
    Compute consensus score across multiple scoring methods.
    
    Methods: Vina, GNINA, RF-score, MD stability (equal weights).
    
    Args:
        ligands: List of ligand records with various scores
    
    Returns:
        JSON with consensus scores for each ligand
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            ligands_data = [l.model_dump() for l in input.ligands]
            response = client.post(
                f"{BACKEND_URL}/analysis/consensus",
                json=ligands_data
            )
            return response.text
    except Exception as e:
        return f"Error computing consensus: {str(e)}"


def export_top_hits(input: ExportInput) -> str:
    """
    Export top N docking hits as CSV or JSON.
    
    Args:
        docking_results: List of docking result dictionaries
        top_n: Number of top hits to export (default 10)
        sort_by: Sort key (vina_score, gnina_score, rf_score)
        format: Export format (csv or json)
    
    Returns:
        JSON with export content and filename
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{BACKEND_URL}/analysis/export/top-hits",
                json={
                    "docking_results": input.docking_results,
                    "top_n": input.top_n,
                    "sort_by": input.sort_by,
                    "format": input.format,
                }
            )
            return response.text
    except Exception as e:
        return f"Error exporting hits: {str(e)}"
