"""
BioDockify Memory Manager - Persistent memory system.
"""

import json
import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

MEMORY_DIR = "storage/memory"


class MemoryManager:
    """Persistent memory system for task history, feedback, and knowledge."""

    def __init__(self, db_path: str = os.path.join(MEMORY_DIR, "memory.json")):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._collections: Dict[str, List[Dict]] = {}
        self._load()

    def _load(self):
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, "r") as f:
                    self._collections = json.load(f)
            except Exception:
                self._collections = {}

    def _save(self):
        try:
            with open(self.db_path, "w") as f:
                json.dump(self._collections, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save memory: {e}")

    def store(self, collection: str, content: str, metadata: Optional[Dict] = None):
        if collection not in self._collections:
            self._collections[collection] = []
        entry = {
            "content": content,
            "metadata": metadata or {},
            "timestamp": datetime.now().isoformat(),
            "id": f"{collection}_{len(self._collections[collection])}"
        }
        self._collections[collection].append(entry)
        self._save()
        return entry["id"]

    def retrieve(self, collection: str, limit: int = 10) -> List[Dict]:
        return self._collections.get(collection, [])[-limit:]

    def search(self, collection: str, query: str, limit: int = 5) -> List[Dict]:
        entries = self._collections.get(collection, [])
        query_lower = query.lower()
        scored = []
        for e in entries:
            score = sum(1 for word in query_lower.split() if word in e["content"].lower())
            if score > 0:
                scored.append((score, e))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [e for _, e in scored[:limit]]

    def get_collections(self) -> List[str]:
        return list(self._collections.keys())

    def clear_collection(self, collection: str):
        if collection in self._collections:
            self._collections[collection] = []
            self._save()


_memory_instance = None

def get_memory() -> MemoryManager:
    global _memory_instance
    if _memory_instance is None:
        _memory_instance = MemoryManager()
    return _memory_instance
