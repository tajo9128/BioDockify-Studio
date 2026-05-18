"""
BioDockify System Health Crew - System monitoring worker.
"""

import logging
from typing import Dict, Any
from crew.types import TaskOutput

logger = logging.getLogger(__name__)


def execute_syshealth_crew(parameters: Dict[str, Any]) -> TaskOutput:
    """Execute system health check: resources → services → performance."""
    try:
        from crew.resource_manager import ResourceManager
        rm = ResourceManager()
        status = rm.get_status()
        return TaskOutput(
            module="syshealth",
            status="completed",
            data=status,
            recommendations="All systems operational." if status.get("cpu_ok") and status.get("memory_ok") else "Resource limits approaching thresholds. Consider scaling."
        )
    except Exception as e:
        return TaskOutput(module="syshealth", status="failed", error=str(e))
