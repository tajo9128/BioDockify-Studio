"""
BioDockify NanoBot Commander - Central Orchestrator
Receives high-level commands, decomposes into tasks, dispatches workers, synthesizes results.
"""

import uuid
import time
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from crew.types import (
    CommanderRequest, CommanderResponse, TaskStatus, TaskPriority,
    WorkerType, WorkerReport, IntentCategory
)
from crew.task_router import TaskRouter

logger = logging.getLogger(__name__)

INTENT_KEYWORDS = {
    IntentCategory.DOCKING: ["dock", "binding", "pose", "vina", "gnina", "affinity", "screen compound"],
    IntentCategory.QSAR: ["qsar", "model", "descriptor", "predict activity", "correlation", "regression"],
    IntentCategory.MD_SIMULATION: ["molecular dynamics", "md simulation", "trajectory", "rmsd", "equilibration"],
    IntentCategory.ADMET: ["admet", "toxicity", "absorption", "metabolism", "permeability", "drug-likeness"],
    IntentCategory.PHARMACOPHORE: ["pharmacophore", "feature", "pharmacophoric", "ligand-based"],
    IntentCategory.SYSTEM_HEALTH: ["system health", "status", "monitor", "resource", "cpu", "memory", "gpu"],
    IntentCategory.SECURITY: ["security", "vulnerability", "scan", "secret", "policy"],
    IntentCategory.JOB_MANAGEMENT: ["job", "queue", "cancel", "status", "results"],
    IntentCategory.ANALYSIS: ["analyze", "interaction", "rank", "score", "compare"],
}


class NanoBotCommander:
    """Central orchestrator for multi-agent drug discovery."""

    def __init__(self):
        self.router = TaskRouter()
        self._conversations: Dict[str, List[Dict]] = {}
        self._task_history: List[Dict] = []

    def execute(self, request: CommanderRequest) -> CommanderResponse:
        start = time.time()
        conv_id = request.conversation_id or str(uuid.uuid4())
        self._init_conversation(conv_id)

        intent = self._classify_intent(request.query)
        logger.info(f"Intent classified: {intent.value} for query: {request.query[:80]}")

        if intent == IntentCategory.GENERAL_CHAT:
            return self._handle_chat(request, conv_id, time.time() - start)

        if intent == IntentCategory.UNKNOWN:
            return CommanderResponse(
                response="I'm not sure what you're asking. Try: 'dock these compounds', 'run MD simulation', 'check system health', or 'scan for vulnerabilities'.",
                status="unknown_intent",
                conversation_id=conv_id,
                execution_time_seconds=time.time() - start
            )

        subtasks = self._decompose_task(request.query, intent)
        tasks = self.router.route_multi(subtasks, parent_id=conv_id)

        if not tasks:
            return CommanderResponse(
                response="No workers available for this task right now. Try again later.",
                status="no_workers",
                conversation_id=conv_id,
                execution_time_seconds=time.time() - start
            )

        for task in tasks:
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.now()

        worker_reports = []
        for task in tasks:
            try:
                output = self._execute_worker(task)
                self.router.complete_task(task.task_id, output)
                worker_reports.append(WorkerReport(
                    worker_type=task.worker,
                    status="completed",
                    execution_time_seconds=(task.completed_at - task.started_at).total_seconds() if task.completed_at and task.started_at else 0,
                    output=output
                ))
            except Exception as e:
                self.router.fail_task(task.task_id, str(e))
                logger.error(f"Worker {task.worker.value} failed: {e}")

        response = self._synthesize_response(worker_reports, intent)

        record = {
            "conversation_id": conv_id,
            "query": request.query,
            "intent": intent.value,
            "tasks": [t.task_id for t in tasks],
            "status": "completed",
            "timestamp": datetime.now().isoformat()
        }
        self._task_history.append(record)
        self._conversations[conv_id].append(record)

        return CommanderResponse(
            response=response,
            status="completed",
            tasks=[{"id": t.task_id, "worker": t.worker.value, "status": t.status.value} for t in tasks],
            workers_used=list(set(t.worker.value for t in tasks)),
            execution_time_seconds=time.time() - start,
            conversation_id=conv_id,
            recommendations=self._generate_recommendations(worker_reports)
        )

    def cancel_task(self, task_id: str) -> bool:
        task = self.router.get_task(task_id)
        if task and task.status in (TaskStatus.PENDING, TaskStatus.RUNNING):
            self.router.cancel_task(task_id)
            logger.info(f"Task {task_id[:8]} cancelled by user")
            return True
        return False

    def get_task_status(self, task_id: str) -> Optional[Dict]:
        task = self.router.get_task(task_id)
        if task:
            return {
                "task_id": task.task_id,
                "worker": task.worker.value,
                "status": task.status.value,
                "priority": task.priority.name,
                "retries": task.retries,
                "error": task.error,
                "created_at": task.created_at.isoformat() if task.created_at else None,
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            }
        return None

    def get_worker_status(self) -> Dict:
        return self.router.get_worker_status()

    def get_conversation(self, conv_id: str) -> List[Dict]:
        return self._conversations.get(conv_id, [])

    def get_task_history(self, limit: int = 20) -> List[Dict]:
        return self._task_history[-limit:]

    def _init_conversation(self, conv_id: str):
        if conv_id not in self._conversations:
            self._conversations[conv_id] = []

    def _classify_intent(self, query: str) -> IntentCategory:
        query_lower = query.lower()
        matches = []
        for category, keywords in INTENT_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in query_lower)
            if score > 0:
                matches.append((score, category))
        if not matches:
            return IntentCategory.GENERAL_CHAT
        matches.sort(key=lambda x: x[0], reverse=True)
        if len(matches) > 1 and matches[0][0] == matches[1][0]:
            return IntentCategory.MULTI_MODULE
        return matches[0][1]

    def _decompose_task(self, query: str, intent: IntentCategory) -> List[Dict[str, Any]]:
        decomposition_map = {
            IntentCategory.DOCKING: [
                {"task_type": "pose_analysis", "parameters": {"query": query}, "priority": 2}
            ],
            IntentCategory.QSAR: [
                {"task_type": "descriptor_calc", "parameters": {"query": query}, "priority": 3},
                {"task_type": "model_build", "parameters": {"query": query}, "priority": 3}
            ],
            IntentCategory.MD_SIMULATION: [
                {"task_type": "simulation_setup", "parameters": {"query": query}, "priority": 2},
                {"task_type": "rmsd_analysis", "parameters": {"query": query}, "priority": 2}
            ],
            IntentCategory.ADMET: [
                {"task_type": "absorption", "parameters": {"query": query}, "priority": 3},
                {"task_type": "toxicity", "parameters": {"query": query}, "priority": 3}
            ],
            IntentCategory.PHARMACOPHORE: [
                {"task_type": "pharmacophore_gen", "parameters": {"query": query}, "priority": 3}
            ],
            IntentCategory.SYSTEM_HEALTH: [
                {"task_type": "system_status", "parameters": {}, "priority": 4},
                {"task_type": "resource_monitor", "parameters": {}, "priority": 4}
            ],
            IntentCategory.SECURITY: [
                {"task_type": "vulnerability_scan", "parameters": {}, "priority": 2},
                {"task_type": "secret_detect", "parameters": {}, "priority": 2}
            ],
            IntentCategory.JOB_MANAGEMENT: [
                {"task_type": "system_status", "parameters": {"query": query}, "priority": 4}
            ],
            IntentCategory.ANALYSIS: [
                {"task_type": "pose_analysis", "parameters": {"query": query}, "priority": 3}
            ],
            IntentCategory.MULTI_MODULE: [
                {"task_type": "system_status", "parameters": {"query": query}, "priority": 3}
            ],
        }
        return decomposition_map.get(intent, [{"task_type": "system_status", "parameters": {"query": query}}])

    def _execute_worker(self, task) -> Any:
        from crew.crews import execute_worker_crew
        return execute_worker_crew(task.worker, task.input_data.parameters if task.input_data else {})

    def _handle_chat(self, request: CommanderRequest, conv_id: str, elapsed: float) -> CommanderResponse:
        from ai.llm_router import get_router
        router = get_router()
        router.reset()
        result = router.chat(request.query)
        response_text = result.get("response", result.get("error", "No response"))
        self._conversations[conv_id].append({
            "role": "user", "content": request.query,
            "timestamp": datetime.now().isoformat()
        })
        self._conversations[conv_id].append({
            "role": "assistant", "content": response_text,
            "timestamp": datetime.now().isoformat()
        })
        return CommanderResponse(
            response=response_text,
            status="completed",
            workers_used=[result.get("provider", "unknown")],
            execution_time_seconds=elapsed,
            conversation_id=conv_id
        )

    def _synthesize_response(self, reports: List[WorkerReport], intent: IntentCategory) -> str:
        if not reports:
            return "No results were generated."
        parts = []
        for r in reports:
            worker_name = r.worker_type.value.replace("_crew", "").replace("_", " ").title()
            if r.status == "completed":
                parts.append(f"**{worker_name}**: Task completed successfully.")
                if r.output.recommendations:
                    parts.append(f"  - {r.output.recommendations}")
            else:
                parts.append(f"**{worker_name}**: Task failed - {r.output.error or 'unknown error'}")
        return "\n\n".join(parts)

    def _generate_recommendations(self, reports: List[WorkerReport]) -> List[str]:
        recs = []
        for r in reports:
            if r.output.recommendations:
                recs.append(r.output.recommendations)
        return recs


_commander_instance = None

def get_commander() -> NanoBotCommander:
    global _commander_instance
    if _commander_instance is None:
        _commander_instance = NanoBotCommander()
    return _commander_instance
