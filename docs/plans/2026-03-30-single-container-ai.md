# Single Container + BioDockify AI - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate all services into a single Docker container and enhance BioDockify AI with multiple LLM providers.

**Architecture:**
- Single Docker container with all services (FastAPI, Vina, RDKit, Brain AI)
- Nginx for serving React frontend + API routing
- Redis + PostgreSQL as external dependencies (managed via docker-compose for dev)
- Multiple AI provider support: OpenAI, Claude, Gemini, OpenRouter, Mistral, Chinese APIs (SiliconFlow, DeepSeek, Qwen)

**Tech Stack:** FastAPI, RDKit, Meeko, AutoDock Vina, Docker, React/TypeScript

---

## Task 1: Create Single Container Dockerfile

**Files:**
- Create: `Dockerfile.single`
- Modify: `docker-compose.single.yml`

**Steps:**

1. Create `Dockerfile.single` with all services:
```dockerfile
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl wget git build-essential libopenbabel7 \
    libhdf5-dev libopenblas-dev libglib2.0-0 \
    libgfortran5 libsm6 libxml2 libxslt1.1 \
    libxrender1 libxext6 nginx nodejs npm

# Install Python dependencies
RUN pip install --no-cache-dir vina rdkit meeko && \
    pip install --no-cache-dir \
    fastapi uvicorn sqlalchemy redis httpx pydantic \
    python-multipart requests celery loguru

# Install Node.js for frontend build
RUN npm install -g npm@latest

# Build React frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Final setup
WORKDIR /app
COPY backend/ ./backend/
COPY services/api-backend/main.py ./backend/
COPY services/rdkit-service/ ./backend/rdkit/
COPY services/docking-service/ ./backend/docking/
COPY services/brain-service/ ./backend/brain/

# Copy built frontend
RUN cp -r /app/frontend/dist /app/backend/static/

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

2. Create simplified docker-compose:
```yaml
version: '3.8'
services:
  biodockify:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://...
    volumes:
      - ./data:/app/data

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=dockuser
      - POSTGRES_PASSWORD=dockpass
      - POSTGRES_DB=docking
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

**Commit:** `feat: create single-container Dockerfile`

---

## Task 2: Add Multiple AI Providers to LLM Router

**Files:**
- Modify: `services/brain-service/integrations/llm_router.py` (create if not exists)

**Steps:**

1. Create LLM router with multiple providers:
```python
class LLMProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    OPENROUTER = "openrouter"
    MISTRAL = "mistral"
    SILICONFLOW = "siliconflow"
    DEEPSEEK = "deepseek"
    QWEN = "qwen"
    OLLAMA = "ollama"

class LLMFactory:
    PROVIDERS = {
        LLMProvider.OPENAI: {
            "class": OpenAIProvider,
            "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
            "base_url": "https://api.openai.com/v1",
        },
        LLMProvider.ANTHROPIC: {
            "class": AnthropicProvider,
            "models": ["claude-3-5-sonnet", "claude-3-opus", "claude-3-haiku"],
            "base_url": "https://api.anthropic.com",
        },
        LLMProvider.GEMINI: {
            "class": GeminiProvider,
            "models": ["gemini-pro", "gemini-1.5-pro", "gemini-1.5-flash"],
            "base_url": "https://generativelanguage.googleapis.com/v1beta",
        },
        LLMProvider.OPENROUTER: {
            "class": OpenRouterProvider,
            "models": ["anthropic/claude-3.5-sonnet", "google/gemini-pro", "mistral/mistral-large"],
            "base_url": "https://openrouter.ai/api/v1",
        },
        LLMProvider.MISTRAL: {
            "class": MistralProvider,
            "models": ["mistral-large", "mistral-7b-instruct"],
            "base_url": "https://api.mistral.ai/v1",
        },
        LLMProvider.SILICONFLOW: {
            "class": SiliconFlowProvider,
            "models": ["Qwen/Qwen2-72B-Instruct", "deepseek-ai/DeepSeek-V2.5"],
            "base_url": "https://api.siliconflow.cn/v1",
        },
        LLMProvider.DEEPSEEK: {
            "class": DeepSeekProvider,
            "models": ["deepseek-chat", "deepseek-coder"],
            "base_url": "https://api.deepseek.com/v1",
        },
        LLMProvider.QWEN: {
            "class": QwenProvider,
            "models": ["qwen-turbo", "qwen-plus", "qwen-max"],
            "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        },
        LLMProvider.OLLAMA: {
            "class": OllamaProvider,
            "models": ["llama3", "mistral", "codellama"],
            "base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        },
    }
```

2. Create provider base class and implementations

**Commit:** `feat: add multiple AI providers support`

---

## Task 3: Update Settings UI with All AI Providers

**Files:**
- Modify: `frontend/src/pages/Settings.tsx`

**Steps:**

1. Add provider dropdown with all options:
```typescript
const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', icon: '🤖' },
  { value: 'anthropic', label: 'Anthropic Claude', icon: '🧠' },
  { value: 'gemini', label: 'Google Gemini', icon: '✨' },
  { value: 'openrouter', label: 'OpenRouter', icon: '🔀' },
  { value: 'mistral', label: 'Mistral AI', icon: '🌊' },
  { value: 'siliconflow', label: 'SiliconFlow (China)', icon: '🇨🇳' },
  { value: 'deepseek', label: 'DeepSeek (China)', icon: '🐉' },
  { value: 'qwen', label: 'Qwen/Alibaba (China)', icon: '🏯' },
  { value: 'ollama', label: 'Ollama (Local)', icon: '💻' },
];
```

2. Add model selector based on provider
3. Add API key input (with show/hide toggle)
4. Add base URL input (for custom endpoints)
5. Add channel configuration for BioDockify AI

**Commit:** `feat: add all AI providers to settings UI`

---

## Task 4: Add Channel Settings for BioDockify AI

**Files:**
- Modify: `frontend/src/pages/Settings.tsx`
- Modify: `services/api-backend/main.py` (add channel endpoints)

**Steps:**

1. Add channel selection UI:
```typescript
const AI_CHANNELS = [
  { value: 'auto', label: 'Auto (Best Available)', description: 'Automatically select best provider' },
  { value: 'openai', label: 'OpenAI Only', description: 'Use only OpenAI models' },
  { value: 'anthropic', label: 'Claude Only', description: 'Use only Anthropic Claude' },
  { value: 'gemini', label: 'Gemini Only', description: 'Use only Google Gemini' },
  { value: 'chinese', label: 'Chinese APIs', description: 'Use SiliconFlow/DeepSeek/Qwen' },
  { value: 'local', label: 'Local (Ollama)', description: 'Use local Ollama server' },
  { value: 'multi', label: 'Multi-Channel', description: 'Rotate between providers for reliability' },
];
```

2. Add channel configuration in backend:
```python
# Channel routing logic
CHANNEL_CONFIG = {
    "auto": {"strategy": "best_available", "fallback_order": [...]},
    "chinese": {"provider": "siliconflow", "fallback": "deepseek"},
    "multi": {"rotate": True, "providers": [...]},
}
```

**Commit:** `feat: add channel settings for BioDockify AI`

---

## Task 5: Professionalize Settings Panel

**Files:**
- Modify: `frontend/src/pages/Settings.tsx`

**Steps:**

1. Remove education-related content
2. Clean, professional layout with sections:
   - AI Settings (Provider, Model, API Key, Base URL)
   - Channel Configuration
   - System Preferences
   - About

3. Add test connection button
4. Add reset to defaults option
5. Add professional styling (no colorful emojis, clean typography)

**Commit:** `refactor: professionalize settings panel`

---

## Task 6: R
