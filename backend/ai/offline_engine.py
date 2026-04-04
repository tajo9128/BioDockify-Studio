"""
Offline Assistant - Always available fallback
Deterministic responses for common docking questions
"""

import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


class OfflineAssistant:
    """
    Offline fallback assistant for when Ollama is unavailable.
    Provides deterministic responses to common molecular docking questions.
    """

    KNOWLEDGE_BASE = {
        "identity": {
            "keywords": [
                "who are you",
                "what are you",
                "what is your name",
                "who am i talking to",
                "introduce yourself",
                "what is nanobot",
            ],
            "response": "I am BioDockify AI, also known as NanoBot — the intelligent AI assistant built into BioDockify Studio AI. I'm powered by a CrewAI multi-agent system with 6 specialized AI agents at my command: a Molecular Docking Specialist, Computational Chemistry Expert, Pharmacophore Modeling Expert, ADMET Prediction Specialist, Drug Discovery Analysis Expert, and QSAR Modeling Specialist, all coordinated by a Drug Discovery Orchestrator. I'm here to help you with drug discovery!",
        },
        "about": {
            "keywords": [
                "what is biodockify",
                "about biodockify",
                "what can you do",
                "about this software",
                "about this app",
            ],
            "response": "BioDockify Studio AI is a free, open-source alternative to BIOVIA Discovery Studio and Schrödinger. It includes molecular docking (Vina, GNINA, RF-Score), batch docking with composite scoring (GNINA 50% + LE 25% + QED 15% + diversity 10%), pharmacophore modeling, QSAR modeling, ADMET prediction, molecular dynamics, ChemDraw, ligand modification, 3D visualization, RMSD analysis, interaction analysis, and AI-powered assistance via Ollama or cloud APIs. I (NanoBot) coordinate a team of 6 CrewAI agents to help you with drug discovery tasks.",
        },
        "features": {
            "keywords": [
                "features",
                "capabilities",
                "what does it have",
                "modules",
                "tools",
            ],
            "response": "BioDockify Studio AI includes: 1) Molecular Docking (Vina, GNINA, RF-Score with smart energy-based routing), 2) Batch Docking (composite scoring with GNINA 50% + LE 25% + QED 15% + diversity 10%, SQLite cache, failed GNINA fallback), 3) Pharmacophore Modeling, 4) QSAR Modeling (ML training with Y-scrambling, SHAP analysis), 5) ADMET Prediction (Caco-2, BBB, CYP450, hERG, AMES), 6) Molecular Dynamics (OpenMM, GPU-accelerated), 7) ChemDraw (Ketcher), 8) Ligand Modifier (RDKit transformations), 9) 3D Viewer (3Dmol.js), 10) RMSD Analysis, 11) Interaction Analysis, 12) AI Assistant (NanoBot with CrewAI multi-agent system), 13) Knowledge Graph, 14) Natural Language Workflow compiler (NL-to-DAG).",
        },
        "crewai": {
            "keywords": [
                "crewai",
                "crew",
                "agents",
                "multi-agent",
                "team",
                "orchestrator",
            ],
            "response": "BioDockify Studio AI uses CrewAI to coordinate a team of 6 specialized AI agents: 1) Molecular Docking Specialist (runs Vina/GNINA/RF with smart routing), 2) Computational Chemistry Expert (RDKit, SMILES, drug-likeness), 3) Pharmacophore Modeling Expert (structure/ligand-based pharmacophores), 4) ADMET Prediction Specialist (pharmacokinetics and toxicology), 5) Drug Discovery Analysis Expert (interactions, consensus scoring, ranking), 6) QSAR Modeling Specialist (descriptors, predictive modeling). All are coordinated by a Drug Discovery Orchestrator that delegates tasks and synthesizes results. The system supports pre-built workflows: Virtual Screening, Lead Optimization, ADMET Prediction, Docking Analysis, and full Drug Discovery pipelines.",
        },
        "nl": {
            "keywords": [
                "natural language",
                "nl to dag",
                "workflow",
                "nl workflow",
                "nl compiler",
            ],
            "response": "BioDockify Studio AI includes a Natural Language to DAG (Directed Acyclic Graph) compiler. You can describe what you want in plain English, and the system converts it into an executable workflow with automatic error diagnosis and self-healing recovery. The NL compiler parses your request, identifies the tools needed, builds a dependency graph, and executes steps in the correct order with retry logic.",
        },
        "vina": {
            "keywords": ["vina", "autodock", "binding affinity", "kcal/mol"],
            "response": "AutoDock Vina calculates binding affinity in kcal/mol. More negative values indicate stronger predicted binding. Typical drug-like molecules bind with -5 to -12 kcal/mol. In BioDockify, Vina is used for initial screening — strong binders (≤-5.0) exit at Vina, weak binders proceed to GNINA+RF for full evaluation.",
        },
        "gnina": {
            "keywords": [
                "gnina",
                "cnn",
                "convolutional",
                "deep learning",
                "neural network",
            ],
            "response": "GNINA uses deep learning (CNN) to evaluate pose quality. CNN scores range from 0 to 1, where higher values indicate better predicted binding. In BioDockify, GNINA contributes 50% to the composite score in batch docking. Failed GNINA runs fallback to 999.0 score.",
        },
        "rf": {
            "keywords": ["rf", "random forest", "score", "scoring"],
            "response": "Random Forest (RF) scoring uses an ensemble of decision trees to predict binding affinity. It provides robust scoring by averaging predictions from multiple tree models.",
        },
        "consensus": {
            "keywords": ["consensus", "combine", "average", "ensemble"],
            "response": "Consensus scoring combines Vina, GNINA CNN, and RF scores to provide more reliable predictions. The final score is typically an average or weighted combination of individual scores.",
        },
        "batch": {
            "keywords": [
                "batch",
                "batch docking",
                "screening",
                "multiple ligands",
                "virtual screening",
            ],
            "response": "Batch docking in BioDockify screens multiple ligands against a single receptor. It uses composite scoring: GNINA CNN (50%) + Ligand Efficiency (25%) + QED drug-likeness (15%) + Tanimoto diversity (10%). Results are cached in SQLite with composite primary keys. Failed GNINA runs fallback to 999.0. Diversity is calculated before scoring. Results include reasons for UI tooltips.",
        },
        "qsar": {
            "keywords": ["qsar", "machine learning", "train model", "predict"],
            "response": "QSAR Modeling in BioDockify lets you train ML models (RandomForest, GradientBoosting, SVR, PLS, Ridge, Lasso) to predict molecular activity. Upload a CSV with SMILES and activity values, select descriptor groups, train the model, and predict new compounds. Includes Y-scrambling validation, SHAP importance analysis, and applicability domain assessment.",
        },
        "admet": {
            "keywords": [
                "admet",
                "absorption",
                "distribution",
                "metabolism",
                "toxicity",
                "drug-likeness",
            ],
            "response": "ADMET prediction in BioDockify evaluates Absorption, Distribution, Metabolism, Excretion, and Toxicity of compounds. It predicts Caco-2 permeability, BBB penetration, CYP450 inhibition (1A2, 2C9, 2D6, 3A4), hERG inhibition, AMES mutagenicity, and hepatotoxicity. Uses rule-based and ML models including Lipinski's Rule of Five, Veber, and Egan rules.",
        },
        "pharmacophore": {
            "keywords": ["pharmacophore", "feature", "hypothesis"],
            "response": "Pharmacophore modeling in BioDockify identifies essential 3D arrangements of chemical features (H-bond donors/acceptors, hydrophobic regions, aromatic rings) required for biological activity. Supports both ligand-based and structure-based approaches with library screening capabilities.",
        },
        "md": {
            "keywords": ["molecular dynamics", "md simulation", "trajectory", "openmm"],
            "response": "Molecular Dynamics in BioDockify uses OpenMM for GPU-accelerated simulations. Features include solvation, energy minimization, NVT/NPT equilibration, production runs, and trajectory visualization with RMSD tracking.",
        },
        "hbond": {
            "keywords": ["hydrogen bond", "hbond", "h-bond", "donor", "acceptor"],
            "response": "Hydrogen bonds require: 1) Distance ≤ 3.5 Å between donor and acceptor, 2) Angle ≥ 120° at the hydrogen atom. They are crucial for ligand-receptor specificity.",
        },
        "hydrophobic": {
            "keywords": [
                "hydrophobic",
                "hydrophobicity",
                "lipophilicity",
                "pi stacking",
            ],
            "response": "Hydrophobic interactions occur between non-polar regions. They drive the burial of hydrophobic ligand groups into hydrophobic receptor pockets, contributing significantly to binding free energy.",
        },
        "rmsd": {
            "keywords": ["rmsd", "root mean square", "deviation", "similarity"],
            "response": "RMSD (Root Mean Square Deviation) measures structural similarity. RMSD < 2 Å indicates similar poses. It's calculated by averaging the squared distance between corresponding atoms.",
        },
        "pocket": {
            "keywords": ["pocket", "binding site", "active site", "cavity", " cleft"],
            "response": "Binding pockets are regions on the protein surface where ligands bind. They often contain key residues for ligand recognition. Tools like AutoSite or Fpocket can identify potential binding sites.",
        },
        "grid": {
            "keywords": ["grid", "autogrid", "maps", "energy grid"],
            "response": "Grid maps pre-compute interaction energies between the receptor and probe atoms. They speed up docking by allowing rapid energy lookups during ligand pose evaluation.",
        },
        "exhaustiveness": {
            "keywords": ["exhaustiveness", "exhaust", "search", "monte carlo"],
            "response": "Exhaustiveness controls docking search depth. Higher values (8-32) explore more pose space but take longer. For virtual screening, 8-16 is usually sufficient.",
        },
        "pose": {
            "keywords": ["pose", "conformation", "orientation", "geometry"],
            "response": "A pose is a specific 3D conformation and orientation of a ligand in the binding site. Docking generates multiple poses which are ranked by score.",
        },
        "docking": {
            "keywords": ["dock", "docking", "virtual screening"],
            "response": "Molecular docking predicts how a small molecule (ligand) binds to a protein target. It's used in drug discovery for virtual screening and understanding ligand-protein interactions.",
        },
        "help": {
            "keywords": ["help", "what can you", "commands"],
            "response": "I am NanoBot, your BioDockify AI assistant. I can help with: BioDockify Studio AI features, CrewAI multi-agent system, Vina scoring, GNINA CNN, Random Forest, consensus scoring, batch docking, QSAR modeling, ADMET, pharmacophores, molecular dynamics, hydrogen bonds, hydrophobic interactions, RMSD, binding pockets, grid parameters, exhaustiveness, and docking basics. I have 6 specialized AI agents ready to help with complex drug discovery tasks!",
        },
    }

    def __init__(self):
        logger.info("OfflineAssistant initialized")

    def respond(self, message: str) -> str:
        """
        Generate a deterministic response based on message keywords.

        Args:
            message: User input message

        Returns:
            Response string
        """
        message_lower = message.lower()

        best_match = None
        best_score = 0

        for topic, data in self.KNOWLEDGE_BASE.items():
            keywords = data["keywords"]
            score = sum(1 for kw in keywords if kw in message_lower)

            if score > best_score:
                best_score = score
                best_match = data["response"]

        if best_match:
            return best_match

        return (
            "I'm running in offline mode (Ollama not configured or no models installed).\n\n"
            "To enable AI features, install an Ollama model:\n"
            "1. Install Ollama: https://ollama.ai\n"
            "2. Run: ollama pull llama3\n"
            "3. Restart this application\n\n"
            "I can still help with:\n"
            "• Vina scoring and binding affinity\n"
            "• GNINA CNN deep learning scores\n"
            "• Random Forest scoring\n"
            "• Consensus scoring methods\n"
            "• Hydrogen bonds and hydrophobic interactions\n"
            "• RMSD and pose comparison\n"
            "• Binding pocket analysis\n"
            "• Grid and exhaustiveness parameters\n\n"
            "Ask me about any of these topics!"
        )

    def get_available_topics(self) -> List[str]:
        """Return list of available topics"""
        return list(self.KNOWLEDGE_BASE.keys())


if __name__ == "__main__":
    assistant = OfflineAssistant()

    test_messages = [
        "What is Vina?",
        "How does GNINA work?",
        "What is consensus scoring?",
        "Tell me about hydrogen bonds",
    ]

    for msg in test_messages:
        print(f"Q: {msg}")
        print(f"A: {assistant.respond(msg)}\n")
