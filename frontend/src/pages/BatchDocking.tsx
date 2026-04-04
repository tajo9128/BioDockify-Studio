import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { batchDockingAPI, type BatchDockingResult, type BatchDockingProgress } from '@/api/batch-docking'

type Stage = 'input' | 'running' | 'results'

const SAMPLE_SMILES = [
  'CC(=O)Oc1ccccc1C(=O)O',
  'Cn1cnc2c1c(=O)n(c(=O)n2C)C',
  'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
  'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O',
  'CN1CCc2c(O)ccc(c2C1)C(O)=O',
  'CC(=O)Nc1ccc(cc1)O',
  'c1ccc2c(c1)ccc3c2cccc3',
  'CC1=CC=C(C=C1)O',
  'COC1=CC=C(C=C1)CCN',
  'CCN(CC)CCOC(=O)C1=CC=CC=C1C(=O)O',
]

export function BatchDocking() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [stage, setStage] = useState<Stage>('input')
  const [smilesInput, setSmilesInput] = useState('')
  const [receptorContent, setReceptorContent] = useState('')
  const [receptorFile, setReceptorFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'fast' | 'accurate'>('accurate')
  const [batchSize, setBatchSize] = useState(50)
  const [gridConfig, setGridConfig] = useState({
    center_x: 0, center_y: 0, center_z: 0,
    size_x: 20, size_y: 20, size_z: 20,
  })

  const [jobId, setJobId] = useState('')
  const [progress, setProgress] = useState<BatchDockingProgress | null>(null)
  const [results, setResults] = useState<BatchDockingResult | null>(null)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const smilesList = smilesInput.split('\n').map(s => s.trim()).filter(Boolean)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const content = await file.text()
    setReceptorFile(file)
    setReceptorContent(content)
  }

  const handleSmilesFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const content = await file.text()
    // Parse .smi or .csv - extract first column
    const lines = content.split('\n')
    const smiles = lines
      .map(l => l.split(/[,;\t]/)[0].trim())
      .filter(s => s && !s.startsWith('#') && !s.startsWith('SMILES'))
    setSmilesInput(smiles.join('\n'))
  }

  const handleStart = async () => {
    if (!receptorContent.trim()) { setError('Please upload a receptor file'); return }
    if (smilesList.length === 0) { setError('Please enter at least one SMILES'); return }
    if (smilesList.length > 100) { setError('Maximum 100 ligands per batch'); return }

    setError('')
    setStage('running')
    setResults(null)

    try {
      const { job_id } = await batchDockingAPI.start({
        receptor_content: receptorContent,
        smiles_list: smilesList,
        ...gridConfig,
        mode,
        batch_size: batchSize,
      })
      setJobId(job_id)

      // Poll progress
      pollRef.current = window.setInterval(async () => {
        const p = await batchDockingAPI.getProgress(job_id)
        setProgress(p)

        if (p.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current)
          const r = await batchDockingAPI.getResults(job_id)
          setResults(r)
          setStage('results')
        } else if (p.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
          setError('Batch docking failed')
          setStage('input')
        }
      }, 2000)
    } catch (e: any) {
      setError(e.message || 'Failed to start batch docking')
      setStage('input')
    }
  }

  const handleCancel = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setStage('input')
    setJobId('')
    setProgress(null)
  }

  const copySmiles = (smi: string) => navigator.clipboard.writeText(smi)

  const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm transition-all ${
    isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
  } focus:outline-none focus:ring-2 focus:border-transparent`

  const labelClass = `block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`

  // === RENDER: INPUT STAGE ===
  if (stage === 'input') {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Batch Docking</h1>
          <p className="text-gray-500 mt-1">Screen multiple ligands against a single receptor</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠️ {error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ligand Input */}
          <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm p-6 space-y-4`}>
            <h2 className="text-lg font-semibold">Ligands</h2>

            <div>
              <label className={labelClass}>SMILES (one per line)</label>
              <textarea
                value={smilesInput}
                onChange={e => setSmilesInput(e.target.value)}
                placeholder={"CCO\nCC(=O)O\nc1ccccc1"}
                className={`${inputClass} font-mono h-48 resize-none`}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{smilesList.length} ligands</span>
                <button onClick={() => setSmilesInput(SAMPLE_SMILES.join('\n'))} className="text-blue-500 hover:underline">
                  Load 10 samples
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Or upload .smi / .csv file</label>
              <input type="file" accept=".smi,.smiles,.csv,.txt" onChange={handleSmilesFile} className="block w-full text-sm" />
            </div>
          </div>

          {/* Receptor Input */}
          <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm p-6 space-y-4`}>
            <h2 className="text-lg font-semibold">Receptor (Protein)</h2>

            <div>
              <label className={labelClass}>Upload PDB file</label>
              <input type="file" accept=".pdb,.pdbqt" onChange={handleFileUpload} className="block w-full text-sm" />
              {receptorFile && (
                <p className="text-xs text-gray-500 mt-1">Selected: {receptorFile.name}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Or paste PDB content</label>
              <textarea
                value={receptorContent}
                onChange={e => setReceptorContent(e.target.value)}
                placeholder="ATOM      1  N   MET A   1..."
                className={`${inputClass} font-mono h-32 resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Grid Config */}
        <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm p-6`}>
          <h2 className="text-lg font-semibold mb-4">Grid Box</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {(['center_x', 'center_y', 'center_z', 'size_x', 'size_y', 'size_z'] as const).map(key => (
              <div key={key}>
                <label className={labelClass}>{key}</label>
                <input
                  type="number"
                  step="0.1"
                  value={gridConfig[key]}
                  onChange={e => setGridConfig(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Mode & Batch Size */}
        <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm p-6`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Mode</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('fast')}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                    mode === 'fast'
                      ? isDark ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-500 text-blue-700'
                      : isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="font-medium text-sm">⚡ Fast</div>
                  <div className="text-xs text-gray-500 mt-0.5">Vina only</div>
                </button>
                <button
                  onClick={() => setMode('accurate')}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                    mode === 'accurate'
                      ? isDark ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-500 text-blue-700'
                      : isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="font-medium text-sm">🎯 Accurate</div>
                  <div className="text-xs text-gray-500 mt-0.5">Vina → GNINA → RF</div>
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Batch Size: {batchSize}</label>
              <div className="flex gap-3">
                {[
                  { val: 20, label: 'Small' },
                  { val: 50, label: 'Medium' },
                  { val: 100, label: 'Large' },
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setBatchSize(opt.val)}
                    className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                      batchSize === opt.val
                        ? isDark ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-500 text-blue-700'
                        : isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.val} ligands</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!receptorContent.trim() || smilesList.length === 0}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          ▶ Start Batch Docking ({smilesList.length} ligands)
        </button>
      </div>
    )
  }

  // === RENDER: RUNNING STAGE ===
  if (stage === 'running') {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl font-bold">Batch Docking Running</h1>
          <p className="text-gray-500 mt-1">Job: {jobId}</p>
        </div>

        <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm p-6 space-y-4`}>
          {/* Stage indicator */}
          <div className="flex items-center gap-2">
            {['vina', 'gnina', 'ranking', 'completed'].map((s, i) => {
              const stages = ['vina', 'gnina', 'ranking', 'completed']
              const currentIdx = stages.indexOf(progress?.stage || 'vina')
              const isActive = i <= currentIdx
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {i + 1}
                  </div>
                  <span className={`ml-2 text-sm capitalize ${isActive ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                    {s === 'gnina' ? (mode === 'accurate' ? 'GNINA' : 'Skip') : s}
                  </span>
                  {i < 3 && <div className={`flex-1 h-0.5 mx-2 ${isActive ? 'bg-blue-600' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />}
                </div>
              )
            })}
          </div>

          {/* Progress details */}
          {progress && (
            <div className="space-y-3 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Overall Progress</span>
                <span className="font-medium">{progress.progress_percent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="h-3 bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress.progress_percent}%` }} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="text-xs text-gray-500">Vina</div>
                  <div className="text-lg font-bold">{progress.vina_done}/{progress.vina_total}</div>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="text-xs text-gray-500">GNINA</div>
                  <div className="text-lg font-bold">{progress.gnina_done}/{progress.gnina_total}</div>
                </div>
              </div>

              {progress.errors > 0 && (
                <div className="text-sm text-red-500">⚠️ {progress.errors} ligand(s) failed</div>
              )}
            </div>
          )}

          <button onClick={handleCancel} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // === RENDER: RESULTS STAGE ===
  if (stage === 'results' && results) {
    const top5 = results.top_5 || []
    const allResults = results.all_results || []
    const displayResults = showAll ? allResults : top5

    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Batch Docking Results</h1>
            <p className="text-gray-500 mt-1">
              {results.total_ligands} ligands screened → {results.vina_completed} Vina → {results.gnina_completed} GNINA
              {results.errors > 0 && ` → ${results.errors} failed`}
            </p>
          </div>
          <button
            onClick={() => { setStage('input'); setResults(null); setProgress(null) }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            + New Batch
          </button>
        </div>

        {/* Top 5 Header */}
        {!showAll && top5.length > 0 && (
          <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <span className="font-semibold text-green-700">Top {top5.length} Diverse Ligands</span>
              <span className="text-sm text-gray-500">(filtered by composite score + Tanimoto diversity)</span>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">SMILES</th>
                  <th className="px-4 py-3">MW</th>
                  <th className="px-4 py-3">LogP</th>
                  <th className="px-4 py-3">QED</th>
                  <th className="px-4 py-3">Vina</th>
                  <th className="px-4 py-3">GNINA</th>
                  <th className="px-4 py-3">RF</th>
                  <th className="px-4 py-3">Final</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayResults.map((lig: any, i: number) => (
                  <tr
                    key={i}
                    className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} ${
                      lig.is_top5 ? (isDark ? 'bg-green-900/10' : 'bg-green-50') : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        lig.is_top5 ? 'bg-green-600 text-white' : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {lig.rank || i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs max-w-xs truncate" title={lig.smiles}>{lig.smiles}</td>
                    <td className="px-4 py-3">{lig.mw ?? '-'}</td>
                    <td className="px-4 py-3">{lig.logp ?? '-'}</td>
                    <td className="px-4 py-3">{lig.qed?.toFixed(2) ?? '-'}</td>
                    <td className={`px-4 py-3 font-medium ${lig.vina_score != null && lig.vina_score <= -7 ? 'text-green-600' : ''}`}>
                      {lig.vina_score?.toFixed(2) ?? '-'}
                    </td>
                    <td className="px-4 py-3">{lig.gnina_score?.toFixed(2) ?? (lig.failed ? 'FAIL' : '-')}</td>
                    <td className="px-4 py-3">{lig.rf_score?.toFixed(2) ?? '-'}</td>
                    <td className="px-4 py-3 font-bold">{lig.final_score?.toFixed(3) ?? '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => copySmiles(lig.smiles)} className="text-blue-600 hover:text-blue-800 text-xs">
                          Copy
                        </button>
                        {lig.reasons && lig.reasons.length > 0 && (
                          <span className="relative group cursor-help" title={lig.reasons.join(', ')}>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Show all toggle */}
        {allResults.length > top5.length && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-800"
          >
            {showAll ? '▲ Show top 5 only' : `▼ Show all ${allResults.length} ligands (${allResults.length - top5.length} eliminated)`}
          </button>
        )}

        {/* Errors */}
        {results.errors_detail && results.errors_detail.length > 0 && (
          <div className={`rounded-lg border p-4 ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
            <h3 className="font-semibold text-red-700 mb-2">Failed Ligands ({results.errors_detail.length})</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {results.errors_detail.map((e: any, i: number) => (
                <div key={i} className="text-xs text-red-600 font-mono">
                  {e.smiles}: {e.error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pipeline info */}
        <div className={`text-xs text-gray-400 p-3 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
          Pipeline: Vina → Filter (≤{results.filter_threshold} OR top {results.filter_top_n}) → GNINA → Tanimoto diversity (0.85) → Top 5 by final score
          {results.mode === 'fast' && ' (Fast mode: Vina only)'}
        </div>
      </div>
    )
  }

  return null
}
