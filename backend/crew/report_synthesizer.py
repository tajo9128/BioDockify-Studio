"""
BioDockify Report Synthesizer - Combines multi-worker outputs into coherent reports.
"""

import logging
from typing import Dict, List, Any
from crew.types import WorkerReport, IntentCategory

logger = logging.getLogger(__name__)


class ReportSynthesizer:
    """Combines worker reports into unified response."""

    def synthesize(self, reports: List[WorkerReport], intent: IntentCategory) -> Dict[str, Any]:
        if not reports:
            return {"response": "No results generated.", "status": "empty"}

        sections = []
        all_recommendations = []
        errors = []

        for r in reports:
            section = self._format_worker_report(r)
            sections.append(section)
            if r.output.recommendations:
                all_recommendations.append(r.output.recommendations)
            if r.output.error:
                errors.append({"worker": r.worker.value, "error": r.output.error})

        summary = self._generate_summary(reports, intent)

        return {
            "summary": summary,
            "sections": sections,
            "recommendations": all_recommendations,
            "errors": errors,
            "status": "completed" if not errors else "partial",
        }

    def _format_worker_report(self, report: WorkerReport) -> Dict[str, Any]:
        return {
            "worker": report.worker.value,
            "status": report.status,
            "execution_time": report.execution_time_seconds,
            "data": report.output.data,
            "recommendations": report.output.recommendations,
            "error": report.output.error,
        }

    def _generate_summary(self, reports: List[WorkerReport], intent: IntentCategory) -> str:
        completed = sum(1 for r in reports if r.status == "completed")
        total = len(reports)
        workers = ", ".join(r.worker.value.replace("_crew", "").replace("_", " ").title() for r in reports)

        if completed == total:
            return f"All {total} worker(s) ({workers}) completed successfully."
        elif completed > 0:
            return f"{completed}/{total} workers completed. Some tasks encountered errors."
        else:
            return f"All {total} workers failed. Check error details."
