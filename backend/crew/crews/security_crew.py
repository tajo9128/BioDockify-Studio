"""
BioDockify Security Crew - Security scanning worker.
"""

import logging
from typing import Dict, Any
from crew.types import TaskOutput

logger = logging.getLogger(__name__)


def execute_security_crew(parameters: Dict[str, Any]) -> TaskOutput:
    """Execute security scan: vulnerabilities → secrets → policy."""
    try:
        from security.monitor import SecurityMonitor
        monitor = SecurityMonitor()
        summary = monitor.run_full_scan()
        return TaskOutput(
            module="security",
            status="completed",
            data=summary,
            recommendations="Security scan passed." if summary.get("is_secure") else f"Security issues found: {summary.get('total_issues', 0)} issues (worst: {summary.get('worst_severity', 'unknown')})"
        )
    except Exception as e:
        return TaskOutput(module="security", status="failed", error=str(e))
