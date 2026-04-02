"""
Constraint handling for docking: H-bonds, positional, metal coordination
"""
from typing import List, Dict, Optional, Tuple
from rdkit import Chem
import numpy as np
import logging

logger = logging.getLogger(__name__)


class DockingConstraint:
    """Base class for docking constraints"""
    def __init__(self, weight: float = 1.0):
        self.weight = weight

    def evaluate(self, ligand_mol: Chem.Mol, receptor_pdbqt: str) -> float:
        raise NotImplementedError


class HydrogenBondConstraint(DockingConstraint):
    """
    Enforce hydrogen bond between ligand donor/acceptor and receptor atom.
    """
    def __init__(
        self,
        ligand_atom_idx: int,
        receptor_atom_pattern: str,
        distance_cutoff: float = 3.5,
        angle_cutoff: float = 120.0,
        weight: float = 2.0,
        is_donor: bool = True
    ):
        super().__init__(weight)
        self.ligand_atom_idx = ligand_atom_idx
        self.receptor_pattern = receptor_atom_pattern
        self.distance_cutoff = distance_cutoff
        self.angle_cutoff = angle_cutoff
        self.is_donor = is_donor

    def evaluate(self, ligand_mol: Chem.Mol, receptor_pdbqt: str) -> float:
        try:
            conf = ligand_mol.GetConformer()
            lig_atom_pos = np.array(conf.GetAtomPosition(self.ligand_atom_idx))

            receptor_partners = self._find_receptor_partners(receptor_pdbqt)

            if not receptor_partners:
                return self.weight * 5.0

            min_penalty = float('inf')

            for partner in receptor_partners:
                partner_pos = np.array(partner['coords'])
                distance = np.linalg.norm(lig_atom_pos - partner_pos)

                if distance > self.distance_cutoff:
                    dist_penalty = (distance - self.distance_cutoff) ** 2
                else:
                    dist_penalty = 0.0

                total_penalty = dist_penalty
                min_penalty = min(min_penalty, total_penalty)

            return self.weight * min_penalty
        except Exception as e:
            logger.warning(f"H-bond constraint evaluation failed: {e}")
            return 0.0

    def _find_receptor_partners(self, receptor_pdbqt: str) -> List[Dict]:
        partners = []

        if ':' in self.receptor_pattern:
            resname, atom_name = self.receptor_pattern.split(':')
            resname = resname.strip().upper()
            atom_name = atom_name.strip().upper()

            for line in receptor_pdbqt.split('\n'):
                if line.startswith('ATOM') or line.startswith('HETATM'):
                    try:
                        line_resname = line[17:20].strip()
                        line_atom = line[12:16].strip()

                        if line_resname == resname and line_atom == atom_name:
                            x = float(line[30:38])
                            y = float(line[38:46])
                            z = float(line[46:54])
                            partners.append({
                                'resname': line_resname,
                                'atom_name': line_atom,
                                'coords': [x, y, z]
                            })
                    except (ValueError, IndexError):
                        continue

        return partners


class PositionalConstraint(DockingConstraint):
    """
    Restrain ligand atom(s) to stay within a spherical volume.
    """
    def __init__(
        self,
        ligand_atom_indices: List[int],
        center: Tuple[float, float, float],
        radius: float,
        weight: float = 1.5,
        soft_boundary: bool = True
    ):
        super().__init__(weight)
        self.atom_indices = ligand_atom_indices
        self.center = np.array(center)
        self.radius = radius
        self.soft_boundary = soft_boundary

    def evaluate(self, ligand_mol: Chem.Mol, receptor_pdbqt: str) -> float:
        try:
            conf = ligand_mol.GetConformer()
            total_penalty = 0.0

            for idx in self.atom_indices:
                pos = np.array(conf.GetAtomPosition(idx))
                distance = np.linalg.norm(pos - self.center)

                if self.soft_boundary:
                    if distance > self.radius:
                        total_penalty += (distance - self.radius) ** 2
                else:
                    if distance > self.radius:
                        return self.weight * 100.0

            return self.weight * total_penalty
        except Exception as e:
            logger.warning(f"Positional constraint evaluation failed: {e}")
            return 0.0


class MetalCoordinationConstraint(DockingConstraint):
    """
    Enforce proper geometry for metal-coordinating ligands.
    """
    GEOMETRIES = {
        'linear': {'angles': [180], 'tolerance': 30},
        'trigonal': {'angles': [120], 'tolerance': 20},
        'tetrahedral': {'angles': [109.5], 'tolerance': 15},
        'square_planar': {'angles': [90, 180], 'tolerance': 15},
        'octahedral': {'angles': [90, 180], 'tolerance': 15},
    }

    def __init__(
        self,
        metal_coords: Tuple[float, float, float],
        ligand_donor_indices: List[int],
        geometry: str = 'octahedral',
        distance_range: Tuple[float, float] = (1.8, 2.5),
        weight: float = 3.0
    ):
        super().__init__(weight)
        self.metal_pos = np.array(metal_coords)
        self.donor_indices = ligand_donor_indices
        self.geometry = geometry
        self.dist_min, self.dist_max = distance_range

    def evaluate(self, ligand_mol: Chem.Mol, receptor_pdbqt: str) -> float:
        try:
            conf = ligand_mol.GetConformer()
            penalty = 0.0

            for idx in self.donor_indices:
                donor_pos = np.array(conf.GetAtomPosition(idx))
                dist = np.linalg.norm(donor_pos - self.metal_pos)

                if dist < self.dist_min:
                    penalty += (self.dist_min - dist) ** 2
                elif dist > self.dist_max:
                    penalty += (dist - self.dist_max) ** 2

            if len(self.donor_indices) >= 2:
                geom_info = self.GEOMETRIES.get(self.geometry, self.GEOMETRIES['octahedral'])
                expected_angles = geom_info['angles']
                tolerance = geom_info['tolerance']

                for i in range(len(self.donor_indices)):
                    for j in range(i+1, len(self.donor_indices)):
                        pos_i = np.array(conf.GetAtomPosition(self.donor_indices[i]))
                        pos_j = np.array(conf.GetAtomPosition(self.donor_indices[j]))

                        vec_i = pos_i - self.metal_pos
                        vec_j = pos_j - self.metal_pos

                        dot = np.dot(vec_i, vec_j)
                        norm_i = np.linalg.norm(vec_i)
                        norm_j = np.linalg.norm(vec_j)

                        if norm_i * norm_j > 0:
                            cos_angle = dot / (norm_i * norm_j)
                            cos_angle = np.clip(cos_angle, -1.0, 1.0)
                            angle = np.degrees(np.arccos(cos_angle))

                            min_deviation = min(abs(angle - exp) for exp in expected_angles)
                            if min_deviation > tolerance:
                                penalty += (min_deviation - tolerance) ** 2

            return self.weight * penalty
        except Exception as e:
            logger.warning(f"Metal coordination constraint evaluation failed: {e}")
            return 0.0


def apply_constraints(
    results: List[Dict],
    ligand_mol,
    receptor_pdbqt_content: str,
    constraints: List[Dict]
) -> List[Dict]:
    """
    Apply constraint penalties to docking results and re-rank.
    """
    if not constraints or not ligand_mol or not receptor_pdbqt_content:
        return results

    constraint_objects = []

    for spec in constraints:
        ctype = spec.get('type', '')

        if ctype == 'hydrogen_bond':
            constraint_objects.append(HydrogenBondConstraint(
                ligand_atom_idx=spec.get('ligand_atom_idx', 0),
                receptor_atom_pattern=spec.get('receptor_pattern', ''),
                distance_cutoff=spec.get('distance_cutoff', 3.5),
                weight=spec.get('weight', 2.0),
                is_donor=spec.get('is_donor', True)
            ))
        elif ctype == 'positional':
            center = spec.get('center', [0, 0, 0])
            constraint_objects.append(PositionalConstraint(
                ligand_atom_indices=spec.get('atom_indices', []),
                center=(center[0], center[1], center[2]),
                radius=spec.get('radius', 2.0),
                weight=spec.get('weight', 1.5)
            ))
        elif ctype == 'metal_coordination':
            metal = spec.get('metal_coords', [0, 0, 0])
            constraint_objects.append(MetalCoordinationConstraint(
                metal_coords=(metal[0], metal[1], metal[2]),
                ligand_donor_indices=spec.get('donor_indices', []),
                geometry=spec.get('geometry', 'octahedral'),
                weight=spec.get('weight', 3.0)
            ))

    for pose in results:
        total_penalty = 0.0
        for constraint in constraint_objects:
            penalty = constraint.evaluate(ligand_mol, receptor_pdbqt_content)
            total_penalty += penalty

        pose['constraint_penalty'] = round(total_penalty, 4)

        base = pose.get('composite_score', pose.get('vina_score', 0))
        pose['final_score'] = round(base + total_penalty, 4)

    results.sort(key=lambda x: x.get('final_score', x.get('composite_score', x.get('vina_score', 0))))
    return results
