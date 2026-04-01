"""
ADMET prediction tools for CrewAI - Wraps backend ADMET endpoints
"""
import httpx
from typing import List, Optional
from pydantic import BaseModel, Field

BACKEND_URL = "http://localhost:8000"


class ADMETInput(BaseModel):
    """Input for ADMET prediction"""
    smiles: str = Field(description="SMILES string of the molecule")
    predict_absorption: bool = Field(default=True, description="Predict absorption properties")
    predict_distribution: bool = Field(default=True, description="Predict distribution properties")
    predict_metabolism: bool = Field(default=True, description="Predict metabolism properties")
    predict_excretion: bool = Field(default=True, description="Predict excretion properties")
    predict_toxicity: bool = Field(default=True, description="Predict toxicity properties")


class ADMETFilterInput(BaseModel):
    """Input for ADMET filtering"""
    smiles_list: List[str] = Field(description="List of SMILES to filter")


def predict_admet(input: ADMETInput) -> str:
    """
    Predict ADMET properties for a molecule (Absorption, Distribution, Metabolism, Excretion, Toxicity).
    
    Use this tool to assess drug-likeness and safety profile.
    
    Properties predicted:
    - Absorption: Intestinal absorption, Caco-2 permeability, BBB permeability
    - Distribution: Plasma protein binding, volume of distribution
    - Metabolism: CYP inhibition (1A2, 2C9, 2D6, 3A4), metabolic stability
    - Excretion: Clearance, half-life, renal excretion
    - Toxicity: AMES mutagenicity, hERG inhibition, hepatotoxicity
    
    Args:
        smiles: SMILES string of the molecule
        predict_absorption/distribution/metabolism/excretion/toxicity: Which to predict
    
    Returns:
        JSON with ADMET predictions and drug-likeness assessment
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{BACKEND_URL}/admet/predict",
                json={
                    "smiles": input.smiles,
                    "predict_absorption": input.predict_absorption,
                    "predict_distribution": input.predict_distribution,
                    "predict_metabolism": input.predict_metabolism,
                    "predict_excretion": input.predict_excretion,
                    "predict_toxicity": input.predict_toxicity,
                }
            )
            return response.text
    except Exception as e:
        return f"Error predicting ADMET: {str(e)}"


def filter_admet(input: ADMETFilterInput) -> str:
    """
    Filter a list of molecules by ADMET rules (drug-likeness).
    
    Use this tool to identify molecules that pass Lipinski and ADMET filters.
    
    Filters applied:
    - MW < 500 Da
    - LogP < 5
    - TPSA 40-140
    - Rotatable bonds < 10
    
    Args:
        smiles_list: List of SMILES strings to filter
    
    Returns:
        JSON with passed/failed molecules and reasons
    """
    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{BACKEND_URL}/admet/filter",
                json=input.smiles_list
            )
            return response.text
    except Exception as e:
        return f"Error filtering ADMET: {str(e)}"
