import { Card, Badge, DataTable } from '@/components/ui'

const interactionTypes = [
  { type: 'H-bond', color: 'text-green-500', count: 5 },
  { type: 'Hydrophobic', color: 'text-yellow-500', count: 12 },
  { type: 'Pi-stacking', color: 'text-purple-500', count: 2 },
  { type: 'Salt bridge', color: 'text-red-500', count: 1 },
  { type: 'Halogen', color: 'text-cyan-500', count: 0 },
  { type: 'Metal coordination', color: 'text-gray-500', count: 0 },
]

const interactions = [
  { type: 'H-bond', residue_a: 'ASP:189', residue_b: 'LIG:N1', distance: 2.8 },
  { type: 'H-bond', residue_a: 'GLU:190', residue_b: 'LIG:N2', distance: 3.1 },
  { type: 'Hydrophobic', residue_a: 'ILE:198', residue_b: 'LIG:C1', distance: 3.8 },
  { type: 'Hydrophobic', residue_a: 'PHE:200', residue_b: 'LIG:C2', distance: 4.2 },
  { type: 'Pi-stacking', residue_a: 'TYR:202', residue_b: 'LIG:ring', distance: 4.5 },
]

export function Interactions() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Molecular Interactions</h1>
        <p className="text-text-secondary mt-1">Analyze protein-ligand interactions</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {interactionTypes.map((it) => (
          <Card key={it.type} padding="sm" className="text-center">
            <p className={`text-2xl font-bold ${it.color}`}>{it.count}</p>
            <p className="text-xs text-text-secondary mt-1">{it.type}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="font-bold text-text-primary mb-4">Interaction Details</h3>
        <DataTable
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'residue_a', label: 'Residue A' },
            { key: 'residue_b', label: 'Residue B' },
            { key: 'distance', label: 'Distance (Å)' },
          ]}
          data={interactions.map((i) => ({
            ...i,
            type: <Badge variant={i.type.includes('H-bond') ? 'success' : 'default'}>{i.type}</Badge>,
            distance: <span className="font-mono">{i.distance.toFixed(2)}</span>,
          }))}
        />
      </Card>

      <Card className="mt-6">
        <h3 className="font-bold text-text-primary mb-4">2D Interaction Diagram</h3>
        <div className="aspect-video bg-surface-secondary rounded-lg flex items-center justify-center text-text-tertiary">
          <div className="text-center">
            <p className="text-4xl mb-2">🔗</p>
            <p>2D diagram visualization</p>
            <p className="text-xs mt-1">Load a docking result to view</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
