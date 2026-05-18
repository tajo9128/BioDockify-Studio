"""
BioDockify CrewAI - Shared Type Definitions
Types for Commander, TaskRouter, WorkerCrews, and execution pipeline.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(int, Enum):
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4
    BACKGROUND = 5


class WorkerType(str, Enum):
    DOCKING = "docking_crew"
    QSAR = "qsar_crew"
    MD = "md_crew"
    ADMET = "admet_crew"
    PHARMACOPHORE = "pharmacophore_crew"
    SYSHEALTH = "syshealth_crew"
    SECURITY = "security_crew"


class IntentCategory(str, Enum):
    DOCKING = "docking"
    QSAR = "qsar"
    MD_SIMULATION = "md_simulation"
    ADMET = "admet"
    PHARMACOPHORE = "pharmacophore"
    SYSTEM_HEALTH = "system_health"
    SECURITY = "security"
    JOB_MANAGEMENT = "job_management"
    ANALYSIS = "analysis"
    GENERAL_CHAT = "general_chat"
    MULTI_MODULE = "multi_module"
    UNKNOWN = "unknown"


@dataclass
class WorkerCapability:
    """Defines what a worker crew can do."""
    worker_type: WorkerType
    capabilities: List[str]
    max_concurrent: int = 1
    priority: int = 3
    requires_gpu: bool = False
    estimated_time_seconds: int = 60


@dataclass
class TaskInput:
    """Input payload for a worker task."""
    task_type: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TaskOutput:
    """Structured output from a worker crew."""
    module: str
    status: str
    data: Dict[str, Any] = field(default_factory=dict)
    recommendations: str = ""
    error: Optional[str] = None


@dataclass
class Task:
    """Represents a unit of work in the execution pipeline."""
    task_id: str
    parent_id: Optional[str]
    worker: WorkerType
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    input_data: Optional[TaskInput] = None
    output_data: Optional[TaskOutput] = None
    error: Optional[str] = None
    retries: int = 0
    max_retries: int = 3
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@dataclass
class CommanderRequest:
    """High-level request from user to Commander."""
    query: str
    conversation_id: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    provider_override: Optional[str] = None


@dataclass
class CommanderResponse:
    """Synthesized response from Commander to user."""
    response: str
    status: str
    tasks: List[Dict[str, Any]] = field(default_factory=list)
    workers_used: List[str] = field(default_factory=list)
    execution_time_seconds: float = 0.0
    conversation_id: Optional[str] = None
    recommendations: List[str] = field(default_factory=list)


@dataclass
class WorkerReport:
    """Structured report from a worker crew."""
    worker_type: WorkerType
    status: str
    execution_time_seconds: float
    output: TaskOutput
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MemoryEntry:
    """Entry in the memory system."""
    collection: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    embedding: Optional[List[float]] = None
    timestamp: Optional[datetime] = None
