import { useState, useRef } from 'react'
import { Card, Button } from '@/components/ui'
import { calculateRMSD } from '@/api/analysis'

export function RMSDAnalysis() {
  const [pdb1, setPdb1] = useState('')
  const [pdb2, setPdb2] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Array<{ pdb1Name: string; pdb2Name: string; rmsd: number; timestamp: string }>>([])
  const file1Ref = useRef<HTMLInputElement>(null)
  const file2Ref = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File, setter: (v: string) => void) => {
    try {
      const text = await file.text()
      setter(text)
    } catch {
      setError(`Failed to read file: ${file.name}`)
    }
  }

  const handleCalculate = async () => {
    if (!pdb1.trim() || !pdb2.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await calculateRMSD(pdb1, pdb2)
      if (data.rmsd < 0) {
        setError('Invalid PDB content or too few atoms for RMSD calculation')
      } else {
        setResult(data.rmsd)
        setHistory(prev => [{
          pdb1Name: 'Pose 1',
          pdb2Name: 'Pose 2',
          rmsd: data.rmsd,
          timestamp: new Date().toLocaleTimeString(),
        }, ...prev].slice(0, 10))
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'RMSD calculation failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const getQualityLabel = (rmsd: number) => {
    if (rmsd < 1.0) return { label: 'Excellent', color: 'text-green-400' }
    if (rmsd < 2.0) return { label: 'Good', color: 'text-blue-400' }
    if (rmsd < 3.0) return { label: 'Moderate', color: 'text-yellow-400' }
    return { label: 'Poor', color: 'text-red-400' }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">RMSD Analysis</h1>
        <p className="text-text-secondary mt-1">Calculate RMSD between molecular poses using Kabsch algorithm</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="font-bold text-text-primary mb-4">Input Structures</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-text-secondary">Reference Pose</label>
                  <button
                    onClick={() => file1Ref.current?.click()}
                    className="text-xs text-primary hover:underline"
                  >
                    Upload PDB
                  </button>
                  <input
                    ref={file1Ref}
                    type="file"
                    accept=".pdb,.pdbqt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFileUpload(f, setPdb1)
                    }}
                  />
                </div>
                <textarea
                  value={pdb1}
                  onChange={(e) => setPdb1(e.target.value)}
                  placeholder="Paste PDB content..."
                  rows={10}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-text-secondary">Mobile Pose</label>
                  <button
                    onClick={() => file2Ref.current?.click()}
                    className="text-xs text-primary hover:underline"
                  >
                    Upload PDB
                  </button>
                  <input
                    ref={file2Ref}
                    type="file"
                    accept=".pdb,.pdbqt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFileUpload(f, setPdb2)
                    }}
                  />
                </div>
                <textarea
                  value={pdb2}
                  onChange={(e) => setPdb2(e.target.value)}
                  placeholder="Paste PDB content..."
                  rows={10}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                />
              </div>
            </div>
            <Button onClick={handleCalculate} disabled={!pdb1.trim() || !pdb2.trim() || loading} className="mt-4">
              {loading ? 'Calculating...' : 'Calculate RMSD'}
            </Button>

            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {result !== null && result >= 0 && (
              <div className="mt-4 p-6 bg-gray-800 rounded-lg text-center">
                <p className="text-sm text-gray-400">RMSD (Kabsch-aligned)</p>
                <p className="text-4xl font-bold text-primary mt-1">{result.toFixed(3)} Å</p>
                <p className={`text-sm mt-2 font-medium ${getQualityLabel(result).color}`}>
                  {getQualityLabel(result).label}
                </p>
              </div>
            )}
          </Card>

          {history.length > 0 && (
            <Card>
              <h3 className="font-bold text-text-primary mb-4">Calculation History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-left text-gray-400">
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">Reference</th>
                      <th className="pb-2 font-medium">Mobile</th>
                      <th className="pb-2 font-medium">RMSD</th>
                      <th className="pb-2 font-medium">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2 text-gray-400">{h.timestamp}</td>
                        <td className="py-2 text-white">{h.pdb1Name}</td>
                        <td className="py-2 text-white">{h.pdb2Name}</td>
                        <td className="py-2 font-mono text-primary">{h.rmsd.toFixed(3)} Å</td>
                        <td className={`py-2 font-medium ${getQualityLabel(h.rmsd).color}`}>
                          {getQualityLabel(h.rmsd).label}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="font-bold text-text-primary mb-4">Quality Scale</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-gray-800 rounded">
                <span className="text-gray-400">Excellent</span>
                <span className="text-green-400 font-semibold">&lt; 1.0 Å</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-800 rounded">
                <span className="text-gray-400">Good</span>
                <span className="text-blue-400 font-semibold">1.0 - 2.0 Å</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-800 rounded">
                <span className="text-gray-400">Moderate</span>
                <span className="text-yellow-400 font-semibold">2.0 - 3.0 Å</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-800 rounded">
                <span className="text-gray-400">Poor</span>
                <span className="text-red-400 font-semibold">&gt; 3.0 Å</span>
              </div>
            </div>
          </Card>

          <Card className="bg-blue-500/5 border-blue-500/20">
            <h4 className="font-medium text-blue-400 mb-2">Kabsch Algorithm</h4>
            <p className="text-xs text-text-secondary">
              RMSD is calculated after optimal rotational and translational superposition using the Kabsch algorithm.
              This ensures structures are aligned before comparison, giving scientifically meaningful results.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
