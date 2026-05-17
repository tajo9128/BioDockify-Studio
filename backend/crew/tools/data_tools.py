"""
Data fetching tools for CrewAI - Wraps PubChem and PDB endpoints
"""
import httpx
from typing import Optional, List
from pydantic import BaseModel, Field

BACKEND_URL = "http://localhost:8000"


class FetchCompoundInput(BaseModel):
    """Input for fetching compounds"""
    cid: str = Field(description="PubChem Compound ID")


class SearchCompoundsInput(BaseModel):
    """Input for searching compounds"""
    query: str = Field(description="Search query (name, formula, SMILES)")
    limit: int = Field(default=10, description="Maximum results")


class FetchProteinInput(BaseModel):
    """Input for fetching protein"""
    pdb_id: str = Field(description="RCSB PDB ID (e.g., 1HIA)")


def fetch_compound(input: FetchCompoundInput) -> str:
    """
    Fetch compound information from PubChem by CID.
    
    Use this tool to get structure, properties, and bioactivity data.
    
    Args:
        cid: PubChem Compound ID (e.g., "2244" for Aspirin)
    
    Returns:
        JSON with compound structure and properties
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(
                f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{input.cid}/JSON"
            )
            if response.status_code == 200:
                return response.text
            return f"Error: Compound CID {input.cid} not found"
    except Exception as e:
        return f"Error fetching compound: {str(e)}"


def search_compounds(input: SearchCompoundsInput) -> str:
    """
    Search PubChem compounds by name, formula, or SMILES.
    
    Use this tool to find compounds by various identifiers.
    
    Args:
        query: Search term (compound name, molecular formula, SMILES)
        limit: Maximum number of results to return
    
    Returns:
        JSON with matching compounds
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            import urllib.parse
            encoded_query = urllib.parse.quote(input.query)
            response = client.get(
                f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded_query}/JSON?MaxRecords={input.limit}"
            )
            if response.status_code == 200:
                return response.text
            return f"No compounds found for: {input.query}"
    except Exception as e:
        return f"Error searching compounds: {str(e)}"


def fetch_protein(input: FetchProteinInput) -> str:
    """
    Fetch protein structure from RCSB PDB.
    
    Use this tool to download protein structures for docking.
    
    Args:
        pdb_id: RCSB PDB ID (e.g., "1HIA", "4ERD", "6LU7")
    
    Returns:
        PDB content as text
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(
                f"https://files.rcsb.org/download/{input.pdb_id.upper()}.pdb"
            )
            if response.status_code == 200:
                return response.text[:50000]  # Limit size
            return f"Error: PDB ID {input.pdb_id} not found"
    except Exception as e:
        return f"Error fetching protein: {str(e)}"
