"""
BioDockify Resource Manager - System resource monitoring and allocation.
"""

import psutil
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ResourceLimits:
    cpu_percent: float = 80.0
    memory_percent: float = 90.0
    gpu_memory_percent: float = 95.0
    max_concurrent_docking: int = 2
    max_concurrent_md: int = 1


class ResourceManager:
    """System resource monitoring and task allocation."""

    def __init__(self, limits: Optional[ResourceLimits] = None):
        self.limits = limits or ResourceLimits()
        self._active_docking = 0
        self._active_md = 0

    def check_resources(self) -> Dict[str, Any]:
        cpu = psutil.cpu_percent(interval=0.5)
        memory = psutil.virtual_memory().percent
        return {
            "cpu_ok": cpu < self.limits.cpu_percent,
            "memory_ok": memory < self.limits.memory_percent,
            "cpu_percent": cpu,
            "memory_percent": memory,
        }

    def can_start_docking(self) -> bool:
        return self._active_docking < self.limits.max_concurrent_docking

    def can_start_md(self) -> bool:
        return self._active_md < self.limits.max_concurrent_md

    def start_docking(self):
        self._active_docking += 1

    def stop_docking(self):
        self._active_docking = max(0, self._active_docking - 1)

    def start_md(self):
        self._active_md += 1

    def stop_md(self):
        self._active_md = max(0, self._active_md - 1)

    def get_gpu_info(self) -> Dict:
        try:
            import subprocess
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,temperature.gpu", "--format=csv,noheader"],
                capture_output=True, timeout=5, text=True
            )
            if result.returncode == 0:
                parts = result.stdout.strip().split(",")
                if len(parts) >= 4:
                    total = float(parts[1].strip().replace(" ", ""))
                    used = float(parts[2].strip().replace(" ", ""))
                    return {
                        "available": True,
                        "name": parts[0].strip(),
                        "memory_total_mb": total,
                        "memory_used_mb": used,
                        "memory_percent": (used / total * 100) if total > 0 else 0,
                        "temperature": parts[3].strip(),
                    }
        except Exception:
            pass
        return {"available": False}

    def get_status(self) -> Dict:
        resources = self.check_resources()
        gpu = self.get_gpu_info()
        return {
            **resources,
            "gpu": gpu,
            "active_docking": self._active_docking,
            "active_md": self._active_md,
        }
