"""
BioDockify Worker Crews - Specialized agent teams per module.
"""

from crew.crews.docking_crew import execute_docking_crew
from crew.crews.qsar_crew import execute_qsar_crew
from crew.crews.md_crew import execute_md_crew
from crew.crews.admet_crew import execute_admet_crew
from crew.crews.pharmacophore_crew import execute_pharmacophore_crew
from crew.crews.syshealth_crew import execute_syshealth_crew
from crew.crews.security_crew import execute_security_crew
from crew.types import WorkerType, TaskOutput

CREW_EXECUTORS = {
    WorkerType.DOCKING: execute_docking_crew,
    WorkerType.QSAR: execute_qsar_crew,
    WorkerType.MD: execute_md_crew,
    WorkerType.ADMET: execute_admet_crew,
    WorkerType.PHARMACOPHORE: execute_pharmacophore_crew,
    WorkerType.SYSHEALTH: execute_syshealth_crew,
    WorkerType.SECURITY: execute_security_crew,
}


def execute_worker_crew(worker_type: WorkerType, parameters: dict) -> TaskOutput:
    """Execute a worker crew and return structured output."""
    executor = CREW_EXECUTORS.get(worker_type)
    if executor is None:
        return TaskOutput(
            module=worker_type.value,
            status="failed",
            error=f"No executor for worker type: {worker_type.value}"
        )
    try:
        return executor(parameters)
    except Exception as e:
        return TaskOutput(
            module=worker_type.value,
            status="failed",
            error=str(e)
        )
