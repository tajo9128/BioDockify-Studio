"""
RDKit Service - Molecule processing API
"""
import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("rdkit-service")


class MolInput(BaseModel):
    smiles: Optional[str] = None
    pdb: Optional[str] = None


class ConvertRequest(BaseModel):
    input_format: str
    output_format: str
    content: str


class PropertiesRequest(BaseModel):
    smiles: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("RDKit Service starting up...")
    yield
    logger.info("RDKit Service shutting down...")


app = FastAPI(
    title="RDKit Service API",
    description="RDKit molecule processing",
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
        "service": "rdkit-service",
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/")
def root():
    return {"service": "rdkit-service", "version": "2.0.0"}


@app.post("/from_smiles")
def from_smiles(request: MolInput):
    """Convert SMILES to molecule"""
    try:
        from rdkit import Chem

        if not request.smiles:
            return {"success": False, "error": "No SMILES provided"}

        mol = Chem.MolFromSmiles(request.smiles)
        if mol is None:
            return {"success": False, "error": "Invalid SMILES"}

        return {
            "success": True,
            "smiles": request.smiles,
            "num_atoms": mol.GetNumAtoms(),
            "num_bonds": mol.GetNumBonds(),
        }

    except Exception as e:
        logger.error(f"SMILES conversion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/from_pdb")
def from_pdb(request: MolInput):
    """Convert PDB to molecule"""
    try:
        from rdkit import Chem

        if not request.pdb:
            return {"success": False, "error": "No PDB provided"}

        mol = Chem.MolFromPDBBlock(request.pdb)
        if mol is None:
            return {"success": False, "error": "Invalid PDB"}

        return {
            "success": True,
            "num_atoms": mol.GetNumAtoms(),
            "num_bonds": mol.GetNumBonds(),
        }

    except Exception as e:
        logger.error(f"PDB conversion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/properties")
def molecular_properties(request: PropertiesRequest):
    """Calculate molecular properties"""
    try:
        from rdkit import Chem
        from rdkit.Chem import Descriptors, Lipinski

        mol = Chem.MolFromSmiles(request.smiles)
        if mol is None:
            return {"success": False, "error": "Invalid SMILES"}

        return {
            "success": True,
            "smiles": request.smiles,
            "mw": Descriptors.MolWt(mol),
            "logp": Descriptors.MolLogP(mol),
            "num_h_donors": Lipinski.NumHDonors(mol),
            "num_h_acceptors": Lipinski.NumHAcceptors(mol),
            "num_rotatable_bonds": Lipinski.NumRotatableBonds(mol),
            "tpsa": Descriptors.TPSA(mol),
        }

    except Exception as e:
        logger.error(f"Property calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/similarity")
def similarity(smiles1: str, smiles2: str):
    """Calculate Tanimoto similarity between two molecules"""
    try:
        from rdkit import Chem
        from rdkit.Chem import AllChem

        mol1 = Chem.MolFromSmiles(smiles1)
        mol2 = Chem.MolFromSmiles(smiles2)

        if mol1 is None or mol2 is None:
            return {"success": False, "error": "Invalid SMILES"}

        fp1 = AllChem.GetMorganFingerprintAsBitVect(mol1, 2, nBits=2048)
        fp2 = AllChem.GetMorganFingerprintAsBitVect(mol2, 2, nBits=2048)

        from rdkit import DataStructs
        similarity = DataStructs.TanimotoSimilarity(fp1, fp2)

        return {
            "success": True,
            "smiles1": smiles1,
            "smiles2": smiles2,
            "tanimoto_similarity": similarity,
        }

    except Exception as e:
        logger.error(f"Similarity calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
