"""
Scientific Knowledge Graph for BioDockify using Memgraph
Integrates target, compound, pathway, and literature data for context-aware AI reasoning.
Uses Memgraph (open-source graph database) via gqlalchemy for persistent, queryable knowledge.
"""

import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

try:
    from gqlalchemy import Memgraph, Node, Relationship, match
    HAS_MEMGRAPH = True
except ImportError:
    HAS_MEMGRAPH = False


class BioKnowledgeGraph:
    """
    Knowledge graph connecting targets, compounds, pathways, diseases, and experiments.
    Uses Memgraph for persistent, Cypher-queryable graph storage.
    Falls back to in-memory dict if Memgraph is unavailable.
    """

    def __init__(self, host: str = "localhost", port: int = 7687):
        self.host = host
        self.port = port
        self.memgraph = None
        self._fallback: Dict[str, Dict[str, Any]] = {}

        if HAS_MEMGRAPH:
            try:
                self.memgraph = Memgraph(host=host, port=port)
                self.memgraph.ensure_indexes([])
                self._seed_initial_data()
                logger.info(f"Connected to Memgraph at {host}:{port}")
            except Exception as e:
                logger.warning(f"Memgraph unavailable ({e}), using in-memory fallback")
                self.memgraph = None
                self._seed_fallback()
        else:
            logger.warning("gqlalchemy not installed, using in-memory fallback")
            self._seed_fallback()

    # ---- Memgraph queries ----

    def _execute(self, query: str, params: dict = None) -> Any:
        """Execute a Cypher query on Memgraph."""
        if self.memgraph:
            return self.memgraph.execute_and_fetch(query, params or {})
        return []

    def _seed_initial_data(self):
        """Seed graph with common target families and pathways."""
        if not self.memgraph:
            return

        families = [
            ("kinase", "Protein kinases - ATP-binding enzymes"),
            ("gpcr", "G-protein coupled receptors"),
            ("protease", "Proteolytic enzymes"),
            ("nuclear_receptor", "Nuclear hormone receptors"),
            ("ion_channel", "Transmembrane ion channels"),
        ]
        for name, desc in families:
            self._execute(
                "MERGE (f:Family {name: $name}) SET f.description = $desc",
                {"name": name, "desc": desc},
            )

        pathways = [
            ("mapk", "MAPK signaling pathway"),
            ("pi3k_akt", "PI3K-Akt signaling pathway"),
            ("apoptosis", "Apoptosis pathway"),
            ("cell_cycle", "Cell cycle regulation"),
        ]
        for name, desc in pathways:
            self._execute(
                "MERGE (p:Pathway {name: $name}) SET p.description = $desc",
                {"name": name, "desc": desc},
            )

        # Link families to pathways
        links = [
            ("kinase", "mapk"), ("kinase", "pi3k_akt"), ("kinase", "cell_cycle"),
            ("gpcr", "mapk"), ("gpcr", "pi3k_akt"),
            ("protease", "apoptosis"),
        ]
        for family, pathway in links:
            self._execute(
                "MATCH (f:Family {name: $f}), (p:Pathway {name: $p}) "
                "MERGE (f)-[:INVOLVED_IN]->(p)",
                {"f": family, "p": pathway},
            )

    def _seed_fallback(self):
        """Seed in-memory fallback graph."""
        self._fallback = {
            "families": {
                "kinase": {"description": "Protein kinases - ATP-binding enzymes", "pathways": ["mapk", "pi3k_akt", "cell_cycle"]},
                "gpcr": {"description": "G-protein coupled receptors", "pathways": ["mapk", "pi3k_akt"]},
                "protease": {"description": "Proteolytic enzymes", "pathways": ["apoptosis"]},
                "nuclear_receptor": {"description": "Nuclear hormone receptors", "pathways": []},
                "ion_channel": {"description": "Transmembrane ion channels", "pathways": []},
            },
            "pathways": {
                "mapk": {"description": "MAPK signaling pathway"},
                "pi3k_akt": {"description": "PI3K-Akt signaling pathway"},
                "apoptosis": {"description": "Apoptosis pathway"},
                "cell_cycle": {"description": "Cell cycle regulation"},
            },
            "targets": {},
            "compounds": {},
            "experiments": {},
        }

    # ---- Node management ----

    def add_target(self, uniprot_id: str, name: str, family: str = None,
                   pdb_ids: List[str] = None, description: str = None):
        """Add a protein target to the graph."""
        if self.memgraph:
            self._execute(
                "MERGE (t:Target {uniprot_id: $id}) "
                "SET t.name = $name, t.family = $family, t.pdb_ids = $pdb, t.description = $desc",
                {"id": uniprot_id, "name": name, "family": family, "pdb": json.dumps(pdb_ids or []), "desc": description or ""},
            )
            if family:
                self._execute(
                    "MATCH (t:Target {uniprot_id: $id}), (f:Family {name: $family}) "
                    "MERGE (t)-[:BELONGS_TO]->(f)",
                    {"id": uniprot_id, "family": family},
                )
        else:
            self._fallback["targets"][uniprot_id] = {
                "name": name, "family": family, "pdb_ids": pdb_ids or [], "description": description or "",
            }

    def add_compound(self, smiles: str, name: str = None, cid: int = None,
                     activity_data: Dict[str, Any] = None):
        """Add a compound to the graph."""
        if self.memgraph:
            self._execute(
                "MERGE (c:Compound {smiles: $smiles}) "
                "SET c.name = $name, c.cid = $cid, c.activity_data = $activity",
                {"smiles": smiles, "name": name or "", "cid": cid, "activity": json.dumps(activity_data or {})},
            )
        else:
            self._fallback["compounds"][smiles] = {
                "name": name or "", "cid": cid, "activity_data": activity_data or {},
            }

    def link_compound_to_target(self, smiles: str, uniprot_id: str,
                                 activity: float = None, assay_type: str = None,
                                 reference: str = None):
        """Link a compound to its target with activity data."""
        if self.memgraph:
            self._execute(
                "MATCH (c:Compound {smiles: $smiles}), (t:Target {uniprot_id: $target}) "
                "MERGE (c)-[r:BINDS]->(t) "
                "SET r.activity = $activity, r.assay_type = $assay, r.reference = $ref",
                {"smiles": smiles, "target": uniprot_id, "activity": activity, "assay": assay_type or "", "ref": reference or ""},
            )
        else:
            if smiles not in self._fallback["compounds"]:
                self.add_compound(smiles)
            if uniprot_id in self._fallback["targets"]:
                if "bindings" not in self._fallback["compounds"][smiles]:
                    self._fallback["compounds"][smiles]["bindings"] = []
                self._fallback["compounds"][smiles]["bindings"].append({
                    "target": uniprot_id, "activity": activity, "assay_type": assay_type,
                })

    def add_experiment(self, exp_id: str, smiles: str = None, target: str = None,
                       result: Dict[str, Any] = None):
        """Link an experiment to compound and target."""
        if self.memgraph:
            self._execute(
                "MERGE (e:Experiment {exp_id: $id}) "
                "SET e.result = $result, e.timestamp = datetime().isoformat()",
                {"id": exp_id, "result": json.dumps(result or {})},
            )
            if smiles:
                self._execute(
                    "MATCH (e:Experiment {exp_id: $id}), (c:Compound {smiles: $smiles}) "
                    "MERGE (e)-[:TESTED_ON]->(c)",
                    {"id": exp_id, "smiles": smiles},
                )
            if target:
                self._execute(
                    "MATCH (e:Experiment {exp_id: $id}), (t:Target {uniprot_id: $target}) "
                    "MERGE (e)-[:TARGETED]->(t)",
                    {"id": exp_id, "target": target},
                )
        else:
            self._fallback["experiments"][exp_id] = {
                "smiles": smiles, "target": target, "result": result or {},
            }

    # ---- Query methods ----

    def get_target_context(self, uniprot_id: str) -> Dict[str, Any]:
        """Get full context for a target: family, pathways, known ligands, experiments."""
        if self.memgraph:
            results = list(self._execute(
                "MATCH (t:Target {uniprot_id: $id}) "
                "OPTIONAL MATCH (t)-[:BELONGS_TO]->(f:Family) "
                "OPTIONAL MATCH (f)-[:INVOLVED_IN]->(p:Pathway) "
                "OPTIONAL MATCH (c:Compound)-[:BINDS]->(t) "
                "RETURN t, f, collect(DISTINCT p) as pathways, collect(DISTINCT c) as ligands",
                {"id": uniprot_id},
            ))
            if not results:
                return {"error": f"Target {uniprot_id} not found"}

            row = results[0]
            target_data = dict(row["t"]._properties) if hasattr(row["t"], "_properties") else {}
            family = dict(row["f"]._properties) if row["f"] and hasattr(row["f"], "_properties") else {}
            pathways = [dict(p._properties) for p in row["pathways"] if hasattr(p, "_properties")]
            ligands = [dict(c._properties) for c in row["ligands"] if hasattr(c, "_properties")]

            return {
                "target": target_data,
                "family": family.get("name"),
                "pathways": pathways,
                "known_ligands": ligands[:20],
                "n_known_ligands": len(ligands),
            }
        else:
            target = self._fallback["targets"].get(uniprot_id)
            if not target:
                return {"error": f"Target {uniprot_id} not found"}
            family_name = target.get("family")
            family_data = self._fallback["families"].get(family_name, {})
            pathways = [self._fallback["pathways"].get(p, {}) for p in family_data.get("pathways", [])]
            known_ligands = []
            for smiles, data in self._fallback["compounds"].items():
                for binding in data.get("bindings", []):
                    if binding.get("target") == uniprot_id:
                        known_ligands.append({"smiles": smiles, **binding})
            return {
                "target": {"uniprot_id": uniprot_id, **target},
                "family": family_name,
                "pathways": pathways,
                "known_ligands": known_ligands[:20],
                "n_known_ligands": len(known_ligands),
            }

    def find_similar_targets(self, uniprot_id: str, n: int = 5) -> List[Dict[str, Any]]:
        """Find targets in the same family."""
        if self.memgraph:
            results = list(self._execute(
                "MATCH (t:Target {uniprot_id: $id})-[:BELONGS_TO]->(f:Family)<-[:BELONGS_TO]-(other:Target) "
                "WHERE other.uniprot_id <> $id "
                "RETURN other, f LIMIT $n",
                {"id": uniprot_id, "n": n},
            ))
            return [
                {"uniprot_id": dict(r["other"]._properties).get("uniprot_id"),
                 "name": dict(r["other"]._properties).get("name"),
                 "family": dict(r["f"]._properties).get("name"),
                 "similarity": "same_family"}
                for r in results
            ]
        else:
            target = self._fallback["targets"].get(uniprot_id, {})
            family = target.get("family")
            if not family:
                return []
            return [
                {"uniprot_id": uid, "name": data.get("name"), "family": family, "similarity": "same_family"}
                for uid, data in self._fallback["targets"].items()
                if uid != uniprot_id and data.get("family") == family
            ][:n]

    def get_compound_history(self, smiles: str) -> Dict[str, Any]:
        """Get all experiments and targets for a compound."""
        if self.memgraph:
            results = list(self._execute(
                "MATCH (c:Compound {smiles: $smiles}) "
                "OPTIONAL MATCH (c)-[:BINDS]->(t:Target) "
                "OPTIONAL MATCH (e:Experiment)-[:TESTED_ON]->(c) "
                "RETURN c, collect(DISTINCT t) as targets, collect(DISTINCT e) as experiments",
                {"smiles": smiles},
            ))
            if not results:
                return {"error": "Compound not found"}
            row = results[0]
            compound = dict(row["c"]._properties) if hasattr(row["c"], "_properties") else {}
            targets = [dict(t._properties) for t in row["targets"] if hasattr(t, "_properties")]
            experiments = [dict(e._properties) for e in row["experiments"] if hasattr(e, "_properties")]
            return {"compound": compound, "targets": targets, "experiments": experiments}
        else:
            compound = self._fallback["compounds"].get(smiles)
            if not compound:
                return {"error": "Compound not found"}
            return {"compound": {"smiles": smiles, **compound}, "targets": [], "experiments": []}

    def get_stats(self) -> Dict[str, Any]:
        """Get knowledge graph statistics."""
        if self.memgraph:
            n_targets = list(self._execute("MATCH (t:Target) RETURN count(t) as n"))[0]["n"]
            n_compounds = list(self._execute("MATCH (c:Compound) RETURN count(c) as n"))[0]["n"]
            n_experiments = list(self._execute("MATCH (e:Experiment) RETURN count(e) as n"))[0]["n"]
            n_families = list(self._execute("MATCH (f:Family) RETURN count(f) as n"))[0]["n"]
            n_pathways = list(self._execute("MATCH (p:Pathway) RETURN count(p) as n"))[0]["n"]
            n_bindings = list(self._execute("MATCH ()-[r:BINDS]->() RETURN count(r) as n"))[0]["n"]
            return {
                "database": "memgraph",
                "n_targets": n_targets,
                "n_compounds": n_compounds,
                "n_experiments": n_experiments,
                "n_families": n_families,
                "n_pathways": n_pathways,
                "n_bindings": n_bindings,
            }
        else:
            return {
                "database": "in-memory",
                "n_targets": len(self._fallback["targets"]),
                "n_compounds": len(self._fallback["compounds"]),
                "n_experiments": len(self._fallback["experiments"]),
                "n_families": len(self._fallback["families"]),
                "n_pathways": len(self._fallback["pathways"]),
            }

    def search(self, query: str) -> List[Dict[str, Any]]:
        """Search the knowledge graph by name, ID, or description."""
        query_lower = query.lower()
        results = []

        if self.memgraph:
            results_db = list(self._execute(
                "MATCH (n) WHERE toLower(n.name) CONTAINS $q OR toLower(n.uniprot_id) CONTAINS $q OR toLower(n.smiles) CONTAINS $q "
                "RETURN n LIMIT 20",
                {"q": query_lower},
            ))
            for row in results_db:
                node = row["n"]
                props = dict(node._properties) if hasattr(node, "_properties") else {}
                results.append({
                    "node_id": str(node._id) if hasattr(node, "_id") else "",
                    "type": list(node._labels)[0] if hasattr(node, "_labels") else "",
                    "name": props.get("name", ""),
                    "data": props,
                })
        else:
            for collection in ["targets", "compounds", "experiments"]:
                for key, data in self._fallback.get(collection, {}).items():
                    searchable = f"{key} {data.get('name', '')} {data.get('description', '')}".lower()
                    if query_lower in searchable:
                        results.append({
                            "node_id": key,
                            "type": collection.rstrip("s"),
                            "name": data.get("name", ""),
                            "data": data,
                        })

        return results[:20]


knowledge_graph = BioKnowledgeGraph()
