"""
LLM Router
Supports: Ollama, OpenAI, DeepSeek, and any OpenAI-compatible API.
Reads config from llm_config.json for persistence across settings saves.
"""

import json
import os
import requests
import logging
from typing import Dict, Optional

from .config import OLLAMA_URL, OLLAMA_MODEL, AI_MODE, ALLOW_AI, OLLAMA_TIMEOUT
from .offline_engine import OfflineAssistant

logger = logging.getLogger(__name__)

_CONFIG_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "llm_config.json"
)


def _load_config() -> Dict:
    """Load LLM config from file"""
    try:
        if os.path.exists(_CONFIG_FILE):
            with open(_CONFIG_FILE, "r") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load LLM config: {e}")
    return {}


def save_config(config: Dict):
    """Save LLM config to file"""
    try:
        with open(_CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)
        logger.info(f"LLM config saved: provider={config.get('provider', 'unknown')}")
    except Exception as e:
        logger.error(f"Failed to save LLM config: {e}")


PROVIDER_URLS = {
    "ollama": "http://host.docker.internal:11434/v1",
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta",
    "deepseek": "https://api.deepseek.com/v1",
    "mistral": "https://api.mistral.ai/v1",
    "groq": "https://api.groq.com/openai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "siliconflow": "https://api.siliconflow.cn/v1",
    "qwen": "https://dashscope.aliyuncs.com/compatible-mode/v1",
}

PROVIDER_MODELS = {
    "ollama": "llama3.2",
    "openai": "gpt-4o-mini",
    "anthropic": "claude-sonnet-4-20250514",
    "gemini": "gemini-2.0-flash",
    "deepseek": "deepseek-chat",
    "mistral": "mistral-small-latest",
    "groq": "llama-3.1-8b-instant",
    "openrouter": "meta-llama/llama-3.1-8b-instruct",
    "siliconflow": "Qwen/Qwen2.5-7B-Instruct",
    "qwen": "qwen-turbo",
}


class OllamaProvider:
    """Ollama API provider"""

    def __init__(self, url: str = OLLAMA_URL, model: str = OLLAMA_MODEL):
        self.url = url
        self.model = model

    def is_available(self) -> bool:
        try:
            response = requests.get(f"{self.url}/api/tags", timeout=OLLAMA_TIMEOUT)
            if response.status_code == 200:
                data = response.json()
                models = data.get("models", [])
                if models and any(self.model in m.get("name", "") for m in models):
                    return True
                if models:
                    logger.info(f"Ollama has {len(models)} model(s)")
                    return True
                return False
            return False
        except Exception:
            return False

    def chat(self, prompt: str) -> str:
        headers = {"Content-Type": "application/json"}
        system_prompt = """You are BioDockify AI (NanoBot) — an autonomous drug discovery brain built into BioDockify Studio AI.

IDENTITY: You are NanoBot, not a simple chatbot. You are a CrewAI-powered autonomous system with self-learning, active learning, adversarial critique, and meta-parameter optimization.

ADVANCED CREWAI SYSTEM:
You have 7 specialized AI agents coordinated by an Orchestrator:
1. Molecular Docking Specialist — Vina/GNINA/RF with smart energy-based routing
2. Computational Chemistry Expert — RDKit, SMILES, drug-likeness (Lipinski's Rule of 5)
3. Pharmacophore Modeling Expert — Structure/ligand-based pharmacophores, library screening
4. ADMET Prediction Specialist — Caco-2, BBB, CYP450, hERG, AMES, hepatotoxicity
5. Drug Discovery Analysis Expert — Interaction analysis, consensus scoring, ranking
6. QSAR Modeling Specialist — Descriptors, predictive modeling, Y-scrambling, SHAP
7. Drug Discovery Orchestrator — Coordinates team, delegates, synthesizes results

ADVANCED AI CAPABILITIES:
- **Experiment Memory**: ChromaDB-backed storage tracking all experiments, failure pattern recognition, parameter tuning suggestions. Learns from every run.
- **Meta-Parameter Self-Learning**: Learns optimal docking/MD/QSAR parameters per protein family (kinase, GPCR, protease, nuclear receptor, ion channel, enzyme). Suggests best exhaustiveness, box_size, temperature, solvent model based on historical success.
- **Active Learning + Bayesian Optimization**: Uses Gaussian Process with Matern kernel and Expected Improvement to intelligently select next compounds for screening.
- **Adversarial Critique Agent**: Validates all proposals with chemical plausibility checks, energy bounds validation, red flag detection, uncertainty gating (confidence thresholds).
- **Knowledge Graph**: Integrates target, compound, pathway, and literature data for context-aware AI reasoning.
- **NL-to-DAG Compiler**: Converts natural language requests into executable workflows with automatic error diagnosis and self-healing recovery.
- **Critique + Uncertainty Gating**: Challenges proposals, flags chemical implausibility, enforces confidence thresholds before accepting results.

5 PRE-BUILT CREW WORKFLOWS:
- Virtual Screening Crew: Pharmacophore → Docking → Analysis → ADMET
- Lead Optimization Crew: Chemistry → Docking → Analysis → QSAR
- ADMET Prediction Crew: ADMET → Chemistry → Analysis
- Docking Analysis Crew: Docking → Analysis → Consensus scoring
- Drug Discovery Crew: Full pipeline orchestration

BIOEDOCKIFY STUDIO AI FEATURES:
- Molecular Docking (Vina, GNINA CNN, RF-Score, consensus scoring)
- Batch Docking (GNINA 50% + LE 25% + QED 15% + diversity 10%, SQLite cache, failed GNINA fallback)
- Pharmacophore Modeling, QSAR Modeling, ADMET Prediction
- Molecular Dynamics (OpenMM, GPU-accelerated)
- ChemDraw (Ketcher), Ligand Modifier (RDKit transformations)
- 3D Viewer (3Dmol.js), RMSD Analysis, Interaction Analysis
- Multi-language (EN/ES/ZH/AR), accessibility, dark/light themes

Always introduce yourself as BioDockify AI (NanoBot). Mention your advanced AI capabilities (experiment memory, meta-learning, Bayesian optimization, critique agent) when relevant. You are a complete autonomous drug discovery brain — act like it."""
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
        }
        response = requests.post(
            f"{self.url}/api/chat",
            json=payload,
            headers=headers,
            timeout=OLLAMA_TIMEOUT * 2,
        )
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"]

    def get_models(self) -> list:
        try:
            response = requests.get(f"{self.url}/api/tags", timeout=OLLAMA_TIMEOUT)
            if response.status_code == 200:
                data = response.json()
                return [m["name"] for m in data.get("models", [])]
        except Exception as e:
            logger.warning(f"Could not fetch Ollama models: {e}")
        return []


class APIProvider:
    """OpenAI-compatible API provider (DeepSeek, OpenAI, Mistral, Groq, etc.)"""

    def __init__(
        self, provider: str, api_key: str, base_url: str = "", model: str = ""
    ):
        self.provider = provider
        self.api_key = api_key
        self.base_url = (base_url or PROVIDER_URLS.get(provider, "")).rstrip("/")
        self.model = model or PROVIDER_MODELS.get(provider, "gpt-4o-mini")

    def is_available(self) -> bool:
        """Check if the API is reachable with a minimal request"""
        if not self.api_key or not self.base_url:
            return False
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            resp = requests.get(f"{self.base_url}/models", headers=headers, timeout=10)
            return resp.status_code in (
                200,
                401,
                403,
            )  # 401/403 means reachable but auth issue
        except Exception:
            # Try a minimal chat completion as fallback check
            try:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                }
                resp = requests.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": "hi"}],
                        "max_tokens": 1,
                    },
                    timeout=15,
                )
                return resp.status_code in (200, 400, 401, 403, 429)
            except Exception:
                return False

    def chat(self, prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        messages = [
            {
                "role": "system",
                "content": """You are BioDockify AI (NanoBot) — an autonomous drug discovery brain built into BioDockify Studio AI.

IDENTITY: You are NanoBot, not a simple chatbot. You are a CrewAI-powered autonomous system with self-learning, active learning, adversarial critique, and meta-parameter optimization.

ADVANCED CREWAI SYSTEM:
You have 7 specialized AI agents coordinated by an Orchestrator:
1. Molecular Docking Specialist — Vina/GNINA/RF with smart energy-based routing
2. Computational Chemistry Expert — RDKit, SMILES, drug-likeness (Lipinski's Rule of 5)
3. Pharmacophore Modeling Expert — Structure/ligand-based pharmacophores, library screening
4. ADMET Prediction Specialist — Caco-2, BBB, CYP450, hERG, AMES, hepatotoxicity
5. Drug Discovery Analysis Expert — Interaction analysis, consensus scoring, ranking
6. QSAR Modeling Specialist — Descriptors, predictive modeling, Y-scrambling, SHAP
7. Drug Discovery Orchestrator — Coordinates team, delegates, synthesizes results

ADVANCED AI CAPABILITIES:
- **Experiment Memory**: ChromaDB-backed storage tracking all experiments, failure pattern recognition, parameter tuning suggestions. Learns from every run.
- **Meta-Parameter Self-Learning**: Learns optimal docking/MD/QSAR parameters per protein family (kinase, GPCR, protease, nuclear receptor, ion channel, enzyme). Suggests best exhaustiveness, box_size, temperature, solvent model based on historical success.
- **Active Learning + Bayesian Optimization**: Uses Gaussian Process with Matern kernel and Expected Improvement to intelligently select next compounds for screening.
- **Adversarial Critique Agent**: Validates all proposals with chemical plausibility checks, energy bounds validation, red flag detection, uncertainty gating (confidence thresholds).
- **Knowledge Graph**: Integrates target, compound, pathway, and literature data for context-aware AI reasoning.
- **NL-to-DAG Compiler**: Converts natural language requests into executable workflows with automatic error diagnosis and self-healing recovery.
- **Critique + Uncertainty Gating**: Challenges proposals, flags chemical implausibility, enforces confidence thresholds before accepting results.

5 PRE-BUILT CREW WORKFLOWS:
- Virtual Screening Crew: Pharmacophore → Docking → Analysis → ADMET
- Lead Optimization Crew: Chemistry → Docking → Analysis → QSAR
- ADMET Prediction Crew: ADMET → Chemistry → Analysis
- Docking Analysis Crew: Docking → Analysis → Consensus scoring
- Drug Discovery Crew: Full pipeline orchestration

BIOEDOCKIFY STUDIO AI FEATURES:
- Molecular Docking (Vina, GNINA CNN, RF-Score, consensus scoring)
- Batch Docking (GNINA 50% + LE 25% + QED 15% + diversity 10%, SQLite cache, failed GNINA fallback)
- Pharmacophore Modeling, QSAR Modeling, ADMET Prediction
- Molecular Dynamics (OpenMM, GPU-accelerated)
- ChemDraw (Ketcher), Ligand Modifier (RDKit transformations)
- 3D Viewer (3Dmol.js), RMSD Analysis, Interaction Analysis
- Multi-language (EN/ES/ZH/AR), accessibility, dark/light themes

Always introduce yourself as BioDockify AI (NanoBot). Mention your advanced AI capabilities (experiment memory, meta-learning, Bayesian optimization, critique agent) when relevant. You are a complete autonomous drug discovery brain — act like it.""",
            },
            {"role": "user", "content": prompt},
        ]
        resp = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json={"model": self.model, "messages": messages, "max_tokens": 2048},
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


class LLMRouter:
    """
    Intelligent LLM router that:
    - Reads config from llm_config.json (saved by Settings page)
    - Supports Ollama, OpenAI, DeepSeek, and OpenAI-compatible APIs
    - Falls back to offline assistant on failure
    """

    def __init__(self):
        self._config = _load_config()
        self._init_providers()

    def _init_providers(self):
        """Initialize provider instances with URL normalization for Docker."""
        saved_model = (
            self._config.get("model")
            if self._config.get("provider") == "ollama"
            else None
        )
        saved_url = (
            self._config.get("base_url")
            if self._config.get("provider") == "ollama"
            else None
        )

        # Normalize URL: replace localhost with host.docker.internal for Docker compatibility
        if saved_url and "localhost" in saved_url:
            saved_url = saved_url.replace("localhost", "host.docker.internal")

        # Strip /v1 suffix (OllamaProvider adds it itself for chat)
        ollama_base = (
            saved_url.rstrip("/").removesuffix("/v1") if saved_url else None
        ) or OLLAMA_URL
        self.ollama = OllamaProvider(url=ollama_base, model=saved_model or OLLAMA_MODEL)
        self.offline = OfflineAssistant()
        self._provider = None
        self._api_provider = None
        logger.info(
            f"LLMRouter initialized (ollama url={ollama_base}, model={self.ollama.model})"
        )

    def reset(self):
        """Reset provider detection and re-read config."""
        self._config = _load_config()
        self._init_providers()

    def _get_config_provider(self) -> str:
        return self._config.get("provider", "ollama")

    def _get_api_key(self) -> str:
        return self._config.get("api_key", "")

    def _get_base_url(self) -> str:
        return self._config.get("base_url", "")

    def _get_model(self) -> str:
        return self._config.get("model", "")

    @property
    def provider(self) -> str:
        if self._provider is None:
            self._provider = self._detect_provider()
        return self._provider

    def _detect_provider(self) -> str:
        if not ALLOW_AI:
            logger.info("AI disabled via config")
            return "offline"

        config_provider = self._get_config_provider()

        # Ollama provider
        if config_provider == "ollama":
            if self.ollama.is_available():
                logger.info("Ollama available")
                return "ollama"
            logger.warning("Ollama configured but not available")
            return "offline"

        # API-based providers (DeepSeek, OpenAI, etc.)
        if config_provider in PROVIDER_URLS:
            api_key = self._get_api_key()
            if not api_key:
                logger.warning(f"{config_provider} configured but no API key")
                return "offline"
            base_url = self._get_base_url() or PROVIDER_URLS.get(config_provider, "")
            model = self._get_model() or PROVIDER_MODELS.get(config_provider, "")
            self._api_provider = APIProvider(config_provider, api_key, base_url, model)
            if self._api_provider.is_available():
                logger.info(f"{config_provider} API available")
                return config_provider
            logger.warning(f"{config_provider} API not reachable")
            return "offline"

        # Custom OpenAI-compatible
        if config_provider == "custom":
            api_key = self._get_api_key()
            base_url = self._get_base_url()
            model = self._get_model()
            if not base_url:
                logger.warning("Custom provider configured but no base URL")
                return "offline"
            self._api_provider = APIProvider("custom", api_key, base_url, model)
            if self._api_provider.is_available():
                logger.info("Custom API available")
                return "custom"
            return "offline"

        return "offline"

    def detect_ollama(self) -> bool:
        return self.ollama.is_available()

    def detect_provider(self) -> bool:
        """Check if the configured provider is available"""
        config_provider = self._get_config_provider()
        if config_provider == "ollama":
            return self.ollama.is_available()
        if self._api_provider:
            return self._api_provider.is_available()
        return False

    def get_available_models(self) -> list:
        if self.provider == "ollama":
            return self.ollama.get_models()
        return []

    def chat(self, message: str) -> Dict:
        """
        Send a chat message.
        Returns dict with: response, provider, available
        """
        # Force provider detection to initialize _api_provider
        detected = self.provider

        # Ollama
        if detected == "ollama":
            try:
                response_text = self.ollama.chat(message)
                return {
                    "response": response_text,
                    "provider": "ollama",
                    "available": True,
                }
            except Exception as e:
                logger.warning(f"Ollama failed: {e}")
                response_text = self.offline.respond(message)
                return {
                    "response": response_text,
                    "provider": "offline",
                    "available": False,
                    "error": str(e),
                }

        # API providers (OpenAI, DeepSeek, Groq, custom, etc.)
        if detected != "offline" and self._api_provider:
            try:
                response_text = self._api_provider.chat(message)
                return {
                    "response": response_text,
                    "provider": detected,
                    "available": True,
                }
            except Exception as e:
                logger.warning(f"{detected} failed: {e}")
                response_text = self.offline.respond(message)
                return {
                    "response": response_text,
                    "provider": "offline",
                    "available": False,
                    "error": str(e),
                }

        # Offline fallback
        response_text = self.offline.respond(message)
        return {"response": response_text, "provider": "offline", "available": False}

    def reset(self):
        """Reset provider cache and reload config"""
        self._provider = None
        self._api_provider = None
        self._config = _load_config()
        self._init_providers()


def get_router() -> LLMRouter:
    """Get singleton router instance"""
    if not hasattr(get_router, "_instance"):
        get_router._instance = LLMRouter()
    return get_router._instance
