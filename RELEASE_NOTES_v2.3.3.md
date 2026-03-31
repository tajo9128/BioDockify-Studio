## Biodockify Studio AI v2.3.3

**AI-Powered Autonomous Drug Discovery Platform**

### What's New

#### Rebrand: BioDockify → Biodockify Studio AI
- New name: **Biodockify Studio AI**
- New tagline: **AI-Powered Autonomous Drug Discovery Platform**

#### 🧬 ChemDraw - Discovery Studio-Inspired UI
- 3-panel layout with real-time 2D/3D visualization
- 12 pre-loaded FDA-approved drugs (Aspirin, Caffeine, Metformin, Warfarin, etc.)
- NGL Viewer for 3D molecular visualization

#### 🤖 AI Optimization
- Add Halogen (F, Cl, Br)
- Add OH/NH2 groups
- Add aromatic rings
- Bioisosteric replacement
- Reduce molecular flexibility

#### 🔬 Drug-like Analysis
- Real-time Lipinski Rule of 5 compliance
- MW, LogP, HBD, HBA calculations
- TPSA, rotatable bonds, aromatic rings

### Quick Start

```bash
docker pull tajo9128/biodockify:latest
docker run -p 8000:8000 tajo9128/biodockify:latest
```

Then open **http://localhost:8000**

### Features

| Feature | Description |
|---------|-------------|
| ChemDraw | SMILES input with 2D/3D visualization |
| AI Optimization | Molecular modification strategies |
| Drug-like Analysis | Lipinski compliance check |
| Docking | AutoDock Vina integration |
| MD Simulation | OpenMM with GPU acceleration |
| AI Assistant | Multi-provider support |

### Docker Image

```bash
docker pull tajo9128/biodockify:latest
```

### Previous Releases

- v2.3.2 - ChemDraw with properties and suggestions
- v2.3.1 - Single container deployment
- v2.3.0 - Discovery Studio UI redesign
