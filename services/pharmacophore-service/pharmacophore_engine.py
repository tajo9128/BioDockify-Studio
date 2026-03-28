"""
Pharmacophore Engine - RDKit-based pharmacophore detection and analysis
"""
import os
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

FEATURE_COLORS = {
    'Donor': '#4169E1',
    'Acceptor': '#DC143C',
    'Hydrophobic': '#FFD700',
    'Aromatic': '#9932CC',
    'PosIonizable': '#32CD32',
    'NegIonizable': '#FF8C00',
    'LumpedHydrophobic': '#DAA520',
}

FEATURE_RADII = {
    'Donor': 1.5,
    'Acceptor': 1.5,
    'Hydrophobic': 1.8,
    'Aromatic': 2.0,
    'PosIonizable': 1.5,
    'NegIonizable': 1.5,
    'LumpedHydrophobic': 1.6,
}

@dataclass
class PharmacophoreFeature:
    feature_type: str
    feature_family: str
    position: Tuple[float, float, float]
    atoms: List[int]
    smarts: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            'type': self.feature_type,
            'family': self.feature_family,
            'position': {'x': self.position[0], 'y': self.position[1], 'z': self.position[2]},
            'atoms': self.atoms,
            'smarts': self.smarts,
            'color': FEATURE_COLORS.get(self.feature_family, '#888888'),
            'radius': FEATURE_RADII.get(self.feature_family, 1.5)
        }


class PharmacophoreEngine:
    def __init__(self):
        self.feature_factory = None
        self._init_feature_factory()

    def _init_feature_factory(self):
        try:
            from rdkit import RDConfig
            from rdkit.Chem import ChemicalFeatures
            fdef_path = os.path.join(RDConfig.RDDataDir, 'BaseFeatures.fdef')
            if os.path.exists(fdef_path):
                self.feature_factory = ChemicalFeatures.BuildFeatureFactory(fdef_path)
                logger.info(f"Feature factory loaded from {fdef_path}")
            else:
                self.feature_factory = self._create_custom_feature_factory()
        except Exception as e:
            logger.warning(f"Could not load default feature factory: {e}")
            self.feature_factory = self._create_custom_feature_factory()

    def _create_custom_feature_factory(self):
        try:
            from rdkit.Chem import ChemicalFeatures
            from rdkit import RDConfig
            fdef_path = os.path.join(RDConfig.RDDataDir, 'MinimalFeatureDef.fdef')
            if os.path.exists(fdef_path):
                factory = ChemicalFeatures.BuildFeatureFactory(fdef_path)
                logger.info("Using MinimalFeatureDef.fdef")
                return factory
            logger.warning("Could not create feature factory")
            return None
        except Exception as e:
            logger.error(f"Error creating feature factory: {e}")
            return None

    def generate_from_smiles(self, smiles: str, add_hs: bool = True) -> Dict[str, Any]:
        try:
            from rdkit import Chem
            from rdkit.Chem import AllChem

            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                return {'success': False, 'error': 'Invalid SMILES', 'features': []}

            if add_hs:
                mol = Chem.AddHs(mol)

            AllChem.EmbedMolecule(mol, randomSeed=42)
            AllChem.MMFFOptimizeMolecule(mol)

            features = self._extract_features(mol)

            return {
                'success': True,
                'smiles': smiles,
                'features': [f.to_dict() for f in features],
                'num_features': len(features),
                'feature_summary': self._summarize_features(features)
            }

        except Exception as e:
            logger.error(f"Error generating pharmacophore from SMILES: {e}")
            return {'success': False, 'error': str(e), 'features': []}

    def generate_from_pdb(self, pdb_content: str, add_hs: bool = True) -> Dict[str, Any]:
        try:
            from rdkit import Chem
            from rdkit.Chem import AllChem

            if os.path.exists(pdb_content):
                mol = Chem.MolFromPDBFile(pdb_content)
            else:
                mol = Chem.MolFromPDBBlock(pdb_content)

            if mol is None:
                return {'success': False, 'error': 'Invalid PDB', 'features': []}

            if add_hs:
                mol = Chem.AddHs(mol)

            try:
                AllChem.EmbedMolecule(mol, randomSeed=42)
                AllChem.MMFFOptimizeMolecule(mol)
            except:
                pass

            features = self._extract_features(mol)

            return {
                'success': True,
                'features': [f.to_dict() for f in features],
                'num_features': len(features),
                'feature_summary': self._summarize_features(features)
            }

        except Exception as e:
            logger.error(f"Error generating pharmacophore from PDB: {e}")
            return {'success': False, 'error': str(e), 'features': []}

    def _extract_features(self, mol) -> List[PharmacophoreFeature]:
        features = []

        if self.feature_factory is None:
            logger.warning("No feature factory available")
            return features

        try:
            feat_instances = self.feature_factory.GetFeaturesForMol(mol)

            for feat in feat_instances:
                feat_type = feat.GetFamily()
                feat_class = feat.GetType()
                pos = feat.GetPos()
                atom_ids = feat.GetAtomIds()

                pharmacophore_feat = PharmacophoreFeature(
                    feature_type=feat_class,
                    feature_family=feat_type,
                    position=(pos.x, pos.y, pos.z),
                    atoms=list(atom_ids)
                )
                features.append(pharmacophore_feat)

        except Exception as e:
            logger.error(f"Error extracting features: {e}")

        return features

    def _summarize_features(self, features: List[PharmacophoreFeature]) -> Dict[str, int]:
        summary = {}
        for feat in features:
            family = feat.feature_family
            summary[family] = summary.get(family, 0) + 1
        return summary

    def screen_library(self, library_smiles: List[str],
                      min_features: int = 3,
                      required_features: List[str] = None) -> Dict[str, Any]:
        results = []

        for idx, smiles in enumerate(library_smiles):
            try:
                result = self.generate_from_smiles(smiles)
                if result['success']:
                    features = result['features']
                    matched = len(features)

                    feature_families = [f['family'] for f in features]
                    required_met = True
                    if required_features:
                        for req in required_features:
                            if req not in feature_families:
                                required_met = False
                                break

                    if matched >= min_features and required_met:
                        results.append({
                            'idx': idx,
                            'smiles': smiles,
                            'num_features': matched,
                            'features': features,
                            'matched': True
                        })
                    else:
                        results.append({
                            'idx': idx,
                            'smiles': smiles,
                            'num_features': matched,
                            'matched': False
                        })
            except Exception as e:
                results.append({
                    'idx': idx,
                    'smiles': smiles,
                    'error': str(e),
                    'matched': False
                })

        hits = [r for r in results if r.get('matched', False)]

        return {
            'success': True,
            'total_screened': len(library_smiles),
            'total_hits': len(hits),
            'hit_rate': len(hits) / len(library_smiles) if library_smiles else 0,
            'results': results,
            'hits': hits[:100]
        }

    def align_to_pharmacophore(self, ref_features: List[Dict],
                             mobile_smiles: str) -> Dict[str, Any]:
        try:
            from rdkit import Chem
            from rdkit.Chem import AllChem

            mobile_result = self.generate_from_smiles(mobile_smiles)
            if not mobile_result['success']:
                return {'success': False, 'error': mobile_result.get('error', 'Failed to process molecule')}

            mobile_features = mobile_result['features']

            ref_families = set(f['family'] for f in ref_features)
            mobile_families = set(f['family'] for f in mobile_features)

            intersection = len(ref_families & mobile_families)
            union = len(ref_families | mobile_families)
            jaccard = intersection / union if union > 0 else 0

            rmsd = self._calculate_rmsd(ref_features, mobile_features)

            return {
                'success': True,
                'mobile_smiles': mobile_smiles,
                'mobile_features': mobile_features,
                'jaccard_similarity': jaccard,
                'rmsd': rmsd,
                'num_features_matched': intersection,
                'score': (jaccard + (1 - min(rmsd, 10) / 10)) / 2
            }

        except Exception as e:
            logger.error(f"Error aligning molecule: {e}")
            return {'success': False, 'error': str(e)}

    def _calculate_rmsd(self, features1: List[Dict], features2: List[Dict]) -> float:
        import math

        if not features1 or not features2:
            return 999.0

        def centroid(features):
            n = len(features)
            if n == 0:
                return (0, 0, 0)
            cx = sum(f['position']['x'] for f in features) / n
            cy = sum(f['position']['y'] for f in features) / n
            cz = sum(f['position']['z'] for f in features) / n
            return (cx, cy, cz)

        c1 = centroid(features1)
        c2 = centroid(features2)

        dx = c1[0] - c2[0]
        dy = c1[1] - c2[1]
        dz = c1[2] - c2[2]

        return math.sqrt(dx*dx + dy*dy + dz*dz)


if __name__ == "__main__":
    engine = PharmacophoreEngine()
    result = engine.generate_from_smiles("CC(=O)OC1=CC=CC=C1C(=O)O")
    print(f"Pharmacophore generated: {result['num_features']} features")
    print(f"Summary: {result['feature_summary']}")
