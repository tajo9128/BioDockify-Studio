import { useState } from 'react'
import { Card, Badge, Button } from '@/components/ui'
import { SAMPLE_SMILES } from '@/components/Molecule2DViewer'
import { InteractionPanel } from '@/components/InteractionPanel'

const INTERACTION_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  hydrogen_bond: { bg: 'bg-emerald-500/10', border: 'border-emerald-500', text: 'text-emerald-500', label: 'Hydrogen Bond' },
  hbond: { bg: 'bg-emerald-500/10', border: 'border-emerald-500', text: 'text-emerald-500', label: 'Hydrogen Bond' },
  hydrophobic_contact: { bg: 'bg-amber-500/10', border: 'border-amber-500', text: 'text-amber-500', label: 'Hydrophobic' },
  hydrophobic: { bg: 'bg-amber-500/10', border: 'border-amber-500', text: 'text-amber-500', label: 'Hydrophobic' },
  pi_stacking: { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-500', label: 'Pi Stacking' },
  pi_cation: { bg: 'bg-violet-500/10', border: 'border-violet-500', text: 'text-violet-500', label: 'Pi-Cation' },
  salt_bridge: { bg: 'bg-rose-500/10', border: 'border-rose-500', text: 'text-rose-500', label: 'Salt Bridge' },
}

export function Interactions() {
  const [viewMode, setViewMode] = useState<'panel' | 'list'>('panel')
  const [ligandPdb, setLigandPdb] = useState('')
  const [receptorPdb, setReceptorPdb] = useState('')
  const [analysisResult, setAnalysisResult] = useState<any | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!ligandPdb.trim() || !receptorPdb.trim()) {
      setError('Both ligand and receptor PDB content are required')
      return
    }
    setAnalyzing(true)
    setError(null)
    setAnalysisResult(null)
    try {
      const res = await fetch('/api/interactions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ligand_pdb: ligandPdb, receptor_pdb: receptorPdb }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setAnalysisResult(data)
    } catch (err: any) {
      setError(err.message || 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleLoadSample = () => {
    setLigandPdb(SAMPLE_SMILES.aspirin)
    setReceptorPdb('')
    setError('Load a real receptor PDB to analyze interactions')
  }

  const allInteractions = analysisResult
    ? [
        ...(analysisResult.hydrogen_bonds || []).map((i: any) => ({ ...i, type: 'hydrogen_bond' })),
        ...(analysisResult.hydrophobic_contacts || []).map((i: any) => ({ ...i, type: 'hydrophobic_contact' })),
        ...(analysisResult.pi_stacking || []).map((i: any) => ({ ...i, type: 'pi_stacking' })),
        ...(analysisResult.pi_cation || []).map((i: any) => ({ ...i, type: 'pi_cation' })),
        ...(analysisResult.salt_bridges || []).map((i: any) => ({ ...i, type: 'salt_bridge' })),
      ]
    : []

  const summary = analysisResult?.summary || {}

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Molecular Interactions</h1>
        <p className="text-text-secondary mt-1">Analyze protein-ligand interactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Input Card */}
          <Card>
            <h3 className="font-bold text-text-primary mb-4">Input Structures</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Ligand PDB</label>
                <textarea
                  value={ligandPdb}
                  onChange={(e) => setLigandPdb(e.target.value)}
                  placeholder="Paste ligand PDB content..."
                  rows={6}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Receptor PDB</label>
                <textarea
                  value={receptorPdb}
                  onChange={(e) => setReceptorPdb(e.target.value)}
                  placeholder="Paste receptor PDB content..."
                  rows={6}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? 'Analyzing...' : 'Analyze Interactions'}
              </Button>
              <Button variant="secondary" onClick={handleLoadSample}>
                Load Sample Ligand
              </Button>
            </div>
            {error && (
              <div className="mt-3 p-3 rounded bg-red-900/50 border border-red-700 text-red-300 text-sm">
                {error}
              </div>
            )}
          </Card>

          {/* Results */}
          {analysisResult && (
            <>
              <div className="flex gap-2 border-b pb-2">
                <button
                  onClick={() => setViewMode('panel')}
                  className={`px-3 py-1 text-sm rounded ${viewMode === 'panel' ? 'bg-primary text-white' : 'text-gray-400'}`}
                >
                  Summary Panel
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 text-sm rounded ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400'}`}
                >
                  All Interactions ({allInteractions.length})
                </button>
              </div>

              {viewMode === 'panel' ? (
                <InteractionPanel
                  ligandPdb={ligandPdb}
                  receptorPdb={receptorPdb}
                  isDark={true}
                  preloadedData={analysisResult}
                />
              ) : (
                <Card>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {allInteractions.map((interaction: any, idx: number) => {
                      const color = INTERACTION_COLORS[interaction.type] || INTERACTION_COLORS.hydrophobic
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-lg border ${color.bg} ${color.border}`}
                        >
                          <div className="flex items-center gap-3">
                            <Badge className={`${color.bg} ${color.text}`}>
                              {color.label}
                            </Badge>
                            <span className="text-sm font-mono text-text-secondary">
                              {interaction.residue ? `${interaction.residue}${interaction.resseq}` : `${interaction.ligand_atom} ↔ ${interaction.receptor_atom}`}
                            </span>
                            {interaction.chain && (
                              <span className="text-xs text-gray-500">Chain {interaction.chain}</span>
                            )}
                          </div>
                          <span className="text-sm font-medium">
                            {interaction.distance?.toFixed(2) || interaction.distance_A?.toFixed(2)} Å
                          </span>
                        </div>
                      )
                    })}
                    {allInteractions.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No interactions detected
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {analysisResult && (
            <Card>
              <h3 className="font-bold text-text-primary mb-4">Interaction Summary</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-3 rounded-lg ${INTERACTION_COLORS.hydrogen_bond.bg} border ${INTERACTION_COLORS.hydrogen_bond.border}`}>
                  <p className="text-2xl font-bold text-emerald-500">{summary.total_hbonds || 0}</p>
                  <p className="text-xs text-text-secondary">H-Bonds</p>
                </div>
                <div className={`p-3 rounded-lg ${INTERACTION_COLORS.hydrophobic_contact.bg} border ${INTERACTION_COLORS.hydrophobic_contact.border}`}>
                  <p className="text-2xl font-bold text-amber-500">{summary.total_hydrophobic || 0}</p>
                  <p className="text-xs text-text-secondary">Hydrophobic</p>
                </div>
                <div className={`p-3 rounded-lg ${INTERACTION_COLORS.pi_stacking.bg} border ${INTERACTION_COLORS.pi_stacking.border}`}>
                  <p className="text-2xl font-bold text-blue-500">{summary.total_pi_stacking || 0}</p>
                  <p className="text-xs text-text-secondary">Pi Stacking</p>
                </div>
                <div className={`p-3 rounded-lg ${INTERACTION_COLORS.pi_cation.bg} border ${INTERACTION_COLORS.pi_cation.border}`}>
                  <p className="text-2xl font-bold text-violet-500">{summary.total_pi_cation || 0}</p>
                  <p className="text-xs text-text-secondary">Pi-Cation</p>
                </div>
                <div className={`p-3 rounded-lg ${INTERACTION_COLORS.salt_bridge.bg} border ${INTERACTION_COLORS.salt_bridge.border}`}>
                  <p className="text-2xl font-bold text-rose-500">{summary.total_salt_bridges || 0}</p>
                  <p className="text-xs text-text-secondary">Salt Bridges</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-secondary border border-border-light">
                  <p className="text-2xl font-bold text-text-primary">{summary.binding_site_size || 0}</p>
                  <p className="text-xs text-text-secondary">Binding Site</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="bg-blue-500/5 border-blue-500/20">
            <h4 className="font-medium text-blue-600 mb-2">About Interactions</h4>
            <div className="text-xs text-text-secondary space-y-2">
              <p><strong className="text-blue-600">Hydrogen bonds (2.5-3.5 Å):</strong> Strong directional interactions between donors and acceptors.</p>
              <p><strong className="text-amber-600">Hydrophobic (3.5-5 Å):</strong> Non-polar van der Waals contacts.</p>
              <p><strong className="text-blue-600">Pi stacking (3.5-5 Å):</strong> Aromatic ring interactions.</p>
              <p><strong className="text-violet-600">Pi-cation:</strong> Positive residues with negative ligand atoms.</p>
              <p><strong className="text-rose-600">Salt bridges:</strong> Charged residue-ligand interactions.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
