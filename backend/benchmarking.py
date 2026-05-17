"""
Benchmarking utilities for docking validation against PDBbind/DUD-E
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
import numpy as np
from rdkit import Chem
from rdkit.Chem import rdMolAlign, AllChem

logger = logging.getLogger(__name__)


def calculate_pose_rmsd(
    predicted_pdbqt: str,
    reference_pdbqt: str,
) -> float:
    """
    Calculate RMSD between predicted and reference ligand poses.
    """
    try:
        pred_mol = Chem.MolFromPDBBlock(predicted_pdbqt, removeHs=False)
        ref_mol = Chem.MolFromPDBBlock(reference_pdbqt, removeHs=False)

        if not pred_mol or not ref_mol:
            return float('inf')

        if pred_mol.GetNumAtoms() != ref_mol.GetNumAtoms():
            from rdkit.Chem import rdFMCS
            mcs = rdFMCS.FindMCS([pred_mol, ref_mol], atomCompare=rdFMCS.AtomCompare.CompareAny)
            if not mcs.numAtoms:
                return float('inf')

        if pred_mol.GetNumConformers() == 0:
            AllChem.EmbedMolecule(pred_mol, randomSeed=42)
        if ref_mol.GetNumConformers() == 0:
            AllChem.EmbedMolecule(ref_mol, randomSeed=42)

        rmsd = rdMolAlign.CalcRMS(ref_mol, pred_mol)
        return float(rmsd)

    except Exception as e:
        logger.error(f"RMSD calculation failed: {e}")
        return float('inf')


def calculate_enrichment_metrics(
    scores: List[float],
    labels: List[int],
    top_percentiles: List[float] = [0.01, 0.05, 0.10]
) -> Dict[str, float]:
    """
    Calculate virtual screening enrichment metrics.
    """
    n_actives = sum(labels)
    n_total = len(labels)

    if n_actives == 0 or n_total == 0:
        return {"error": "Invalid input data"}

    metrics = {}

    try:
        from sklearn.metrics import roc_auc_score
        scores_inverted = [-s for s in scores]
        metrics['auc_roc'] = float(roc_auc_score(labels, scores_inverted))
    except Exception:
        metrics['auc_roc'] = None

    for pct in top_percentiles:
        n_top = max(1, int(n_total * pct))
        top_indices = np.argsort(scores)[:n_top]
        actives_in_top = sum(labels[i] for i in top_indices)

        ef = (actives_in_top / n_top) / (n_actives / n_total) if n_top > 0 else 0
        metrics[f'ef_{int(pct*100)}'] = float(ef)

    alpha = 20.0
    bedroc = _calculate_bedroc_simple(scores, labels, alpha)
    metrics['bedroc_alpha20'] = float(bedroc)

    return metrics


def _calculate_bedroc_simple(
    scores: List[float],
    labels: List[int],
    alpha: float = 20.0
) -> float:
    """Simplified BEDROC calculation"""
    n_actives = sum(labels)
    n_total = len(labels)

    if n_actives == 0:
        return 0.0

    sorted_indices = np.argsort(scores)
    sorted_labels = np.array(labels)[sorted_indices]

    r_i = np.arange(1, n_total + 1)
    active_ranks = r_i[sorted_labels == 1]

    if len(active_ranks) == 0:
        return 0.0

    weights = np.exp(-alpha * active_ranks / n_total)
    bedroc = np.sum(weights) / np.sum(np.exp(-alpha * np.arange(1, n_actives + 1) / n_total))

    bedroc = (bedroc - np.exp(-alpha)) / (1 - np.exp(-alpha))

    return max(0.0, min(1.0, bedroc))


def run_pdbbind_benchmark(
    pdbbind_dir: str,
    output_file: str,
    docking_params: Dict
) -> Dict:
    """
    Run docking on PDBbind core set and generate benchmark report.
    """
    from docking_engine import smart_dock

    results = {
        'total_complexes': 0,
        'successful_dockings': 0,
        'rmsd_values': [],
        'scores': [],
        'reference_scores': [],
        'errors': []
    }

    index_file = Path(pdbbind_dir) / "INDEX_core_data.2020"
    if not index_file.exists():
        raise FileNotFoundError(f"PDBbind index not found: {index_file}")

    complexes = []
    with open(index_file) as f:
        for line in f:
            if line.startswith('#') or not line.strip():
                continue
            parts = line.strip().split()
            if len(parts) >= 9:
                pdb_id = parts[0]
                affinity = float(parts[3])
                complexes.append({'pdb_id': pdb_id, 'affinity': affinity})

    logger.info(f"Found {len(complexes)} complexes in PDBbind core set")

    for complex_info in complexes:
        pdb_id = complex_info['pdb_id']
        complex_dir = Path(pdbbind_dir) / pdb_id

        if not complex_dir.exists():
            results['errors'].append(f"{pdb_id}: directory not found")
            continue

        protein_file = complex_dir / f"{pdb_id}_protein.pdb"
        ligand_file = complex_dir / f"{pdb_id}_ligand.pdb"
        reference_file = complex_dir / f"{pdb_id}_ligand_minimized.pdb"

        if not all(f.exists() for f in [protein_file, ligand_file, reference_file]):
            results['errors'].append(f"{pdb_id}: missing files")
            continue

        try:
            with open(protein_file) as f:
                receptor_content = f.read()
            with open(ligand_file) as f:
                ligand_content = f.read()
            with open(reference_file) as f:
                reference_content = f.read()

            docking_result = smart_dock(
                receptor_content=receptor_content,
                ligand_content=ligand_content,
                input_format='pdb',
                output_dir=str(complex_dir / 'docking_output'),
                **docking_params
            )

            if not docking_result.get('success'):
                results['errors'].append(f"{pdb_id}: docking failed - {docking_result.get('error')}")
                continue

            results['successful_dockings'] += 1

            if docking_result.get('results'):
                best_pose = docking_result['results'][0]

                predicted_pdbqt = best_pose.get('pdbqt_content', '')
                if predicted_pdbqt:
                    rmsd = calculate_pose_rmsd(predicted_pdbqt, reference_content)
                    results['rmsd_values'].append(rmsd)
                    results['scores'].append(best_pose.get('vina_score', 0))
                    results['reference_scores'].append(complex_info['affinity'])

            results['total_complexes'] += 1

        except Exception as e:
            results['errors'].append(f"{pdb_id}: exception - {str(e)}")
            logger.error(f"Benchmark error for {pdb_id}: {e}")

    if results['rmsd_values']:
        rmsd_array = np.array(results['rmsd_values'])
        results['rmsd_summary'] = {
            'mean': float(np.mean(rmsd_array)),
            'median': float(np.median(rmsd_array)),
            'std': float(np.std(rmsd_array)),
            'success_rate_2A': float(np.mean(rmsd_array <= 2.0)),
            'success_rate_3A': float(np.mean(rmsd_array <= 3.0))
        }

    if results['scores'] and results['reference_scores']:
        affinity_array = np.array(results['reference_scores'])
        threshold = np.percentile(affinity_array, 90)
        labels = (affinity_array >= threshold).astype(int)

        enrichment = calculate_enrichment_metrics(results['scores'], labels)
        results['enrichment_metrics'] = enrichment

    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    logger.info(f"Benchmark report saved to {output_file}")
    return results
