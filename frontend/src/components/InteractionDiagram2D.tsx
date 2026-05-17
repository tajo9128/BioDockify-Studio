import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, Badge } from '@/components/ui'

interface Atom2D {
  idx: number
  symbol: string
  x: number
  y: number
  charge: number
  is_aromatic: boolean
}

interface Bond2D {
  from: number
  to: number
  order: number
  is_aromatic: boolean
}

interface Interaction {
  type: 'hbond' | 'hydrophobic' | 'pi_stacking' | 'salt_bridge'
  residue_label: string
  residue_name: string
  residue_number: number
  chain: string
  ligand_atom_idx: number
  distance: number
  residue_atom: string
}

interface DiagramData {
  success: boolean
  ligand: {
    smiles: string
    num_atoms: number
    num_bonds: number
    atoms: Atom2D[]
    bonds: Bond2D[]
  }
  interactions: Interaction[]
  residues: any[]
  view: {
    center_x: number
    center_y: number
    scale: number
  }
  summary: {
    hbond_count: number
    hydrophobic_count: number
    pi_stacking_count: number
    salt_bridge_count: number
    total_count: number
  }
}

const INTERACTION_CONFIG = {
  hbond: { color: '#10b981', label: 'H-bond', dashed: true, lineWidth: 2 },
  hydrophobic: { color: '#f59e0b', label: 'Hydrophobic', dashed: false, lineWidth: 3 },
  pi_stacking: { color: '#6366f1', label: 'Pi Stacking', dashed: true, lineWidth: 2 },
  salt_bridge: { color: '#ef4444', label: 'Salt Bridge', dashed: true, lineWidth: 2 },
}

const ATOM_COLORS: Record<string, string> = {
  C: '#6b7280',
  N: '#3b82f6',
  O: '#ef4444',
  S: '#eab308',
  P: '#f97316',
  F: '#22c55e',
  Cl: '#22c55e',
  Br: '#b45309',
  I: '#a855f7',
}

interface InteractionDiagram2DProps {
  receptorPath?: string
  ligandSmiles?: string
  ligandPath?: string
  width?: number
  height?: number
  className?: string
}

export function InteractionDiagram2D({
  receptorPath,
  ligandSmiles,
  ligandPath,
  width = 600,
  height = 500,
  className = '',
}: InteractionDiagram2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [diagramData, setDiagramData] = useState<DiagramData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredInteraction, setHoveredInteraction] = useState<Interaction | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')

  const fetchDiagram = useCallback(async () => {
    if (!receptorPath && !ligandSmiles && !ligandPath) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:8000/api/interactions/2d-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receptor_path: receptorPath || '',
          ligand_smiles: ligandSmiles || null,
          ligand_path: ligandPath || null,
          cutoff: 5.0,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: 'Request failed' }))
        throw new Error(errData.detail || 'Failed to generate diagram')
      }

      const data = await response.json()
      setDiagramData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load interaction diagram')
      console.error('2D diagram fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [receptorPath, ligandSmiles, ligandPath])

  useEffect(() => {
    fetchDiagram()
  }, [fetchDiagram])

  const drawDiagram = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !diagramData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, width, height)

    const { ligand, interactions } = diagramData
    const { atoms, bonds } = ligand

    if (atoms.length === 0) return

    // Calculate scale and offset to fit canvas
    const padding = 80
    const xCoords = atoms.map((a) => a.x)
    const yCoords = atoms.map((a) => a.y)
    const xMin = Math.min(...xCoords)
    const xMax = Math.max(...xCoords)
    const yMin = Math.min(...yCoords)
    const yMax = Math.max(...yCoords)

    const dataWidth = xMax - xMin || 1
    const dataHeight = yMax - yMin || 1
    const scaleX = (width - padding * 2) / dataWidth
    const scaleY = (height - padding * 2) / dataHeight
    const scale = Math.min(scaleX, scaleY) * 0.8

    const offsetX = width / 2 - ((xMax + xMin) / 2) * scale
    const offsetY = height / 2 + ((yMax + yMin) / 2) * scale

    const toCanvas = (x: number, y: number) => ({
      x: x * scale + offsetX,
      y: -y * scale + offsetY,
    })

    // Draw interactions first (behind bonds)
    const filteredInteractions =
      filterType === 'all' ? interactions : interactions.filter((i) => i.type === filterType)

    filteredInteractions.forEach((interaction) => {
      const atom = atoms[interaction.ligand_atom_idx]
      if (!atom) return

      const config = INTERACTION_CONFIG[interaction.type]
      const atomPos = toCanvas(atom.x, atom.y)

      // Calculate label position (radial from center)
      const centerX = width / 2
      const centerY = height / 2
      const dx = atomPos.x - centerX
      const dy = atomPos.y - centerY
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const labelDist = dist + 60
      const labelX = centerX + (dx / dist) * labelDist
      const labelY = centerY + (dy / dist) * labelDist

      // Draw dashed/solid line
      ctx.strokeStyle = config.color
      ctx.lineWidth = config.lineWidth
      ctx.setLineDash(config.dashed ? [4, 4] : [])
      ctx.beginPath()
      ctx.moveTo(atomPos.x, atomPos.y)
      ctx.lineTo(labelX, labelY)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw distance label on line
      const midX = (atomPos.x + labelX) / 2
      const midY = (atomPos.y + labelY) / 2
      ctx.fillStyle = config.color
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${interaction.distance.toFixed(1)} Å`, midX, midY - 4)

      // Draw residue label
      if (showLabels) {
        ctx.fillStyle = config.color
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const labelBgWidth = ctx.measureText(interaction.residue_label).width + 10
        const labelBgHeight = 18

        ctx.fillStyle = `${config.color}15`
        ctx.strokeStyle = config.color
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(labelX - labelBgWidth / 2, labelY - labelBgHeight / 2, labelBgWidth, labelBgHeight, 4)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = config.color
        ctx.fillText(interaction.residue_label, labelX, labelY)
      }
    })

    // Draw bonds
    bonds.forEach((bond) => {
      const fromAtom = atoms[bond.from]
      const toAtom = atoms[bond.to]
      if (!fromAtom || !toAtom) return

      const fromPos = toCanvas(fromAtom.x, fromAtom.y)
      const toPos = toCanvas(toAtom.x, toAtom.y)

      ctx.strokeStyle = bond.is_aromatic ? '#9333ea' : '#374151'
      ctx.lineWidth = bond.order > 1 ? 2.5 : 1.5
      ctx.beginPath()
      ctx.moveTo(fromPos.x, fromPos.y)
      ctx.lineTo(toPos.x, toPos.y)
      ctx.stroke()

      // Double bond
      if (bond.order === 2 && !bond.is_aromatic) {
        const dx = toPos.x - fromPos.x
        const dy = toPos.y - fromPos.y
        const len = Math.sqrt(dx * dx + dy * dy)
        const nx = (-dy / len) * 3
        const ny = (dx / len) * 3

        ctx.beginPath()
        ctx.moveTo(fromPos.x + nx, fromPos.y + ny)
        ctx.lineTo(toPos.x + nx, toPos.y + ny)
        ctx.stroke()
      }

      // Triple bond
      if (bond.order === 3) {
        const dx = toPos.x - fromPos.x
        const dy = toPos.y - fromPos.y
        const len = Math.sqrt(dx * dx + dy * dy)
        const nx = (-dy / len) * 4
        const ny = (dx / len) * 4

        ctx.beginPath()
        ctx.moveTo(fromPos.x + nx, fromPos.y + ny)
        ctx.lineTo(toPos.x + nx, toPos.y + ny)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(fromPos.x - nx, fromPos.y - ny)
        ctx.lineTo(toPos.x - nx, toPos.y - ny)
        ctx.stroke()
      }
    })

    // Draw atoms
    atoms.forEach((atom) => {
      const pos = toCanvas(atom.x, atom.y)
      const color = ATOM_COLORS[atom.symbol] || '#6b7280'
      const radius = atom.symbol === 'C' ? 5 : 7

      // Atom circle
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
      ctx.fill()

      // Atom label (skip carbon unless it's the only atom)
      if (atom.symbol !== 'C' || atoms.length < 5) {
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 9px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(atom.symbol, pos.x, pos.y)
      }
    })

    // Draw hover tooltip
    if (hoveredInteraction) {
      const atom = atoms[hoveredInteraction.ligand_atom_idx]
      if (atom) {
        const pos = toCanvas(atom.x, atom.y)
        const config = INTERACTION_CONFIG[hoveredInteraction.type]

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
        ctx.strokeStyle = config.color
        ctx.lineWidth = 2

        const tooltipX = pos.x + 15
        const tooltipY = pos.y - 40
        const tooltipWidth = 180
        const tooltipHeight = 50

        ctx.beginPath()
        ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 6)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = config.color
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(config.label, tooltipX + 8, tooltipY + 8)

        ctx.fillStyle = '#e5e7eb'
        ctx.font = '10px monospace'
        ctx.fillText(`Distance: ${hoveredInteraction.distance.toFixed(2)} Å`, tooltipX + 8, tooltipY + 24)
        ctx.fillText(`Atom: ${hoveredInteraction.residue_atom}`, tooltipX + 8, tooltipY + 36)
      }
    }
  }, [diagramData, width, height, showLabels, filterType, hoveredInteraction])

  useEffect(() => {
    drawDiagram()
  }, [drawDiagram])

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!diagramData) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const { ligand, interactions } = diagramData
    const { atoms } = ligand

    const padding = 80
    const xCoords = atoms.map((a) => a.x)
    const yCoords = atoms.map((a) => a.y)
    const xMin = Math.min(...xCoords)
    const xMax = Math.max(...xCoords)
    const yMin = Math.min(...yCoords)
    const yMax = Math.max(...yCoords)

    const dataWidth = xMax - xMin || 1
    const dataHeight = yMax - yMin || 1
    const scaleX = (width - padding * 2) / dataWidth
    const scaleY = (height - padding * 2) / dataHeight
    const scale = Math.min(scaleX, scaleY) * 0.8

    const offsetX = width / 2 - ((xMax + xMin) / 2) * scale
    const offsetY = height / 2 + ((yMax + yMin) / 2) * scale

    const toCanvas = (x: number, y: number) => ({
      x: x * scale + offsetX,
      y: -y * scale + offsetY,
    })

    let found: Interaction | null = null
    for (const interaction of interactions) {
      const atom = atoms[interaction.ligand_atom_idx]
      if (!atom) continue

      const pos = toCanvas(atom.x, atom.y)
      const dist = Math.sqrt((mouseX - pos.x) ** 2 + (mouseY - pos.y) ** 2)
      if (dist < 15) {
        found = interaction
        break
      }
    }

    setHoveredInteraction(found)
  }

  const handleCanvasMouseLeave = () => {
    setHoveredInteraction(null)
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ minHeight: height }}>
        <Card>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-text-secondary text-sm">Generating interaction diagram...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ minHeight: height }}>
        <Card>
          <div className="text-center">
            <p className="text-error text-sm">{error}</p>
            <button onClick={fetchDiagram} className="mt-3 px-4 py-1.5 bg-primary text-white rounded text-sm hover:bg-primary/90">
              Retry
            </button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <Card padding="none" className={`overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-surface-secondary border-b border-border-light">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-primary">2D Interaction Diagram</span>
          {diagramData && (
            <Badge variant="info">{diagramData.summary.total_count} interactions</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              showLabels ? 'bg-primary text-white' : 'bg-white hover:bg-primary/10 text-text-secondary'
            }`}
          >
            Labels
          </button>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-1 rounded text-xs border border-border-light bg-white text-text-secondary"
          >
            <option value="all">All Types</option>
            <option value="hbond">H-bonds</option>
            <option value="hydrophobic">Hydrophobic</option>
            <option value="pi_stacking">Pi Stacking</option>
            <option value="salt_bridge">Salt Bridges</option>
          </select>
          <button
            onClick={fetchDiagram}
            className="px-2.5 py-1 rounded text-xs font-medium bg-white hover:bg-primary/10 text-text-secondary transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative bg-white">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full cursor-crosshair"
          style={{ display: 'block' }}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
        />
      </div>

      {/* Summary Footer */}
      {diagramData && (
        <div className="p-3 bg-surface-secondary border-t border-border-light">
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: INTERACTION_CONFIG.hbond.color }}></span>
              <span className="text-text-secondary">H-bonds: {diagramData.summary.hbond_count}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: INTERACTION_CONFIG.hydrophobic.color }}></span>
              <span className="text-text-secondary">Hydrophobic: {diagramData.summary.hydrophobic_count}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: INTERACTION_CONFIG.pi_stacking.color }}></span>
              <span className="text-text-secondary">Pi Stacking: {diagramData.summary.pi_stacking_count}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: INTERACTION_CONFIG.salt_bridge.color }}></span>
              <span className="text-text-secondary">Salt Bridges: {diagramData.summary.salt_bridge_count}</span>
            </span>
          </div>
          {diagramData.ligand.smiles && (
            <p className="text-xs text-text-tertiary mt-2 font-mono truncate">
              {diagramData.ligand.smiles}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
