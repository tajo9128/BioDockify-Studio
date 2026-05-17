import { useState } from 'react'
import { Card } from '@/components/ui'
import { InteractionDiagram2D } from '@/components/InteractionDiagram2D'

export function Interactions() {
  const [selectedPose, setSelectedPose] = useState(1)
  const [receptorPath, setReceptorPath] = useState('')
  const [ligandSmiles, setLigandSmiles] = useState('')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Molecular Interactions</h1>
        <p className="text-text-secondary mt-1">Analyze protein-ligand interactions</p>
      </div>

      {/* Input Controls */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Receptor PDB Path</label>
          <input
            type="text"
            value={receptorPath}
            onChange={(e) => setReceptorPath(e.target.value)}
            placeholder="/path/to/receptor.pdb"
            className="w-full px-3 py-2 border border-border-light rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Ligand SMILES</label>
          <input
            type="text"
            value={ligandSmiles}
            onChange={(e) => setLigandSmiles(e.target.value)}
            placeholder="CC(=O)OC1=CC=CC=C1C(=O)O"
            className="w-full px-3 py-2 border border-border-light rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex items-end">
          <div className="p-3 bg-surface-secondary rounded-lg text-xs text-text-secondary">
            <p>Enter receptor path and ligand SMILES to generate the interaction diagram.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2D Interaction Diagram */}
        <div className="lg:col-span-2">
          <InteractionDiagram2D
            receptorPath={receptorPath}
            ligandSmiles={ligandSmiles}
            width={600}
            height={500}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Pose Selector */}
          <Card>
            <h3 className="font-bold text-text-primary mb-4">Select Pose</h3>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((pose) => (
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

          {/* Info Card */}
          <Card className="bg-blue-500/5 border-blue-500/20">
            <h4 className="font-medium text-blue-600 mb-2">About Interactions</h4>
            <div className="text-xs text-text-secondary space-y-2">
              <p>
                <strong className="text-blue-600">Hydrogen bonds (2.5-3.5 Å):</strong> Strong directional interactions between H-bond donors and acceptors.
              </p>
              <p>
                <strong className="text-amber-600">Hydrophobic (3.5-5 Å):</strong> Non-polar interactions driving ligand into binding pocket.
              </p>
              <p>
                <strong className="text-blue-600">Pi stacking (3.5-5 Å):</strong> Aromatic ring interactions important for specificity.
              </p>
              <p>
                <strong className="text-red-600">Salt bridges:</strong> Electrostatic interactions between charged groups.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
