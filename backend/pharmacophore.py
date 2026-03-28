"""
Pharmacophore Modeling Engine - RDKit-based pharmacophore detection and analysis
Discovery Studio-like functionality for drug discovery
"""
import os
import logging
import tempfile
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
import json

logger = logging.getLogger(__name__)

# Feature types with colors for visualization
FEATURE_COLORS = {
    'Donor': '#4169E1',      # Blue
    'Acceptor': '#DC143C',    # Red  
    'Hydrophobic': '#FFD700', # Gold/Yellow
    'Aromatic': '#9932CC',    # Purple
    'PosIonizable': '#32CD32', # Green
    'NegIonizable': '#FF8C00', # Orange
    'LumpedHydrophobic': '#DAA520', # Goldenrod
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
    """Represents a single pharmacophore feature"""
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
    """
    RDKit-based pharmacophore engine for molecular feature detection.
    Supports Discovery Studio-like pharmacophore modeling.
    """
    
    def __init__(self):
        self.feature_factory = None
        self._init_feature_factory()
    
    def _init_feature_factory(self):
        """Initialize RDKit feature factory"""
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
        """Create a custom feature factory with essential pharmacophore features"""
        try:
            from rdkit.Chem import ChemicalFeatures
            from rdkit.Chem.FeatMaps import FeatMapParser
            
            # Use built-in feature definitions
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
        """
        Generate pharmacophore from SMILES string.
        
        Args:
            smiles: SMILES string of the molecule
            add_hs: Whether to add hydrogens
            
        Returns:
            Dictionary with pharmacophore features and 3D coordinates
        """
        try:
            from rdkit import Chem
            from rdkit.Chem import AllChem
            
            # Parse SMILES
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                return {'success': False, 'error': 'Invalid SMILES', 'features': []}
            
            # Add hydrogens for proper feature detection
            if add_hs:
                mol = Chem.AddHs(mol)
            
            # Generate 3D conformation
            AllChem.EmbedMolecule(mol, randomSeed=42)
            AllChem.MMFFOptimizeMolecule(mol)
            
            # Extract features
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
        """
        Generate pharmacophore from PDB content.
        
        Args:
            pdb_content: PDB file content or path
            
        Returns:
            Dictionary with pharmacophore features
        """
        try:
            from rdkit import Chem
            from rdkit.Chem import AllChem
            
            # Parse PDB
            if os.path.exists(pdb_content):
                mol = Chem.MolFromPDBFile(pdb_content)
            else:
                mol = Chem.MolFromPDBBlock(pdb_content)
            
            if mol is None:
                return {'success': False, 'error': 'Invalid PDB', 'features': []}
            
            # Add hydrogens
            if add_hs:
                mol = Chem.AddHs(mol)
            
            # Generate/conform existing 3D coords
            try:
                AllChem.EmbedMolecule(mol, randomSeed=42)
                AllChem.MMFFOptimizeMolecule(mol)
            except:
                pass  # Use existing coordinates
            
            # Extract features
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
    
    def generate_from_sdf(self, sdf_content: str) -> Dict[str, Any]:
        """
        Generate pharmacophore from SDF content.
        """
        try:
            from rdkit import Chem
            from rdkit.Chem import AllChem
            from io import StringIO
            
            # Parse SDF
            supplier = Chem.SDMolSupplier()
            supplier.SetData(sdf_content)
            mols = list(supplier)
            
            if not mols:
                return {'success': False, 'error': 'No molecules in SDF', 'features': []}
            
            mol = mols[0]
            mol = Chem.AddHs(mol)
            
            # Generate 3D if needed
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
            logger.error(f"Error generating pharmacophore from SDF: {e}")
            return {'success': False, 'error': str(e), 'features': []}
    
    def _extract_features(self, mol) -> List[PharmacophoreFeature]:
        """Extract pharmacophore features from a molecule"""
        features = []
        
        if self.feature_factory is None:
            logger.warning("No feature factory available")
            return features
        
        try:
            # Get features from factory
            feat_instances = self.feature_factory.GetFeaturesForMol(mol)
            
            for feat in feat_instances:
                feat_type = feat.GetFamily()
                feat_class = feat.GetType()
                pos = feat.GetPos()
                atom_ids = feat.GetAtomIds()
                
                # Create pharmacophore feature
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
        """Create summary of feature counts by type"""
        summary = {}
        for feat in features:
            family = feat.feature_family
            summary[family] = summary.get(family, 0) + 1
        return summary
    
    def screen_library(self, library_smiles: List[str], 
                      min_features: int = 3,
                      required_features: List[str] = None) -> Dict[str, Any]:
        """
        Screen a library of compounds against a pharmacophore model.
        
        Args:
            library_smiles: List of SMILES strings to screen
            min_features: Minimum number of features to match
            required_features: List of required feature types
            
        Returns:
            Screening results with match scores
        """
        results = []
        
        for idx, smiles in enumerate(library_smiles):
            try:
                result = self.generate_from_smiles(smiles)
                if result['success']:
                    features = result['features']
                    matched = len(features)
                    
                    # Check required features
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
            'hits': hits[:100]  # Return top 100 hits
        }
    
    def align_to_pharmacophore(self, ref_features: List[Dict],
                             mobile_smiles: str) -> Dict[str, Any]:
        """
        Align a molecule to a reference pharmacophore.
        
        Args:
            ref_features: Reference pharmacophore features
            mobile_smiles: SMILES of molecule to align
            
        Returns:
            Alignment results with RMSD and scores
        """
        try:
            from rdkit import Chem
            from rdkit.Chem import AllChem
            from rdkit.Chem.FeatMaps import FeatMapParser, FeatMap
            
            # Generate pharmacophore for mobile
            mobile_result = self.generate_from_smiles(mobile_smiles)
            if not mobile_result['success']:
                return {'success': False, 'error': mobile_result.get('error', 'Failed to process molecule')}
            
            mobile_features = mobile_result['features']
            
            # Calculate feature matching score
            ref_families = set(f['family'] for f in ref_features)
            mobile_families = set(f['family'] for f in mobile_features)
            
            # Jaccard similarity of feature sets
            intersection = len(ref_families & mobile_families)
            union = len(ref_families | mobile_families)
            jaccard = intersection / union if union > 0 else 0
            
            # Calculate RMSD of feature positions
            rmsd = self._calculate_rmsd(ref_features, mobile_features)
            
            return {
                'success': True,
                'mobile_smiles': mobile_smiles,
                'mobile_features': mobile_features,
                'jaccard_similarity': jaccard,
                'rmsd': rmsd,
                'num_features_matched': intersection,
                'score': (jaccard + (1 - min(rmsd, 10) / 10)) / 2  # Combined score
            }
            
        except Exception as e:
            logger.error(f"Error aligning molecule: {e}")
            return {'success': False, 'error': str(e)}
    
    def _calculate_rmsd(self, features1: List[Dict], features2: List[Dict]) -> float:
        """Calculate RMSD between two sets of features"""
        import math
        
        if not features1 or not features2:
            return 999.0
        
        # Simple centroid-based RMSD approximation
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
    
    def get_pharmacophore_3d_data(self, features: List[Dict]) -> List[Dict]:
        """
        Get 3D visualization data for the pharmacophore.
        Returns spheres data for 3Dmol.js or similar viewer.
        """
        spheres = []
        
        for feat in features:
            spheres.append({
                'center': feat['position'],
                'radius': feat['radius'],
                'color': feat['color'],
                'type': feat['family'],
                'alpha': 0.5
            })
        
        return spheres


# Singleton instance
_engine = None

def get_engine() -> PharmacophoreEngine:
    """Get singleton pharmacophore engine instance"""
    global _engine
    if _engine is None:
        _engine = PharmacophoreEngine()
    return _engine


def generate_pharmacophore(smiles: str = None, pdb: str = None) -> Dict[str, Any]:
    """Convenience function to generate pharmacophore"""
    engine = get_engine()
    if smiles:
        return engine.generate_from_smiles(smiles)
    elif pdb:
        return engine.generate_from_pdb(pdb)
    else:
        return {'success': False, 'error': 'No input provided'}


if __name__ == "__main__":
    # Test
    engine = PharmacophoreEngine()
    
    # Test with aspirin
    result = engine.generate_from_smiles("CC(=O)OC1=CC=CC=C1C(=O)O")
    print(f"Pharmacophore generated: {result['num_features']} features")
    print(f"Summary: {result['feature_summary']}")
