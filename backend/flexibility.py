"""
Side-chain flexibility module using RDKit + rotamer libraries
"""
from typing import Dict, List, Optional
from rdkit import Chem
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Common rotatable side-chain residues with chi angles
FLEXIBLE_RESIDUES = {
    'ARG': {'chi_angles': [0, 1, 2, 3], 'atoms': ['NH1', 'NH2', 'CZ', 'CD', 'CG', 'CB']},
    'LYS': {'chi_angles': [0, 1, 2, 3], 'atoms': ['NZ', 'CE', 'CD', 'CG', 'CB']},
    'GLU': {'chi_angles': [0, 1], 'atoms': ['OE1', 'OE2', 'CD', 'CG', 'CB']},
    'ASP': {'chi_angles': [0], 'atoms': ['OD1', 'OD2', 'CG', 'CB']},
    'PHE': {'chi_angles': [0, 1], 'atoms': ['CZ', 'CE1', 'CE2', 'CD1', 'CD2', 'CG', 'CB']},
    'TYR': {'chi_angles': [0, 1], 'atoms': ['OH', 'CZ', 'CE1', 'CE2', 'CD1', 'CD2', 'CG', 'CB']},
    'TRP': {'chi_angles': [0, 1], 'atoms': ['NE1', 'CE2', 'CD1', 'CD2', 'CG', 'CB']},
    'HIS': {'chi_angles': [0, 1], 'atoms': ['ND1', 'NE2', 'CE1', 'CD2', 'CG', 'CB']},
    'MET': {'chi_angles': [0, 1, 2], 'atoms': ['SD', 'CE', 'CG', 'CB']},
    'LEU': {'chi_angles': [0, 1], 'atoms': ['CD1', 'CD2', 'CG', 'CB']},
    'ILE': {'chi_angles': [0, 1], 'atoms': ['CD1', 'CG1', 'CG2', 'CB']},
    'VAL': {'chi_angles': [0], 'atoms': ['CG1', 'CG2', 'CB']},
    'SER': {'chi_angles': [0], 'atoms': ['OG', 'CB']},
    'THR': {'chi_angles': [0], 'atoms': ['OG1', 'CG2', 'CB']},
}

# Simplified rotamer library (Dunbrack-like)
ROTAMER_LIBRARY = {
    'ARG': [
        {'chi1': -60, 'chi2': -80, 'chi3': -60, 'chi4': -70},
        {'chi1': 180, 'chi2': -60, 'chi3': 80, 'chi4': 180},
        {'chi1': 60, 'chi2': 180, 'chi3': -60, 'chi4': -70},
    ],
    'LYS': [
        {'chi1': -60, 'chi2': 180, 'chi3': -60, 'chi4': 180},
        {'chi1': 180, 'chi2': -60, 'chi3': 180, 'chi4': -60},
        {'chi1': 60, 'chi2': 60, 'chi3': -60, 'chi4': 180},
    ],
    'GLU': [
        {'chi1': -60, 'chi2': -70},
        {'chi1': 180, 'chi2': 180},
        {'chi1': 60, 'chi2': 60},
    ],
    'ASP': [
        {'chi1': -60},
        {'chi1': 180},
        {'chi1': 60},
    ],
    'PHE': [
        {'chi1': -60, 'chi2': -70},
        {'chi1': 180, 'chi2': 90},
        {'chi1': 60, 'chi2': -70},
    ],
    'TYR': [
        {'chi1': -60, 'chi2': -70},
        {'chi1': 180, 'chi2': 90},
        {'chi1': 60, 'chi2': -70},
    ],
    'TRP': [
        {'chi1': -60, 'chi2': -70},
        {'chi1': 180, 'chi2': 90},
        {'chi1': 60, 'chi2': -70},
    ],
    'HIS': [
        {'chi1': -60, 'chi2': -70},
        {'chi1': 180, 'chi2': 90},
        {'chi1': 60, 'chi2': -70},
    ],
    'MET': [
        {'chi1': -60, 'chi2': 180, 'chi3': -60},
        {'chi1': 180, 'chi2': -60, 'chi3': 180},
        {'chi1': 60, 'chi2': 60, 'chi3': -60},
    ],
    'LEU': [
        {'chi1': -60, 'chi2': 180},
        {'chi1': 180, 'chi2': -60},
        {'chi1': 60, 'chi2': 60},
    ],
    'ILE': [
        {'chi1': -60, 'chi2': 180},
        {'chi1': 180, 'chi2': -60},
        {'chi1': 60, 'chi2': 60},
    ],
    'VAL': [
        {'chi1': -60},
        {'chi1': 180},
        {'chi1': 60},
    ],
    'SER': [
        {'chi1': -60},
        {'chi1': 180},
        {'chi1': 60},
    ],
    'THR': [
        {'chi1': -60},
        {'chi1': 180},
        {'chi1': 60},
    ],
}


def identify_flexible_residues(receptor_pdb: str, ligand_coords: np.ndarray, cutoff: float = 6.0) -> List[Dict]:
    """
    Identify receptor residues within cutoff of ligand for flexibility treatment.
    """
    flexible = []

    for line in receptor_pdb.split('\n'):
        if line.startswith('ATOM') or line.startswith('HETATM'):
            try:
                resname = line[17:20].strip()
                resseq = int(line[22:26])
                chain = line[21].strip() or 'A'
                atom_name = line[12:16].strip()
                x, y, z = float(line[30:38]), float(line[38:46]), float(line[46:54])

                if resname in FLEXIBLE_RESIDUES:
                    for lig_pos in ligand_coords:
                        dist = np.sqrt((x - lig_pos[0]) ** 2 + (y - lig_pos[1]) ** 2 + (z - lig_pos[2]) ** 2)
                        if dist < cutoff:
                            flexible.append({
                                'resname': resname,
                                'resseq': resseq,
                                'chain': chain,
                                'atom_name': atom_name,
                                'coords': np.array([x, y, z]),
                                'chi_angles': FLEXIBLE_RESIDUES[resname]['chi_angles']
                            })
                            break
            except (ValueError, IndexError):
                continue

    unique_residues = {}
    for res in flexible:
        key = (res['chain'], res['resseq'], res['resname'])
        if key not in unique_residues:
            unique_residues[key] = {
                'resname': res['resname'],
                'resseq': res['resseq'],
                'chain': res['chain'],
                'chi_angles': res['chi_angles'],
                'nearby_atoms': []
            }
        unique_residues[key]['nearby_atoms'].append(res)

    return list(unique_residues.values())


def apply_rotamer(
    receptor_mol: Chem.Mol,
    residue_info: Dict,
    rotamer: Dict
) -> Optional[Chem.Mol]:
    """
    Apply a specific rotamer conformation to a flexible residue.
    Returns modified molecule or None if failed.
    """
    try:
        from rdkit.Chem import rdMolTransforms

        mol_copy = Chem.Mol(receptor_mol)
        conf = mol_copy.GetConformer()

        resseq = residue_info['resseq']
        chain = residue_info['chain']
        chi_angles = residue_info.get('chi_angles', [])

        if not chi_angles:
            return mol_copy

        chi_keys = ['chi1', 'chi2', 'chi3', 'chi4']

        for i, chi_idx in enumerate(chi_angles):
            if i >= len(chi_keys):
                break
            angle = rotamer.get(chi_keys[i], 0)

            res_atoms = [
                atom.GetIdx() for atom in mol_copy.GetAtoms()
                if atom.GetPDBResidueInfo() and
                atom.GetPDBResidueInfo().GetResidueNumber() == resseq and
                atom.GetPDBResidueInfo().GetChainId() == chain
            ]

            if len(res_atoms) >= 2:
                try:
                    atom_ids = res_atoms[:4]
                    while len(atom_ids) < 4:
                        atom_ids.append(res_atoms[-1])
                    rdMolTransforms.SetDihedralDeg(
                        conf,
                        atom_ids[0], atom_ids[1], atom_ids[2], atom_ids[3],
                        angle
                    )
                except Exception:
                    pass

        return mol_copy
    except Exception as e:
        logger.warning(f"Rotamer application failed: {e}")
        return None


def generate_flexible_receptor_ensemble(
    receptor_pdb: str,
    ligand_mol: Chem.Mol,
    n_rotamers_per_res: int = 3,
    max_combinations: int = 27
) -> List[str]:
    """
    Generate ensemble of receptor conformations with flexible side-chains.
    Returns list of PDB strings for each conformation.
    """
    import itertools

    receptor_mol = Chem.MolFromPDBBlock(receptor_pdb, removeHs=False)
    if not receptor_mol:
        return [receptor_pdb]

    try:
        ligand_coords = np.array([
            list(ligand_mol.GetConformer().GetAtomPosition(i))
            for i in range(ligand_mol.GetNumAtoms())
        ])
    except Exception:
        return [receptor_pdb]

    flexible_residues = identify_flexible_residues(receptor_pdb, ligand_coords)

    if not flexible_residues:
        return [receptor_pdb]

    flexible_residues = flexible_residues[:3]

    conformations = []

    for res in flexible_residues:
        resname = res['resname']
        available = ROTAMER_LIBRARY.get(resname, [{}])
        res['rotamers'] = available[:n_rotamers_per_res]

    rotamer_choices = [res['rotamers'] for res in flexible_residues]

    for combo in itertools.product(*rotamer_choices):
        if len(conformations) >= max_combinations:
            break

        mol_copy = Chem.Mol(receptor_mol)
        success = True

        for res_info, rotamer in zip(flexible_residues, combo):
            modified = apply_rotamer(mol_copy, res_info, rotamer)
            if modified:
                mol_copy = modified
            else:
                success = False
                break

        if success:
            try:
                pdb_block = Chem.MolToPDBBlock(mol_copy)
                if pdb_block:
                    conformations.append(pdb_block)
            except Exception:
                pass

    return conformations if conformations else [receptor_pdb]
