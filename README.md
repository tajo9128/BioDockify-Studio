# Biodockify Studio AI

**AI-Powered Autonomous Drug Discovery Platform** — runs at `http://localhost:8000`

An intelligent molecular docking platform with Discovery Studio-inspired UI, AI-powered molecule optimization, and automated drug discovery workflows.

## Quick Start

```bash
# Single Container (Recommended)
docker compose -f docker-compose.single.yml up -d
# Open browser → http://localhost:8000
```

## Features

| Feature | Description |
|---------|-------------|
| **ChemDraw** | Draw & analyze molecules with real-time properties |
| **Docking** | AutoDock Vina with AI optimization |
| **AI Optimization** | Molecular modification & bioisosteric replacement |
| **3D Viewer** | Interactive NGL molecular visualization |
| **MD Simulation** | Molecular dynamics with OpenMM + GPU acceleration |
| **Drug-like Analysis** | Lipinski Rule of 5 compliance check |
| **Biodockify AI** | Multi-provider AI assistant for drug discovery |

## AI Providers

- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic Claude
- Google Gemini
- Mistral AI
- DeepSeek / Qwen
- OpenRouter
- Ollama (Local)

## Molecule Library

Pre-loaded with 12 FDA-approved drugs:
Aspirin, Caffeine, Glucose, Ibuprofen, Morphine, Benzene, Acetaminophen, Lisinopril, Metformin, Warfarin, Tamoxifen, Sildenafil

## Drug-like Properties

- Molecular Weight (MW)
- LogP (lipophilicity)
- H-Bond Donors/Acceptors
- TPSA (topological polar surface area)
- Rotatable bonds
- Aromatic rings

## Development

```bash
# Build single container
docker build -f Dockerfile.single -t tajo9128/biodockify:latest .
```

## License

MIT
