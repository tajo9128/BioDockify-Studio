"""
BioDockify Drug Discovery Flow - Master orchestration pipeline
Routes user requests to the appropriate crew and synthesizes results.
"""

from crewai import Flow, listen, start, router
from crew.crews import (
    create_virtual_screening_crew,
    create_lead_optimization_crew,
    create_admet_prediction_crew,
    create_docking_analysis_crew,
    create_drug_discovery_crew,
)
from typing import Dict, Any, Optional


class DrugDiscoveryFlow(Flow):
    """
    Master Drug Discovery Flow - Routes requests to appropriate crews.
    
    Supports:
    - Virtual screening (screen compounds against a target)
    - Lead optimization (improve a lead compound)
    - ADMET prediction (profile compounds)
    - Docking analysis (dock and analyze)
    - Full pipeline (end-to-end drug discovery)
    """

    @start()
    def receive_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Receive and parse user request."""
        return {
            "query": request.get("query", ""),
            "smiles": request.get("smiles"),
            "receptor_pdb": request.get("receptor_pdb"),
            "target": request.get("target"),
            "compounds": request.get("compounds", []),
            "crew_name": request.get("crew"),
            "llm": request.get("llm"),
        }

    @router(receive_request)
    def route_to_crew(self, data: Dict[str, Any]) -> str:
        """Route to appropriate crew based on request."""
        crew_name = data.get("crew_name", "").lower()
        query = data.get("query", "").lower()

        if crew_name:
            return crew_name
        if "screen" in query or "library" in query:
            return "virtual_screening"
        if "optim" in query or "improve" in query or "mutate" in query:
            return "lead_optimization"
        if "admet" in query or "toxicity" in query or "absorption" in query:
            return "admet_prediction"
        if "dock" in query or "binding" in query:
            return "docking_analysis"
        return "drug_discovery"

    @listen("virtual_screening")
    def run_virtual_screening(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Run virtual screening pipeline."""
        llm = data.get("llm")
        crew = create_virtual_screening_crew(llm)
        inputs = {
            "receptor_pdb": data.get("receptor_pdb", ""),
            "compounds": data.get("compounds", []),
        }
        result = crew.kickoff(inputs=inputs)
        return {"crew": "virtual_screening", "result": result.raw, "status": "completed"}

    @listen("lead_optimization")
    def run_lead_optimization(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Run lead optimization pipeline."""
        llm = data.get("llm")
        crew = create_lead_optimization_crew(llm)
        inputs = {
            "smiles": data.get("smiles", ""),
            "receptor_pdb": data.get("receptor_pdb", ""),
        }
        result = crew.kickoff(inputs=inputs)
        return {"crew": "lead_optimization", "result": result.raw, "status": "completed"}

    @listen("admet_prediction")
    def run_admet_prediction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Run ADMET prediction pipeline."""
        llm = data.get("llm")
        crew = create_admet_prediction_crew(llm)
        inputs = {
            "compounds": data.get("compounds", []),
        }
        result = crew.kickoff(inputs=inputs)
        return {"crew": "admet_prediction", "result": result.raw, "status": "completed"}

    @listen("docking_analysis")
    def run_docking_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Run docking analysis pipeline."""
        llm = data.get("llm")
        crew = create_docking_analysis_crew(llm)
        inputs = {
            "smiles": data.get("smiles", ""),
            "receptor_pdb": data.get("receptor_pdb", ""),
        }
        result = crew.kickoff(inputs=inputs)
        return {"crew": "docking_analysis", "result": result.raw, "status": "completed"}

    @listen("drug_discovery")
    def run_full_pipeline(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Run full drug discovery pipeline."""
        llm = data.get("llm")
        crew = create_drug_discovery_crew(llm)
        inputs = {
            "smiles": data.get("smiles", ""),
            "receptor_pdb": data.get("receptor_pdb", ""),
            "target": data.get("target", ""),
            "compounds": data.get("compounds", []),
        }
        result = crew.kickoff(inputs=inputs)
        return {"crew": "drug_discovery", "result": result.raw, "status": "completed"}
