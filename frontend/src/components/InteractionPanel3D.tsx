import { useState, useCallback, useEffect } from 'react'
import { Button, Badge } from '@/components/ui'

interface Interaction3D {
  type: 'hbond' | 'hydrophobic' | 'pi_stacking' | 'salt_bridge'
  receptor_atom: {
    name: string
    element: string
    coord: [number, number, number]
    residue: string
  }
  ligand_atom: {
    name: string
    element: string
    coord: [number, number, number]
    residue: string
  }
  distance: number
}

interface BindingSiteResidue {
  name: string
  number: number
  chain: string
  coord: [number, number, number]
  interactions: string[]
}

interface InteractionData3D {
  success: boolean
  interactions: Interaction3D[]
  binding_site_residues: BindingSiteResidue[]
  ligand_center: [number, number, number]
  ligand_radius: number
  summary: {
    hbond_count: number
    hydrophobic_count: number
    pi_stacking_count: number
    salt_bridge_count: number
    total_count: number
  }
}

const INTERACTION_CONFIG = {
  hbond: { color: '#10b981', label: 'H-bond', dash: [4, 4] },
  hydrophobic: { color: '#f59e0b', label: 'Hydrophobic', dash: [] },
  pi_stacking: { color: '#6366f1', label: 'Pi Stacking', dash: [6, 3] },
  salt_bridge: { color: '#ef4444', label: 'Salt Bridge', dash: [2, 2] },
}

interface InteractionPanel3DProps {
  receptorPath?: string
  ligandPath?: string
  viewer: any
  onInteractionData?: (data: InteractionData3D | null) => void
}

export function InteractionPanel3D({
  receptorPath,
  ligandPath,
  viewer,
  onInteractionData,
}: InteractionPanel3DProps) {
  const [interactionData, setInteractionData] = useState<InteractionData3D | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInteractions, setShowInteractions] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showBindingSite, setShowBindingSite] = useState(false)
  const [showResidueLabels, setShowResidueLabels] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(['hbond', 'hydrophobic', 'pi_stacking', 'salt_bridge']))

  const fetchInteractions = useCallback(async () => {
    if (!receptorPath || !ligandPath) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:8000/api/interactions/3d-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receptor_path: receptorPath,
          ligand_path: ligandPath,
          cutoff: 5.0,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: 'Request failed' }))
        throw new Error(errData.detail || 'Failed to load interaction data')
      }

      const data = await response.json()
      setInteractionData(data)
      onInteractionData?.(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load interactions')
      console.error('3D interaction fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [receptorPath, ligandPath, onInteractionData])

  const toggleFilter = (type: string) => {
    const next = new Set(activeFilters)
    if (next.has(type)) {
      next.delete(type)
    } else {
      next.add(type)
    }
    setActiveFilters(next)
  }

  const clearViewerInteractions = () => {
    if (!viewer) return
    try {
      viewer.removeAllLabels()
      viewer.removeAllShapes()
      viewer.removeAllModels({ sel: { model: 1 } })
    } catch {}
  }

  const renderInteractions = () => {
    if (!viewer || !interactionData || !showInteractions) {
      clearViewerInteractions()
      return
    }

    clearViewerInteractions()

    const filtered = interactionData.interactions.filter((i) => activeFilters.has(i.type))

    filtered.forEach((interaction, idx) => {
      const config = INTERACTION_CONFIG[interaction.type]
      const recCoord = interaction.receptor_atom.coord
      const ligCoord = interaction.ligand_atom.coord

      viewer.addCylinder(
        { start: { x: recCoord[0], y: recCoord[1], z: recCoord[2] },
          end: { x: ligCoord[0], y: ligCoord[1], z: ligCoord[2] },
          radius: 0.08,
          color: config.color,
          dashed: config.dash.length > 0,
          dashLength: config.dash[0] || 4,
          dashSpace: config.dash[1] || 4,
        },
        { name: `interaction_${idx}` }
      )

      if (showLabels) {
        const midX = (recCoord[0] + ligCoord[0]) / 2
        const midY = (recCoord[1] + ligCoord[1]) / 2
        const midZ = (recCoord[2] + ligCoord[2]) / 2

        viewer.addLabel(
          `${interaction.distance.toFixed(1)} A`,
          {
            position: { x: midX, y: midY, z: midZ },
            backgroundColor: 'rgba(0,0,0,0.7)',
            fontColor: config.color,
            fontSize: 10,
            font: 'monospace',
          },
          { name: `label_${idx}` }
        )
      }
    })

    viewer.render()
  }

  const renderBindingSiteSphere = () => {
    if (!viewer || !interactionData) return

    if (!showBindingSite) {
      viewer.removeSurface('binding_site_sphere')
      viewer.render()
      return
    }

    const { ligand_center, ligand_radius } = interactionData

    viewer.addUnitCell(
      { radius: ligand_radius, center: { x: ligand_center[0], y: ligand_center[1], z: ligand_center[2] } },
      { color: '#6366f1', opacity: 0.15, name: 'binding_site_sphere' }
    )

    viewer.render()
  }

  const renderResidueLabels = () => {
    if (!viewer || !interactionData) return

    if (!showResidueLabels) {
      viewer.removeAllLabels({ category: 'residue' })
      viewer.render()
      return
    }

    interactionData.binding_site_residues.forEach((residue, idx) => {
      const label = `${residue.name} ${residue.number}${residue.chain}`
      viewer.addLabel(
        label,
        {
          position: { x: residue.coord[0], y: residue.coord[1], z: residue.coord[2] },
          backgroundColor: 'rgba(30, 30, 60, 0.8)',
          fontColor: '#e5e7eb',
          fontSize: 11,
          font: 'sans-serif',
          borderColor: '#6366f1',
          borderWidth: 1,
        },
        { name: `residue_label_${idx}`, category: 'residue' }
      )
    })

    viewer.render()
  }

  useEffect(() => {
    renderInteractions()
  }, [interactionData, showInteractions, showLabels, activeFilters])

  useEffect(() => {
    renderBindingSiteSphere()
  }, [showBindingSite, interactionData])

  useEffect(() => {
    renderResidueLabels()
  }, [showResidueLabels, interactionData])

  if (!receptorPath || !ligandPath) {
    return (
      <div className="p-3 bg-surface-secondary rounded-lg text-xs text-text-tertiary">
        <p>Enter receptor and ligand paths to load interaction data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Load Button */}
      <Button
        variant="primary"
        size="sm"
        className="w-full"
        onClick={fetchInteractions}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Load Interactions'}
      </Button>

      {error && (
        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      {interactionData && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-lg font-bold text-emerald-400">{interactionData.summary.hbond_count}</p>
              <p className="text-xs text-text-secondary">H-bonds</p>
            </div>
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30">
              <p className="text-lg font-bold text-amber-400">{interactionData.summary.hydrophobic_count}</p>
              <p className="text-xs text-text-secondary">Hydrophobic</p>
            </div>
            <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/30">
              <p className="text-lg font-bold text-indigo-400">{interactionData.summary.pi_stacking_count}</p>
              <p className="text-xs text-text-secondary">Pi Stacking</p>
            </div>
            <div className="p-2 rounded bg-red-500/10 border border-red-500/30">
              <p className="text-lg font-bold text-red-400">{interactionData.summary.salt_bridge_count}</p>
              <p className="text-xs text-text-secondary">Salt Bridges</p>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-primary">Visualization</h4>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInteractions}
                  onChange={() => setShowInteractions(!showInteractions)}
                  className="rounded border-border-light"
                />
                Show Interaction Lines
              </label>
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={() => setShowLabels(!showLabels)}
                  disabled={!showInteractions}
                  className="rounded border-border-light"
                />
                Show Distance Labels
              </label>
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBindingSite}
                  onChange={() => setShowBindingSite(!showBindingSite)}
                  className="rounded border-border-light"
                />
                Show Binding Site Sphere
              </label>
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showResidueLabels}
                  onChange={() => setShowResidueLabels(!showResidueLabels)}
                  className="rounded border-border-light"
                />
                Show Residue Labels
              </label>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-primary">Filter by Type</h4>
            <div className="space-y-1.5">
              {Object.entries(INTERACTION_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                    activeFilters.has(type)
                      ? 'bg-surface-secondary border border-border-light'
                      : 'bg-transparent border border-transparent opacity-40'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-text-secondary">{config.label}</span>
                  <Badge variant="info" className="ml-auto">
                    {interactionData.interactions.filter((i) => i.type === type).length}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Binding Site Residues */}
          {interactionData.binding_site_residues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-text-primary">
                Binding Site ({interactionData.binding_site_residues.length} residues)
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {interactionData.binding_site_residues.map((residue, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2 py-1 rounded bg-surface-secondary text-xs"
                  >
                    <span className="text-text-primary font-medium">
                      {residue.name} {residue.number}{residue.chain}
                    </span>
                    <div className="flex gap-1">
                      {Array.from(new Set(residue.interactions)).map((type, i) => (
                        <span
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: INTERACTION_CONFIG[type as keyof typeof INTERACTION_CONFIG]?.color }}
                          title={type}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
