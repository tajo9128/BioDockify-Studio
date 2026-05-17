"""
Pharmacophore tools for CrewAI - Wraps backend pharmacophore endpoints
"""
import httpx
from typing import Optional, List
from pydantic import BaseModel, Field

BACKEND_URL = "http://localhost:8000"


class PharmacophoreInput(BaseModel):
    """Input for pharmacophore generation"""
    receptor_pdb: Optional[str] = Field(default=None, description="Receptor PDB content")
    ligand_smiles: Optional[str] = Field(default=None, description="Ligand SMILES")
    n_features: int = Field(default=5, description="Number of pharmacophore features")
    feature_types: List[str] = Field(
        default=["hb_donor", "hb_acceptor", "hydrophobic", "aromatic", "positive_ionizable", "negative_ionizable"],
        description="Types of features to detect"
    )


class ScreenInput(BaseModel):
    """Input for library screening"""
    pharmacophore_json: str = Field(description="Pharmacophore definition as JSON")
    library_smiles: List[str] = Field(description="List of SMILES to screen")
    max_results: int = Field(default=50, description="Maximum hits to return")


def generate_pharmacophore(input: PharmacophoreInput) -> str:
    """
    Generate a pharmacophore model from a protein-ligand complex or ligand alone.
    
    Use this tool to identify key interaction features (H-bond donors/acceptors,
    hydrophobic regions, aromatic rings, charged groups).
    
    Args:
        receptor_pdb: PDB content of the receptor (optional)
        ligand_smiles: SMILES of the ligand (optional)
        n_features: Number of features to generate (1-10, default 5)
        feature_types: Types of features to include
    
    Returns:
        JSON with pharmacophore definition and features
    """
    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{BACKEND_URL}/pharmacophore/generate",
                json={
                    "receptor_pdb": input.receptor_pdb,
                    "ligand_smiles": input.ligand_smiles,
                    "n_features": input.n_features,
                    "feature_types": input.feature_types,
                }
            )
            return response.text
    except Exception as e:
        return f"Error generating pharmacophore: {str(e)}"


def screen_library(input: ScreenInput) -> str:
    """
    Screen a compound library against a pharmacophore model.
    
    Use this tool to find molecules that match the pharmacophore pattern.
    
    Args:
        pharmacophore_json: Pharmacophore definition from generate_pharmacophore
        library_smiles: List of SMILES strings to screen
        max_results: Maximum number of hits to return
    
    Returns:
        JSON with ranked hits and match scores
    """
    try:
        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{BACKEND_URL}/pharmacophore/screen",
                json={
                    "pharmacophore_json": input.pharmacophore_json,
                    "library_smiles": input.library_smiles,
                    "max_results": input.max_results,
                }
            )
            return response.text
    except Exception as e:
        return f"Error screening library: {str(e)}"
