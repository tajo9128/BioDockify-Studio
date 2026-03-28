import { useState } from 'react'
import { Card, Badge } from '@/components/ui'
import { Molecule2DViewer, SAMPLE_SMILES } from '@/components/Molecule2DViewer'

// Sample interactions data for demo
const SAMPLE_INTERACTIONS = [
  { type: 'hbond', atom1: 'N1', atom2: 'OG1', distance: 2.1, description: 'THR41 backbone N' },
  { type: 'hbond', atom1: 'O2', atom2: 'ND2', distance: 2.3, description: 'ASN45 sidechain' },
  { type: 'hydrophobic', atom1: 'C1', atom2: 'CB', distance: 3.5, description: 'PRO28 contact' },
  { type: 'hydrophobic', atom1: 'C2', atom2: 'CG', distance: 3.8, description: 'VAL30 contact' },
  { type: 'pi_stacking', atom1: 'ring1', atom2: 'ring2', distance: 4.2, description: 'HIS89-PHE90' },
]

const INTERACTION_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  hbond: { bg: 'bg-emerald-500/10', border: 'border-emerald-500', text: 'text-emerald-500', label: 'Hydrogen Bond' },
  hydrophobic: { bg: 'bg-amber-500/10', border: 'border-amber-500', text: 'text-amber-500', label: 'Hydrophobic' },
  pi_stacking: { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-500', label: 'Pi Stacking' },
  salt_bridge: { bg: 'bg-rose-500/10', border: 'border-rose-500', text: 'text-rose-500', label: 'Salt Bridge' },
}

export function Interactions() {
  const [selectedPose, setSelectedPose] = useState(1)
  const [viewMode, setViewMode] = useState<'2d' | 'list'>('2d')

  // Use sample data - in production this would come from API
  const interactions = SAMPLE_INTERACTIONS
  const smiles = SAMPLE_SMILES.aspirin

  const hbondCount = interactions.filter(i => i.type === 'hbond').length
  const hydrophobicCount = interactions.filter(i => i.type === 'hydrophobic').length
  const piStackingCount = interactions.filter(i => i.type === 'pi_stacking').length

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Molecular Interactions</h1>
        <p className="text-text-secondary mt-1">Analyze protein-ligand interactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2D Structure with Interactions */}
        <div className="lg:col-span-2">
          <Card padding="none" className="overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 bg-surface-secondary border-b border-border-light">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">Ligand Structure</span>
                <Badge variant="info">Pose {selectedPose}</Badge>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('2d')}
                  className={`px-3 py-1 rounded text-sm ${viewMode === '2d' ? 'bg-primary text-white' : 'bg-white hover:bg-primary/10'}`}
                >
                  2D View
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white hover:bg-primary/10'}`}
                >
                  List View
                </button>
              </div>
            </div>

            {/* 2D Viewer or List */}
            {viewMode === '2d' ? (
              <div className="p-4">
                <div className="flex gap-6">
                  {/* 2D Molecule Drawing */}
                  <div className="flex-shrink-0">
                    <Molecule2DViewer 
                      smiles={smiles} 
                      width={280} 
                      height={220}
                      className="rounded-lg border border-border-light bg-white/50"
                    />
                    <p className="text-xs text-center mt-2 text-text-tertiary">Aspirin (CC(=O)OC1=CC=CC=C1C(=O)O)</p>
                    <p className="text-xs text-center text-text-tertiary">Generated with SMILESDrawer (Open Source)</p>
                  </div>

                  {/* Interaction Summary */}
                  <div className="flex-1 space-y-3">
                    <h3 className="font-medium text-text-primary">Interaction Summary</h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`p-3 rounded-lg ${INTERACTION_COLORS.hbond.bg} border ${INTERACTION_COLORS.hbond.border}`}>
                        <p className="text-2xl font-bold text-emerald-500">{hbondCount}</p>
                        <p className="text-xs text-text-secondary">Hydrogen Bonds</p>
                      </div>
                      <div className={`p-3 rounded-lg ${INTERACTION_COLORS.hydrophobic.bg} border ${INTERACTION_COLORS.hydrophobic.border}`}>
                        <p className="text-2xl font-bold text-amber-500">{hydrophobicCount}</p>
                        <p className="text-xs text-text-secondary">Hydrophobic</p>
                      </div>
                      <div className={`p-3 rounded-lg ${INTERACTION_COLORS.pi_stacking.bg} border ${INTERACTION_COLORS.pi_stacking.border}`}>
                        <p className="text-2xl font-bold text-blue-500">{piStackingCount}</p>
                        <p className="text-xs text-text-secondary">Pi Stacking</p>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-secondary border border-border-light">
                        <p className="text-2xl font-bold text-text-primary">{interactions.length}</p>
                        <p className="text-xs text-text-secondary">Total Contacts</p>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 mt-3 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span> H-bond
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span> Hydrophobic
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span> Pi Stacking
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-rose-500"></span> Salt Bridge
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interaction Annotations */}
                <div className="mt-4 p-3 bg-surface-secondary rounded-lg">
                  <h4 className="text-sm font-medium text-text-primary mb-2">Key Interactions</h4>
                  <div className="space-y-2">
                    {interactions.slice(0, 4).map((interaction, idx) => {
                      const color = INTERACTION_COLORS[interaction.type]
                      return (
                        <div key={idx} className={`flex items-center justify-between p-2 rounded ${color.bg}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${color.text.replace('text-', 'bg-')}`}></span>
                            <span className="text-sm font-medium">{color.label}</span>
                            <span className="text-xs text-text-secondary">- {interaction.description}</span>
                          </div>
                          <span className="text-xs text-text-secondary">
                            {interaction.distance} Å
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* List View */
              <div className="p-4">
                <div className="space-y-2">
                  {interactions.map((interaction, idx) => {
                    const color = INTERACTION_COLORS[interaction.type]
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
                            {interaction.atom1} ↔ {interaction.atom2}
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {interaction.distance} Å
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-3 bg-surface-secondary border-t border-border-light text-xs text-text-tertiary">
              <p>2D structure generated from SMILES using SMILESDrawer (BSD Open Source License)</p>
            </div>
          </Card>
        </div>

        {/* Sidebar - Interaction Details */}
        <div className="space-y-4">
          {/* Pose Selector */}
          <Card>
            <h3 className="font-bold text-text-primary mb-4">Select Pose</h3>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(pose => (
                <button
                  key={pose}
                  onClick={() => setSelectedPose(pose)}
                  className={`w-full p-2 rounded-lg text-left text-sm transition-colors ${
                    selectedPose === pose 
                      ? 'bg-primary text-white' 
                      : 'bg-surface-secondary hover:bg-primary/10'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>Pose {pose}</span>
                    <span className="font-mono">{(-7 - pose * 0.3).toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Binding Statistics */}
          <Card>
            <h3 className="font-bold text-text-primary mb-4">Binding Statistics</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">H-bond donors</span>
                <span className="font-medium">{hbondCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">H-bond acceptors</span>
                <span className="font-medium">{hbondCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Hydrophobic contacts</span>
                <span className="font-medium">{hydrophobicCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Pi interactions</span>
                <span className="font-medium">{piStackingCount}</span>
              </div>
              <hr className="border-border-light" />
              <div className="flex justify-between">
                <span className="text-text-secondary">Total interactions</span>
                <span className="font-bold text-primary">{interactions.length}</span>
              </div>
            </div>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-500/5 border-blue-500/20">
            <h4 className="font-medium text-blue-600 mb-2">💡 About Interactions</h4>
            <div className="text-xs text-text-secondary space-y-2">
              <p>
                <strong className="text-blue-600">Hydrogen bonds (2.5-3.5 Å):</strong> Strong directional interactions between H-bond donors and acceptors that stabilize the binding.
              </p>
              <p>
                <strong className="text-amber-600">Hydrophobic (3.5-5 Å):</strong> Non-polar interactions driving ligand into binding pocket through van der Waals contacts.
              </p>
              <p>
                <strong className="text-blue-600">Pi stacking (3.5-5 Å):</strong> Aromatic ring interactions important for specificity in binding sites.
              </p>
            </div>
          </Card>

          {/* 2D Drawing Info */}
          <Card className="bg-purple-500/5 border-purple-500/20">
            <h4 className="font-medium text-purple-600 mb-2">🔬 Open Source 2D Drawing</h4>
            <p className="text-xs text-text-secondary">
              This 2D structure was generated using <strong>SMILESDrawer</strong>, an open-source JavaScript library for rendering molecules from SMILES notation. 
            </p>
            <p className="text-xs text-text-secondary mt-2">
              SMILESDrawer is licensed under BSD-2-Clause and available at: 
              <a href="https://github.com/reymond-group/smiles-drawer" className="text-primary ml-1">GitHub</a>
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
