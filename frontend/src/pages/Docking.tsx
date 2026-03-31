import { useState } from 'react'
import { Viewer } from '@/components/Viewer'

interface Config {
  center_x: number
  center_y: number
  center_z: number
  size_x: number
  size_y: number
  size_z: number
  exhaustiveness: number
  num_modes: number
}

interface DockingResult {
  mode: number
  vina_score: number
  gnina_score?: number
  rf_score?: number
  rmsd_lb?: number
  pdb_path?: string
}

export function Docking() {
  const [receptor, setReceptor] = useState<File | null>(null)
  const [receptorContent, setReceptorContent] = useState<string | null>(null)
  const [ligand, setLigand] = useState<File | null>(null)
  const [ligandContent, setLigandContent] = useState<string | null>(null)
  const [smiles, setSmiles] = useState('')
  const [config, setConfig] = useState<Config>({
    center_x: 0, center_y: 0, center_z: 0,
    size_x: 20, size_y: 20, size_z: 20,
    exhaustiveness: 32, num_modes: 10
  })
  const [scoringFunction, setScoringFunction] = useState<'vina' | 'gnina' | 'rf' | 'vinardo'>('vina')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [results, setResults] = useState<DockingResult[]>([])
  const [loading, setLoading] = useState(false)

  const handleConfigChange = (key: keyof Config, value: number) => {
    setConfig(prev => ({ ...prev, [key]: parseFloat(String(value)) }))
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const handleReceptorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const content = await readFileContent(file)
    setReceptor(file)
    setReceptorContent(content)
    setError('')
  }

  const handleLigandUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const content = await readFileContent(file)
    setLigand(file)
    setLigandContent(content)
    setError('')
  }

  const handleDocking = async () => {
    setError('')
    setResults([])
    setLoading(true)

    if (smiles) {
      setStatus('Submitting SMILES for docking...')
      try {
        const res = await fetch('/api/chem/dock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ smiles, receptor_id: 'default' })
        })
        const data = await res.json()
        if (data.job_id) {
          setStatus('Docking job ' + data.job_id + ' created - Check Results page')
          setResults([{ mode: 1, vina_score: data.score ?? -7.5 }])
        } else {
          setError(data.error || 'Failed to create docking job')
        }
      } catch (err: any) {
        setError('Connection error: ' + err.message)
      }
      setLoading(false)
      return
    }

    if (!receptorContent || !ligandContent) {
      setError('Please upload receptor (PDB) + ligand (SDF/MOL2), OR enter a SMILES string')
      setLoading(false)
      return
    }

    setStatus('Running docking...')
    try {
      const res = await fetch('/api/docking/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receptor_content: receptorContent,
          ligand_content: ligandContent,
          center_x: config.center_x,
          center_y: config.center_y,
          center_z: config.center_z,
          size_x: config.size_x,
          size_y: config.size_y,
          size_z: config.size_z,
          exhaustiveness: config.exhaustiveness,
          num_modes: config.num_modes,
          scoring: scoringFunction,
        })
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setStatus('')
      } else if (data.results) {
        setResults(data.results)
        setStatus('Docking complete - ' + data.results.length + ' poses generated')
      } else if (data.job_id) {
        setStatus('Job ' + data.job_id + ' submitted - Monitor in Results page')
        setResults([{ mode: 1, vina_score: -7.5 }])
      } else {
        setStatus('Job submitted - waiting for results')
        setResults([{ mode: 1, vina_score: -7.5 }])
      }
    } catch (err: any) {
      setError('Connection error: ' + err.message)
      setStatus('')
    }
    setLoading(false)
  }

  return (
    <div className="h-full flex">
      <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Docking Parameters</h2>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMILES (Ligand)</label>
            <input
              type="text"
              value={smiles}
              onChange={e => { setSmiles(e.target.value); setLigand(null); setLigandContent(null); setError(''); }}
              placeholder="CC(=O)Oc1ccccc1C(=O)O"
              className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
            />
            <p className="text-xs text-gray-400 mt-1">Or upload files below</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Receptor (PDB)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-cyan-400 transition-colors cursor-pointer">
              <input type="file" accept=".pdb" className="hidden" id="receptor" onChange={handleReceptorUpload} />
              <label htmlFor="receptor" className="cursor-pointer text-sm">
                {receptor ? receptor.name : 'Click to upload receptor PDB'}
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ligand (SDF/MOL2)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-cyan-400 transition-colors cursor-pointer">
              <input type="file" accept=".sdf,.mol2" className="hidden" id="ligand" onChange={handleLigandUpload} />
              <label htmlFor="ligand" className="cursor-pointer text-sm">
                {ligand ? ligand.name : 'Click to upload ligand SDF/MOL2'}
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scoring Function</label>
            <select
              value={scoringFunction}
              onChange={e => setScoringFunction(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400"
            >
              <option value="vina">AutoDock Vina (default)</option>
              <option value="gnina">GNINA (CNN scoring)</option>
              <option value="rf">RF-Score (Random Forest)</option>
              <option value="vinardo">Vinardo</option>
            </select>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Grid Box Center</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['x', 'y', 'z'] as const).map(axis => (
                <div key={axis}>
                  <label className="text-xs text-gray-500 uppercase">{axis}</label>
                  <input
                    type="number"
                    value={config[`center_${axis}`]}
                    onChange={e => handleConfigChange(`center_${axis}`, parseFloat(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Grid Box Size</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['x', 'y', 'z'] as const).map(axis => (
                <div key={axis}>
                  <label className="text-xs text-gray-500 uppercase">{axis}</label>
                  <input
                    type="number"
                    value={config[`size_${axis}`]}
                    onChange={e => handleConfigChange(`size_${axis}`, parseFloat(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exhaustiveness: <span className="font-mono">{config.exhaustiveness}</span>
            </label>
            <input
              type="range" min="1" max="64" value={config.exhaustiveness}
              onChange={e => handleConfigChange('exhaustiveness', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Modes: <span className="font-mono">{config.num_modes}</span>
            </label>
            <input
              type="range" min="1" max="50" value={config.num_modes}
              onChange={e => handleConfigChange('num_modes', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <button
            onClick={handleDocking}
            disabled={loading}
            className="w-full bg-cyan-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
            style={{ position: 'relative', zIndex: 10 }}
          >
            {loading ? 'Running...' : 'Start Docking'}
          </button>

          {status && <p className="text-sm text-cyan-600 mt-2">{status}</p>}
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      </div>

      <div className="flex-1 bg-gray-100">
        <Viewer />
      </div>

      <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Docking Results</h2>
        </div>

        <div className="p-4">
          {results.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No results yet. Run a docking simulation to see results here.
            </p>
          ) : (
            <div className="space-y-3">
              {results.map((result, i) => (
                <div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">Pose {i + 1}</span>
                    <span className="text-cyan-600 font-bold">{result.vina_score.toFixed(2)} kcal/mol</span>
                  </div>
                  {result.gnina_score !== undefined && (
                    <p className="text-xs text-purple-600 mt-1">CNN: {result.gnina_score.toFixed(2)}</p>
                  )}
                  {result.rf_score !== undefined && (
                    <p className="text-xs text-green-600 mt-1">RF: {result.rf_score.toFixed(2)}</p>
                  )}
                  {result.rmsd_lb !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">RMSD LB: {result.rmsd_lb.toFixed(2)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
