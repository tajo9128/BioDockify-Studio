"""
BioDockify Task Router - Intelligent task dispatcher
Matches tasks to worker capabilities and manages execution.
"""

import uuid
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from crew.types import (
    Task, TaskStatus, TaskPriority, WorkerType, WorkerCapability, TaskInput, TaskOutput
)

logger = logging.getLogger(__name__)


class TaskRouter:
    """Intelligent task dispatcher with worker capability registry."""

    def __init__(self):
        self._workers: Dict[WorkerType, WorkerCapability] = {}
        self._active_tasks: Dict[str, Task] = {}
        self._worker_load: Dict[WorkerType, int] = {w: 0 for w in WorkerType}
        self._register_default_workers()

    def _register_default_workers(self):
        self._workers = {
            WorkerType.DOCKING: WorkerCapability(
                worker_type=WorkerType.DOCKING,
                capabilities=["vina_docking", "gnina_docking", "batch_docking", "pose_analysis"],
                max_concurrent=2, priority=2, requires_gpu=True, estimated_time_seconds=300
            ),
            WorkerType.QSAR: WorkerCapability(
                worker_type=WorkerType.QSAR,
                capabilities=["descriptor_calc", "model_build", "prediction", "validation"],
                max_concurrent=1, priority=3, requires_gpu=False, estimated_time_seconds=180
            ),
            WorkerType.MD: WorkerCapability(
                worker_type=WorkerType.MD,
                capabilities=["simulation_setup", "run_md", "rmsd_analysis", "trajectory"],
                max_concurrent=1, priority=2, requires_gpu=True, estimated_time_seconds=600
            ),
            WorkerType.ADMET: WorkerCapability(
                worker_type=WorkerType.ADMET,
                capabilities=["absorption", "distribution", "metabolism", "toxicity"],
                max_concurrent=2, priority=3, requires_gpu=False, estimated_time_seconds=120
            ),
            WorkerType.PHARMACOPHORE: WorkerCapability(
                worker_type=WorkerType.PHARMACOPHORE,
                capabilities=["pharmacophore_gen", "library_screen", "feature_map"],
                max_concurrent=1, priority=3, requires_gpu=False, estimated_time_seconds=240
            ),
            WorkerType.SYSHEALTH: WorkerCapability(
                worker_type=WorkerType.SYSHEALTH,
                capabilities=["system_status", "service_check", "resource_monitor"],
                max_concurrent=3, priority=4, requires_gpu=False, estimated_time_seconds=30
            ),
            WorkerType.SECURITY: WorkerCapability(
                worker_type=WorkerType.SECURITY,
                capabilities=["vulnerability_scan", "secret_detect", "policy_check"],
                max_concurrent=1, priority=2, requires_gpu=False, estimated_time_seconds=180
            ),
        }

    def register_worker(self, capability: WorkerCapability):
        self._workers[capability.worker_type] = capability

    def route_task(self, task_type: str, parameters: Dict[str, Any],
                   priority: TaskPriority = TaskPriority.MEDIUM,
                   parent_id: Optional[str] = None) -> Task:
        worker = self._select_worker(task_type)
        if not worker:
            raise ValueError(f"No worker available for task type: {task_type}")

        if self._worker_load[worker] >= self._workers[worker].max_concurrent:
            raise ValueError(f"Worker {worker.value} at max capacity")

        task = Task(
            task_id=str(uuid.uuid4()),
            parent_id=parent_id,
            worker=worker,
            priority=priority,
            input_data=TaskInput(task_type=task_type, parameters=parameters),
            created_at=datetime.now()
        )
        self._active_tasks[task.task_id] = task
        self._worker_load[worker] += 1
        logger.info(f"Task {task.task_id[:8]} routed to {worker.value}")
        return task

    def route_multi(self, tasks: List[Dict[str, Any]],
                    parent_id: Optional[str] = None) -> List[Task]:
        routed = []
        for t in tasks:
            try:
                task = self.route_task(
                    task_type=t["task_type"],
                    parameters=t.get("parameters", {}),
                    priority=TaskPriority(t.get("priority", 3)),
                    parent_id=parent_id
                )
                routed.append(task)
            except ValueError as e:
                logger.warning(f"Failed to route task: {e}")
        return routed

    def _select_worker(self, task_type: str) -> Optional[WorkerType]:
        type_to_worker = {
            "vina_docking": WorkerType.DOCKING,
            "gnina_docking": WorkerType.DOCKING,
            "batch_docking": WorkerType.DOCKING,
            "pose_analysis": WorkerType.DOCKING,
            "descriptor_calc": WorkerType.QSAR,
            "model_build": WorkerType.QSAR,
            "prediction": WorkerType.QSAR,
            "validation": WorkerType.QSAR,
            "simulation_setup": WorkerType.MD,
            "run_md": WorkerType.MD,
            "rmsd_analysis": WorkerType.MD,
            "trajectory": WorkerType.MD,
            "absorption": WorkerType.ADMET,
            "distribution": WorkerType.ADMET,
            "metabolism": WorkerType.ADMET,
            "toxicity": WorkerType.ADMET,
            "pharmacophore_gen": WorkerType.PHARMACOPHORE,
            "library_screen": WorkerType.PHARMACOPHORE,
            "feature_map": WorkerType.PHARMACOPHORE,
            "system_status": WorkerType.SYSHEALTH,
            "service_check": WorkerType.SYSHEALTH,
            "resource_monitor": WorkerType.SYSHEALTH,
            "vulnerability_scan": WorkerType.SECURITY,
            "secret_detect": WorkerType.SECURITY,
            "policy_check": WorkerType.SECURITY,
        }
        worker = type_to_worker.get(task_type)
        if worker and self._worker_load.get(worker, 0) < self._workers[worker].max_concurrent:
            return worker
        for w, cap in self._workers.items():
            if task_type in cap.capabilities and self._worker_load[w] < cap.max_concurrent:
                return w
        return None

    def complete_task(self, task_id: str, output: TaskOutput):
        if task_id in self._active_tasks:
            task = self._active_tasks[task_id]
            task.status = TaskStatus.COMPLETED
            task.output_data = output
            task.completed_at = datetime.now()
            self._worker_load[task.worker] = max(0, self._worker_load[task.worker] - 1)
            logger.info(f"Task {task_id[:8]} completed by {task.worker.value}")

    def fail_task(self, task_id: str, error: str):
        if task_id in self._active_tasks:
            task = self._active_tasks[task_id]
            task.status = TaskStatus.FAILED
            task.error = error
            task.completed_at = datetime.now()
            self._worker_load[task.worker] = max(0, self._worker_load[task.worker] - 1)
            logger.error(f"Task {task_id[:8]} failed: {error}")

    def cancel_task(self, task_id: str):
        if task_id in self._active_tasks:
            task = self._active_tasks[task_id]
            task.status = TaskStatus.CANCELLED
            task.completed_at = datetime.now()
            self._worker_load[task.worker] = max(0, self._worker_load[task.worker] - 1)

    def get_task(self, task_id: str) -> Optional[Task]:
        return self._active_tasks.get(task_id)

    def get_active_tasks(self) -> List[Task]:
        return [t for t in self._active_tasks.values() if t.status in (TaskStatus.PENDING, TaskStatus.RUNNING)]

    def get_worker_status(self) -> Dict[str, Any]:
        return {
            w.value: {
                "load": self._worker_load[w],
                "max_concurrent": self._workers[w].max_concurrent,
                "available": self._worker_load[w] < self._workers[w].max_concurrent,
                "capabilities": self._workers[w].capabilities
            }
            for w in WorkerType
        }
