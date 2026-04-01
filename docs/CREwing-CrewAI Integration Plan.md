# Plan: Replace Nanobot with CrewAI

 BioDockify Studio AI

## Overview

Replace the current custom Nanobot brain-service with **CrewAI** — a multi-agent orchestration framework (47.8k stars on GitHub, MIT license, Python >=3.10, <3.14).

 CrewAI provides role drug discovery platform with specialized autonomous agents (Crews) that collaborate on complex drug discovery tasks like virtual screening, lead optimization, ADMET prediction, and docking analysis.

## Architecture Comparison

| Current (Nanobot) | New (CrewAI) |
|---|---|
| Custom `ToolRegistry` + `BaseTool` | CrewAI `Agent` + `Task` + `Crew` classes |
| Custom `LLMProvider` + `LLMClient` | CrewAI native LLM (via env vars or Ollama, OpenAI, etc.) |
| Custom conversation memory | CrewAI built-in `memory=True` |
| Single chat endpoint | Multi-agent crew workflows |
| Manual tool calling | CrewAI automatic tool delegation |
| No pipeline support | CrewAI `Flow` for `@start`/@listen` decorators |

## Agents Design (6 Specialized Drug Discovery Agents)

1. **Molecular Docking Agent** - Vina/GNINA/RF docking
2. **RDKit Chemistry Agent** - SMILES, properties calculation, optimization
3. **Pharmacophore Agent** - Pharmacophore generation/screening
4. **ADMET Prediction Agent** - Absorption, distribution, metabolism, excretion, toxicity
5. **Analysis Agent** - Interaction analysis, RMSD, consensus scoring
6. **QSAR Modeling Agent** - Build QSAR models, predict activity

## Pre-built Crews

1. **Virtual Screening Crew** - Dock + Score + Filter + Rank compounds
2. **Lead Optimization Crew** - Iterative mutate + re-dock + Analyze
 optimize
3. **ADMET Prediction Crew** - Full ADMET profiling for compound libraries
4. **Docking Analysis Crew** - Dock + Analyze interactions + Generate report

## File Structure

```
backend/crew/                    # NEW - CrewAI integration
├── __init__.py
├── agents/                # Agent YAML configs + Python classes
│   ├── docking_agent.py
│   ├── chemistry_agent.py
│   ├── pharmacophore_agent.py
│   ├── admet_agent.py
│   ├── analysis_agent.py
│   └── qsar_agent.py
├── tools/                # Custom CrewAI tools
│   ├── docking_tools.py    # Wraps /api/docking/run, /api/rdkit/*, /api/chem/*
│   ├── rdkit_tools.py        # Wraps /api/chem/* endpoints
│   ├── pharmacophore_tools.py  # Wraps /api/pharmacophore/* endpoints
│   ├── admet_tools.py        # Wraps /api/admet/* endpoints
│   ├── analysis_tools.py    # Wraps /api/analysis/* endpoints
│   ├── pubchem_tool.py     # Wraps PubChem fetch
│   ├── pdb_tool.py          # Wraps PDB fetch
│   └── notification_tools.py # Wraps notification endpoints
├── crews/                # Crew definitions
│   ├── virtual_screening_crew.py
│   ├── lead_optimization_crew.py
│   ├── admet_prediction_crew.py
│   └── docking_analysis_crew.py
├── flows/                # Flow definitions
│   └── drug_discovery_flow.py   # Master pipeline
└── config/                # YAML configurations
    ├── agents/
    │   ├── docking.yaml
    │   ├── chemistry.yaml
    │   ├── pharmacophore.yaml
    │   ├── admet.yaml
    │   ├── analysis.yaml
    │   └── qsar.yaml
    └── tasks/
        ├── docking_tasks.yaml
        ├── chemistry_tasks.yaml
        ├── pharmacophore_tasks.yaml
        ├── admet_tasks.yaml
        ├── analysis_tasks.yaml
        └── qsar_tasks.yaml
```

## Implementation Tasks

### Task 1: Add crewai to requirements
**File:** `backend/requirements.txt`
**Action:** Add `crewai>=0.121.0` and `crewai-tools>=0.1.0`
**Test:** `pip install crewai crewai-tools`

### Task 2: Create Custom CrewAI Tools
**Files:** `backend/crew/tools/*.py`
Each tool wraps existing backend API endpoints as CrewAI `BaseTool` subclasses. Tools call the local FastAPI backend (`http://localhost:8000/api/...`) to execute operations.

### Task 3: Define Agents with YAML
**Files:** `backend/crew/config/agents/*.yaml`
Each agent gets `role`, `goal`, `backstory` from YAML config.

### Task 4: Define Tasks with YAML
**Files:** `backend/crew/config/tasks/*.yaml`
Each task gets `description`, `expected_output`, `agent` from YAML config.

### Task 5: Create Crew Classes
**Files:** `backend/crew/crews/*.py`
Each crew as agents + tasks with a process (sequential/hierarchical).

### Task 6: Create Master Drug Discovery Flow
**File:** `backend/crew/flows/drug_discovery_flow.py`
A Flow combining all crews with `@start`/@listen`/`@router` decorators.

### Task 7: Add CrewAI endpoints to main.py
**File:** `backend/main.py`
**Action:** Add endpoints: `/crew/chat`, `/crew/kickoff`, `/crew/status`, `/crew/agents`, `/crew/crews`, `/crew/flows`

### Task 8: Update frontend AIAssistant
**File:** `frontend/src/pages/AIAssistant.tsx`
**Action:** Add CrewAI mode toggle, show agent selection, crew status, streaming crew output.

### Task 9: Build and test
**Action:** Docker build, verify all endpoints work.
