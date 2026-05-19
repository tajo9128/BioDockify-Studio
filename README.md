# BioDockify Studio AI

<p align="center">
  <img src="https://img.shields.io/badge/Version-4.4.6-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/Python-3.11-green.svg" alt="Python">
  <img src="https://img.shields.io/badge/License-MIT-purple.svg" alt="License">
  <img src="https://img.shields.io/badge/GPU-CUDA%2012.2-orange.svg" alt="GPU">
  <img src="https://img.shields.io/badge/AI-10%20Providers-purple.svg" alt="AI">
</p>

> **AI-Powered Autonomous Drug Discovery Platform** — runs at `http://localhost:8000`

An intelligent molecular docking platform with Discovery Studio-inspired UI, AI-powered molecule optimization, multi-agent orchestration, and automated drug discovery workflows.

---

## Table of Contents

- [Features](#features)
- [NanoBot Commander](#nanobot-commander)
- [Quick Start](#quick-start)
- [AI Providers](#ai-providers)
- [Molecule Library](#molecule-library)
- [Drug-like Properties](#drug-like-properties)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Docker Images](#docker-images)
- [Development](#development)
- [Changelog](#changelog)
- [License](#license)

---

## Features

### 🧬 ChemDraw - Molecule Editor
- Draw and analyze molecules with real-time 2D/3D visualization
- SMILES input with structure validation
- 12 pre-loaded FDA-approved drugs
- Ketcher integration for advanced molecule editing

### 🤖 AI Optimization
- AI-powered molecular modification
- Bioisosteric replacement
- Halogen, OH, NH2 group addition
- Aromatic ring expansion
- Flexibility reduction

### 🔬 Drug-like Analysis
- Lipinski Rule of 5 compliance
- MW, LogP, HBD, HBA calculations
- TPSA (Topological Polar Surface Area)
- Rotatable bonds analysis

### 🧪 Molecular Docking (Smart Energy-Based Routing)
- **AutoDock Vina 1.2** — High-precision empirical scoring function
- **GNINA** — CNN-based deep learning scoring (CNN, CNN affinity, CNN pose)
- **RF (Random Forest) Score** — Machine learning based rescoring
- **Smart Routing:**
  - Energy ≤ -5.0 kcal/mol → **Vina only** → Returns log, docking, grid files
  - Energy > -5.0 kcal/mol → **GNINA + RF** → Returns all files (Vina + GNINA outputs)
- RDKit-only file preparation (no Meeko/OpenBabel)
- Flexible ligand & rigid receptor docking
- Grid box auto-detection
- Real-time job tracking & pose visualization
- **Downloadable output files:** Log, Docking PDBQT, Grid configuration

### 📊 Batch Docking
- Upload multiple ligands for parallel screening
- Race condition and lock contention fixes
- Real-time progress tracking with polling
- Temp directory cleanup
- Cancel support for running jobs
- Hybrid filtering (score ≤ -7.0 OR top 20)
- Max 100 ligands per batch, capped at 30 for GNINA

### 🧲 Pharmacophore
- 3D pharmacophore feature generation
- Pharmacophore visualization viewer
- Compound library screening
- Feature alignment and matching

### 📈 QSAR Modeling
- Upload descriptor datasets
- Train predictive ML models
- Y-Scrambling validation
- SHAP feature importance
- Williams Plot (Applicability Domain)
- Model persistence and management
- Batch prediction support

### 💊 ADMET Prediction
- Absorption, Distribution, Metabolism, Excretion, Toxicity
- Single and batch prediction modes
- ADMET filtering integration
- Drug-likeness scoring

### 🎬 Molecular Dynamics
- OpenMM simulation engine
- GPU acceleration (CUDA/OpenCL)
- Automatic platform detection
- NVT/NPT/Production pipeline
- RMSD, RMSF, Energy, Gyration, SASA, H-bond analysis
- Trajectory playback with frame controls
- Publication-ready package generation
- Notification system (Discord, email)
- GPU status monitoring

### 🖥️ 3D Viewer
- NGL Viewer integration
- Ball-and-stick visualization
- Interactive rotation & zoom
- Trajectory playback
- Surface rendering (element, chain, hydrophobicity)
- Interaction path analysis
- 2D interaction diagrams
- Screenshot capture

### 📊 Interaction Analysis
- 2D interaction diagrams
- 3D interaction panel
- Binding site residue detection
- Hydrogen bond, pi-stacking, hydrophobic analysis
- Advanced interaction calculations

### 📈 RMSD Analysis
- RMSD calculation and visualization
- File-based RMSD loading
- Interactive plots
- Statistical analysis (min, max, avg)

### 🛡️ Security Monitor
- Container and dependency security scanning
- Severity classification (NONE, LOW, MEDIUM, HIGH, CRITICAL)
- Real-time scan results
- Security status dashboard

### 💚 System Health
- Real-time infrastructure monitoring
- CPU, Memory, Disk usage with progress bars
- GPU detection and status
- Service health indicators (9 services)
- Recent job tracking
- 10-second auto-refresh

### 💬 AI Assistant
- Multi-provider support (OpenAI, Claude, Gemini, DeepSeek, etc.)
- Drug discovery insights
- Molecule analysis suggestions
- Ollama local model support
- Auto-detection of available providers
- Model provider toggle (Ollama/Paid API)

### 🧬 Ligand Designer
- Interactive ligand modification
- Error feedback and loading states
- Clear behavior and re-trigger support
- Backend availability detection

### 🔧 Ligand Modifier
- Similarity search in PubChem
- Prompt-based modifications
- Autonomous AI-driven optimization
- Transformation engine with RDKit reactions
- Variant scoring and ranking

### 🎓 Classroom Mode
- Instructor management
- Assignment creation and submission
- Rubric-based scoring
- Student Edition support

### 📋 Job Queue
- Persistent job storage
- Real-time status updates
- Job history and filtering
- Full job details with interactions

### 📚 Documentation
- Comprehensive platform guide
- Version roadmap
- API documentation

---

## NanoBot Commander

The **NanoBot Commander** is a multi-agent orchestration system that decomposes high-level queries into subtasks, dispatches specialized worker crews, and synthesizes results.

### Architecture
```
Commander (Intent Analysis)
    ↓
TaskRouter (Capability Matching)
    ↓
Worker Crews (Execution)
    ↓
ReportSynthesizer (Results)
```

### 7 Specialized Worker Crews
| Crew | Function |
|------|----------|
| **Docking Crew** | AutoDock Vina + GNINA docking workflows |
| **QSAR Crew** | ML model training and prediction |
| **MD Crew** | Molecular dynamics simulation and analysis |
| **ADMET Crew** | ADMET property prediction |
| **Pharmacophore Crew** | Pharmacophore generation and screening |
| **SysHealth Crew** | System health monitoring |
| **Security Crew** | Security scanning and vulnerability detection |

### Commander Features
- **12 Intent Categories** for query decomposition
- **Task Tracking** with real-time status
- **Task Cancellation** for running operations
- **Worker Status Panel** with load monitoring
- **Conversation Memory** for context retention
- **Recommendations** for next steps
- **Commander/Chat Mode Toggle**

### Commander API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/commander/execute` | POST | Execute a command through the Commander |
| `/commander/task/{task_id}` | GET | Get task status and results |
| `/commander/task/{task_id}/cancel` | POST | Cancel a running task |
| `/commander/workers` | GET | Get worker status and load |
| `/commander/history` | GET | Get task execution history |
| `/commander/conversation/{conv_id}` | GET | Get conversation context |

---

## Quick Start

```bash
# Pull and run
docker pull tajo9128/biodockify-studio-ai:v4.4.6
docker run -p 8000:8000 tajo9128/biodockify-studio-ai:v4.4.6

# Or build locally
git clone https://github.com/tajo9128/BioDockify-Docking-Studio-AI.git
cd BioDockify-Docking-Studio-AI
docker build -f Dockerfile.single -t biodockify-studio-ai .
docker run -p 8000:8000 biodockify-studio-ai
```

Then open **http://localhost:8000** in your browser.

---

## AI Providers

Configure API keys in Settings:

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4o-mini, GPT-4 Turbo, GPT-4, GPT-3.5 Turbo |
| Claude | Claude Sonnet 4, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus |
| Gemini | Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash |
| Mistral | Mistral Large, Mistral Small, Mistral 7B, Codestral |
| DeepSeek | DeepSeek Chat, DeepSeek Coder, DeepSeek Reasoner |
| Qwen | Qwen Plus, Qwen Turbo, Qwen Max, Qwen Long (1M ctx) |
| SiliconFlow | Qwen2-72B, DeepSeek V2.5, Yi Large, GLM-4-9B |
| OpenRouter | Claude 3.5 Sonnet, GPT-4o, Gemini Pro, Mistral Large |
| Groq | Llama 3.1 70B, Llama 3.1 8B, Mixtral 8x7B |
| Ollama | Llama 3.2, Llama 3.1, Mistral, Qwen 2.5, Phi 3, Gemma 2 |
| Custom | Any OpenAI-compatible API |

---

## Molecule Library

Pre-loaded with 12 FDA-approved drugs:

| Drug | SMILES | Use |
|------|--------|-----|
| Aspirin | CC(=O)Oc1ccccc1C(=O)O | Anti-inflammatory |
| Caffeine | Cn1cnc2c1c(=O)n(c(=O)n2C)C | Stimulant |
| Glucose | OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O | Energy metabolism |
| Ibuprofen | CC(C)Cc1ccc(cc1)C(C)C(=O)O | Analgesic |
| Morphine | CN1CCc2c(O)ccc(c2C1)C(O)=O | Analgesic |
| Metformin | CN(C)N=C(N)N | Diabetes |
| Warfarin | CC(=O)OC(Cc1c(O)c2ccccc2oc1=O)C(c1ccccc1)=O | Anticoagulant |
| Sildenafil | CCCC1=C2N(C(=O)N1CCC)CCCC2c3ccc(cc3)S(=O)(=O)N | PDE5 inhibitor |

---

## Drug-like Properties

| Property | Rule | Description |
|----------|------|-------------|
| MW | < 500 Da | Molecular weight |
| LogP | < 5 | Lipophilicity |
| HBD | ≤ 5 | Hydrogen bond donors |
| HBA | ≤ 10 | Hydrogen bond acceptors |
| TPSA | < 140 Å² | Topological polar surface area |
| Rotatable | ≤ 10 | Flexible bonds |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BioDockify Studio AI v4.4.6                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript + Vite)                                    │
│  ├── Dashboard                                                          │
│  ├── ChemDraw Panel (smiles-drawer + Ketcher)                          │
│  ├── 3D Viewer (NGL Viewer)                                            │
│  ├── Properties Panel (Lipinski Rule of 5)                             │
│  ├── AI Suggestions Panel (RDKit drug-likeness)                       │
│  ├── Molecular Optimization (mutation strategies)                       │
│  ├── Docking Panel (Vina config, receptor/ligand upload)               │
│  ├── Batch Docking (multi-ligand screening)                            │
│  ├── Ligand Designer & Modifier                                        │
│  ├── Pharmacophore (3D feature generation & screening)                 │
│  ├── QSAR Modeling (ML training, validation, prediction)               │
│  ├── ADMET Prediction                                                  │
│  ├── MD Panel (OpenMM params, GPU info, trajectory view)               │
│  ├── RMSD Analysis                                                     │
│  ├── Interaction Analysis (2D/3D diagrams)                             │
│  ├── Security Monitor                                                  │
│  ├── System Health Dashboard                                           │
│  ├── AI Commander (multi-agent orchestration)                          │
│  ├── Job Queue (persistent, filterable)                                │
│  ├── Results Panel (scores, trajectories, analysis)                    │
│  ├── Documentation                                                     │
│  └── Settings (10 AI providers, themes, localization)                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Backend (FastAPI - 188 Routes)                                          │
│  ├── NanoBot Commander (intent analysis, task routing)                 │
│  │   ├── 7 Worker Crews (docking, QSAR, MD, ADMET, etc.)              │
│  │   ├── Resource Manager                                              │
│  │   ├── Memory Manager                                                │
│  │   └── Report Synthesizer                                            │
│  ├── Docking Engine (Vina + GNINA + RF scoring)                        │
│  ├── Analysis Engine (ranking, consensus, interactions)                │
│  ├── Pharmacophore Engine (feature generation, screening)              │
│  ├── QSAR Engine (descriptor calculation, model training)              │
│  ├── ADMET Engine (property prediction)                                │
│  ├── MD Engine (OpenMM simulation, GPU detection)                      │
│  ├── Security Scanner (dependency & container scanning)                │
│  ├── System Diagnostics (CPU, memory, disk, GPU, services)             │
│  ├── Ligand Modifier (transformation engine, variant scoring)          │
│  ├── AI Services (10 providers, Ollama integration)                    │
│  ├── Job Persistence (SQLite storage)                                  │
│  └── Static Frontend (embedded SPA)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Container (nvidia/cuda:12.2.0-runtime-ubuntu22.04)                     │
│  ├── rdkit-pypi==2022.9.5     (properties, prep, analysis)            │
│  ├── autodock-vina>=1.2.5     (empirical & vinardo scoring)          │
│  ├── gnina                    (CNN/RF deep learning docking)         │
│  ├── meeko>=0.5.0             (ligand preparation)                    │
│  ├── gemmi>=0.6.4             (structural biology)                    │
│  ├── openbabel-wheel          (file format conversion)                │
│  ├── fastapi==0.109.2         (web framework)                         │
│  ├── uvicorn[standard]==0.27.1 (ASGI server)                          │
│  ├── pydantic==2.6.1          (data validation)                       │
│  ├── httpx==0.26.0            (HTTP client)                           │
│  ├── sqlalchemy               (database ORM)                          │
│  ├── biopython                (protein structure handling)            │
│  ├── numpy<2                  (numerical computing)                   │
│  ├── openmm                   (MD simulations, GPU-accelerated)     │
│  ├── Storage: /app/backend/storage/{jobs, test files}                │
│  └── Port: 8000                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Core
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info and version |
| `/health` | GET | Health check |
| `/api/stats` | GET | Job statistics |
| `/upload` | POST | Upload receptor/ligand files |
| `/download/{filename}` | GET | Download result files |

### Docking
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dock/start` | POST | Start docking job |
| `/dock/{job_id}/status` | GET | Get docking job status |
| `/dock/{job_id}/cancel` | POST | Cancel docking job |
| `/dock/{job_id}/stream` | GET | Stream docking progress |
| `/batch/docking` | POST | Start batch docking |
| `/batch/docking/{job_id}` | GET | Get batch job status |
| `/batch/docking/{job_id}/progress` | GET | Get batch progress |
| `/batch/docking/{job_id}/results` | GET | Get batch results |

### AI & Commander
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/commander/execute` | POST | Execute Commander command |
| `/commander/task/{task_id}` | GET | Get task status |
| `/commander/task/{task_id}/cancel` | POST | Cancel task |
| `/commander/workers` | GET | Get worker status |
| `/commander/history` | GET | Get task history |
| `/commander/conversation/{conv_id}` | GET | Get conversation |
| `/brain/chat` | POST | AI chat |
| `/brain/chat/status` | GET | Chat service status |
| `/llm/settings` | GET/PUT | LLM configuration |
| `/llm/test` | POST | Test LLM connection |
| `/llm/auto-detect` | GET | Auto-detect LLM provider |
| `/llm/ollama/models` | GET | List Ollama models |

### QSAR
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/qsar/descriptor-groups` | GET | Get descriptor groups |
| `/qsar/descriptors` | GET | Get descriptors |
| `/qsar/descriptors/upload` | POST | Upload descriptor data |
| `/qsar/train` | POST | Train QSAR model |
| `/qsar/train/{job_id}/status` | GET | Get training status |
| `/qsar/train/{job_id}/results` | GET | Get training results |
| `/qsar/predict` | POST | Predict activity |
| `/qsar/predict/batch` | POST | Batch prediction |
| `/qsar/models` | GET | List saved models |
| `/qsar/models/{model_id}` | GET/DELETE | Manage model |

### ADMET
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admet/predict` | POST | Predict ADMET properties |
| `/admet/predict/batch` | POST | Batch ADMET prediction |
| `/admet/filter` | POST | Filter by ADMET criteria |
| `/analysis/filter/admet` | POST | Analysis ADMET filter |

### Molecular Dynamics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/md/dynamics` | POST | Start MD simulation |
| `/md/job/{job_id}` | GET | Get MD job status |
| `/md/analysis/rmsd` | POST | RMSD analysis |
| `/md/analysis/rmsf` | POST | RMSF analysis |
| `/md/analysis/energy` | POST | Energy analysis |
| `/md/analysis/gyration` | POST | Radius of gyration |
| `/md/analysis/sasa` | POST | SASA analysis |
| `/md/analysis/hbonds` | POST | H-bond analysis |
| `/md/analysis/all` | POST | All analyses |
| `/md/publication/package` | POST | Generate publication package |
| `/md/health` | GET | MD service health |
| `/md/notify/status` | GET | Notification status |
| `/md/notify/test` | POST | Test notification |
| `/md/notify` | POST | Configure notifications |
| `/md/minimize` | POST | Energy minimization |
| `/md/gpu/status` | GET | GPU status |

### Pharmacophore
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pharmacophore/generate` | POST | Generate pharmacophore |
| `/pharmacophore/features` | POST | Get pharmacophore features |
| `/pharmacophore/screen` | POST | Screen compound library |
| `/pharmacophore/align` | POST | Align pharmacophore |
| `/pharmacophore/visualization/{feature_type}` | GET | Get visualization data |

### RDKit & Chemistry
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/rdkit/prepare_ligand` | POST | Prepare ligand |
| `/rdkit/prepare_receptor_pdbqt` | POST | Prepare receptor PDBQT |
| `/rdkit/prepare_protein` | POST | Prepare protein |
| `/rdkit/detect_interactions` | POST | Detect interactions |
| `/rdkit/smiles-to-3d` | POST | Convert SMILES to 3D |
| `/api/chem/properties` | POST | Calculate properties |
| `/api/chem/scaffold` | POST | Get scaffold |
| `/api/chem/similarity-search` | POST | Similarity search |
| `/api/chem/alerts` | POST | Get structural alerts |
| `/api/chem/conformers` | POST | Generate conformers |
| `/api/chem/docking-prep` | POST | Docking preparation |
| `/api/chem/functional-groups` | POST | Detect functional groups |
| `/api/chem/inchi` | POST | Generate InChI |
| `/api/chem/iupac` | POST | Generate IUPAC name |
| `/api/chem/nmr-predict` | POST | Predict NMR |
| `/api/chem/sa-score` | POST | Synthetic accessibility score |
| `/api/chem/scaffold-cuts` | POST | Scaffold cuts |
| `/api/chem/to-smarts` | POST | Convert to SMARTS |

### Ligand Modifier
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ligand-modifier/optimize` | POST | Start ligand optimization |
| `/api/ligand-modifier/status/{job_id}` | GET | Get optimization status |
| `/api/ligand-modifier/cancel/{job_id}` | DELETE | Cancel optimization |

### Security
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/security/status` | GET | Get security status |
| `/security/scan` | POST | Run security scan |
| `/security/issues` | GET | Get security issues |
| `/security/reports` | GET | Get security reports |

### System
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/system/status` | GET | System status |
| `/system/diagnostics` | GET | System diagnostics |
| `/system/logs` | GET | System logs |
| `/system/errors` | GET | System errors |
| `/system/report-issue` | POST | Report an issue |

### Jobs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/jobs` | GET | List all jobs |
| `/jobs` | POST | Create job |
| `/jobs/{job_uuid}` | GET | Get job details |
| `/jobs/{job_uuid}` | DELETE | Delete job |
| `/jobs/{job_uuid}/results` | GET | Get job results |
| `/jobs/{job_uuid}/interactions` | GET | Get job interactions |
| `/jobs/{job_uuid}/status` | GET | Get job status |
| `/api/jobs/{job_id}/full` | GET | Get full job details |

### Analysis
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analyze` | POST | Analyze docking results |
| `/analyze/advanced` | POST | Advanced analysis |
| `/analysis/rank` | POST | Rank compounds |
| `/analysis/consensus` | POST | Consensus scoring |
| `/analysis/report` | POST | Generate report |
| `/analysis/export/top-hits` | POST | Export top hits |
| `/analysis/interactions/summary` | GET | Get interaction summary |
| `/rmsd` | POST | RMSD calculation |
| `/rmsd/file` | POST | RMSD from file |
| `/binding-site` | POST | Detect binding site |
| `/api/docking/binding-site` | POST | API binding site |
| `/api/docking/run` | POST | Run docking |
| `/api/docking/result/{job_id}` | GET | Get docking result |
| `/api/interactions/analyze` | POST | Analyze interactions |

### Crew AI
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/crew/status` | GET | Crew status |
| `/crew/agents` | GET | List agents |
| `/crew/crews` | GET | List crews |
| `/crew/kickoff` | POST | Kickoff crew |
| `/crew/job/{job_id}` | GET | Get crew job |
| `/crew/chat` | POST | Crew chat |
| `/crew/memory/stats` | GET | Memory statistics |
| `/crew/memory/{exp_id}` | GET | Get memory |
| `/crew/memory/failures` | GET | Memory failures |
| `/crew/validate/tool` | POST | Validate tool |
| `/crew/orchestrate` | POST | Orchestrate crews |

### AI Knowledge Graph
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ai/knowledge-graph/compound` | GET/POST | Compound knowledge |
| `/ai/knowledge-graph/target` | GET | Target knowledge |
| `/ai/knowledge-graph/target/{uniprot_id}` | GET | Target by UniProt |
| `/ai/knowledge-graph/target/{uniprot_id}/similar` | GET | Similar targets |
| `/ai/knowledge-graph/experiment` | POST | Experiment knowledge |
| `/ai/knowledge-graph/link` | POST | Link knowledge |
| `/ai/knowledge-graph/search` | POST | Search knowledge |
| `/ai/knowledge-graph/stats` | GET | Knowledge stats |
| `/ai/meta-params/record` | POST | Record meta-params |
| `/ai/meta-params/stats` | GET | Meta-params stats |
| `/ai/meta-params/suggest` | POST | Suggest meta-params |
| `/ai/workflow/compile` | POST | Compile workflow |
| `/ai/workflow/execute` | POST | Execute workflow |
| `/ai/critique/validate` | POST | Validate critique |
| `/ai/critique/validate-workflow` | POST | Validate workflow |
| `/ai/critique/cross-reference` | POST | Cross-reference |
| `/ai/active-learning/suggest` | POST | Active learning suggest |
| `/ai/active-learning/run` | POST | Run active learning |
| `/optimize/lead` | POST | Lead optimization |
| `/optimize/mutate` | POST | Mutate compound |
| `/optimize/variant/score` | POST | Score variant |

### Other
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/gpu/status` | GET | GPU status |
| `/ollama/status` | GET | Ollama status |
| `/sentinel/monitor` | POST | Sentinel monitor |
| `/sentinel/fallback` | POST | Sentinel fallback |
| `/sentinel/escalate` | POST | Sentinel escalate |
| `/sentinel/retry` | POST | Sentinel retry |
| `/sentinel/validate/result` | POST | Validate result |
| `/sentinel/queue/status` | GET | Sentinel queue status |
| `/notifications/configure` | POST | Configure notifications |
| `/notifications/send` | POST | Send notification |
| `/notifications/status` | GET | Notification status |
| `/notifications/test` | POST | Test notification |
| `/screen/shape` | POST | Shape screening |
| `/classroom/instructor/{instructor_id}` | GET | Instructor info |
| `/classroom/rubrics` | GET | Get rubrics |
| `/classroom/assignment/create` | POST | Create assignment |
| `/classroom/assignment/join` | POST | Join assignment |
| `/classroom/assignment/submit` | POST | Submit assignment |
| `/api/benchmark/run` | POST | Run benchmark |
| `/api/benchmark/results/{job_id}` | GET | Get benchmark results |
| `/api/ai/generate-ligands` | POST | Generate ligands |
| `/api/ai/optimize-ligand` | POST | Optimize ligand |
| `/api/ai/job-explain` | POST | Explain job |
| `/api/ai/ollama-status` | GET | Ollama status |
| `/settings` | GET/PUT | Settings management |
| `/assets` | GET | Serve frontend assets |
| `/{path:path}` | GET | SPA fallback |

---

## Docker Images

| Image | Description |
|-------|-------------|
| `tajo9128/biodockify-studio-ai:latest` | Latest release |
| `tajo9128/biodockify-studio-ai:v4.4.6` | Current stable release |
| `tajo9128/biodockify-studio-ai:full` | Full stack (Vina/GNINA/RF) |

---

## Development

```bash
# Local development (single container)
cd backend
pip install -r requirements.txt
python main.py

# Frontend development
cd frontend
npm install
npm run dev
```

---

## Changelog

### v4.4.6 (May 2026)
- **NanoBot Commander** — Multi-agent orchestration system with 7 specialized worker crews
- **Commander API** — 6 new endpoints for task execution, tracking, and cancellation
- **Worker Status Panel** — Real-time monitoring of worker load and availability
- **Commander/Chat Mode Toggle** — Switch between multi-agent and direct LLM chat
- **Task Recommendations** — AI-generated next-step suggestions
- **Conversation Memory** — Persistent context across Commander sessions
- **Header/Footer Layout Fix** — Resolved overlap issues with `min-h-0` flex containers
- **Ligand Designer Connectivity** — Fixed error feedback, loading states, and re-trigger support
- **ResourceManager Fix** — Added missing `Any` import
- **WorkerReport Fix** — Fixed `worker_type` attribute mismatch

### v4.4.5 (May 2026)
- **System Health Dashboard** — Real-time CPU, memory, disk, GPU, and service monitoring
- **Security Module** — Container and dependency vulnerability scanning
- **RMSD Analysis Fixes** — Improved calculation and visualization
- **Interaction Analysis Fixes** — 2D/3D diagram improvements
- **QSAR Validation** — Y-Scrambling, SHAP, Williams Plot support
- **Job Persistence** — SQLite-based job storage and retrieval
- **Pharmacophore Engine** — Bug fixes and frontend TS error resolution

### v4.4.4 (May 2026)
- **GNINA/Vina Download Resilience** — Retry fallback for CLI downloads
- **Ligand Modifier** — End-to-end fixes for transformation engine
- **Logo Collapse Fix** — Header/footer layout stability
- **Frontend Rebuild** — Clean build with no stale cache

### v4.4.2 (May 2026)
- **Batch Docking** — Race condition, polling errors, cancel, temp dir cleanup, lock contention fixes
- **Ligand Designer Debug** — Error feedback, loading states, clear behavior
- **Docking Results** — Fixed files not showing in UI
- **Ollama Integration** — Auto-detection, multi-URL fallback, 120s timeout

### v4.4.0 (May 2026)
- **MD Simulation** — Full NVT/NPT/Production pipeline with OpenMM CPU/GPU
- **Ligand Designer** — Fully functional with PDBQT conversion
- **Ollama Auto-Pull** — qwen3:4b model auto-downloaded on first run
- **Node.js Heap** — Increased to 4GB for frontend Docker build (OOM fix)
- **Critical Bug Fixes** — 24 issues resolved across full edition

---

## License

MIT License - See LICENSE file for details.

---

<p align="center">
  <strong>BioDockify Studio AI v4.4.6</strong><br>
  AI-Powered Autonomous Drug Discovery Platform<br>
  188 API Routes · 10 AI Providers · 7 Worker Crews · GPU Accelerated
</p>
