import { useEffect, useRef, useState } from 'react'
import { Card, Button } from '@/components/ui'

const VIEW_STYLES = [
  { id: 'stick', label: 'Stick' },
  { id: 'ball', label: 'Ball & Stick' },
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'surface', label: 'Surface' },
  { id: 'sphere', label: 'Spacefill' },
]

const COLOR_SCHEMES = [
  { id: 'element', label: 'Element' },
  { id: 'sstruc', label: 'Secondary Structure' },
  { id: 'chain', label: 'Chain' },
  { id: 'bfactor', label: 'B-Factor' },
]

export function Viewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const [style, setStyle] = useState('stick')
  const [colorScheme, setColorScheme] = useState('element')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !window.$3Dmol) return

    const viewer = window.$3Dmol.createViewer(containerRef.current, {
      backgroundColor: 'white',
    })

    viewerRef.current = viewer

    // Add a sample protein (lysozyme fragment for demo)
    const samplePDB = `
ATOM      1  N   GLY A   1      11.281  29.725   6.159  1.00 26.73           N
ATOM      2  CA  GLY A   1      11.937  28.442   6.456  1.00 26.73           C
ATOM      3  C   GLY A   1      11.083  27.214   6.115  1.00 26.73           C
ATOM      4  O   GLY A   1      10.049  27.297   5.428  1.00 26.73           O
ATOM      5  N   ALA A   2      11.513  26.029   6.568  1.00 26.73           N
ATOM      6  CA  ALA A   2      10.789  24.775   6.320  1.00 26.73           C
ATOM      7  C   ALA A   2       9.305  24.926   6.563  1.00 26.73           C
ATOM      8  O   ALA A   2       8.542  24.959   5.573  1.00 26.73           O
ATOM      9  N   VAL A   3       8.858  25.035   7.815  1.00 26.73           N
ATOM     10  CA  VAL A   3       7.452  25.171   8.138  1.00 26.73           C
    `

    viewer.addModel(samplePDB, 'pdb')
    viewer.setStyle({}, { [style]: {} })
    viewer.zoomTo()
    viewer.render()
    setLoaded(true)

    return () => {
      viewer.clear()
    }
  }, [])

  const updateStyle = (newStyle: string) => {
    setStyle(newStyle)
    if (viewerRef.current) {
      viewerRef.current.setStyle({}, { [newStyle]: {} })
      viewerRef.current.render()
    }
  }

  const handleRotate = () => {
    if (!viewerRef.current) return
    const viewer = viewerRef.current
    let rotating = true
    const rotate = () => {
      if (!rotating || !viewerRef.current) return
      viewer.rotate(2, { x: 0, y: 1, z: 0 })
      viewer.render()
      requestAnimationFrame(rotate)
    }
    rotate()
    setTimeout(() => { rotating = false }, 5000)
  }

  const handleZoomFit = () => {
    if (!viewerRef.current) return
    viewerRef.current.zoomTo()
    viewerRef.current.render()
  }

  const handleReset = () => {
    if (!viewerRef.current) return
    viewerRef.current.reset()
    viewerRef.current.zoomTo()
    viewerRef.current.render()
  }

  const handleScreenshot = () => {
    if (!viewerRef.current) return
    const png = viewerRef.current.png()
    const link = document.createElement('a')
    link.download = `molecule_${Date.now()}.png`
    link.href = png
    link.click()
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">3D Molecular Viewer</h1>
        <p className="text-text-secondary mt-1">Visualize protein-ligand complexes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Viewer */}
        <div className="lg:col-span-3">
          <Card padding="none" className="overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-surface-secondary border-b border-border-light">
              {[
                { icon: '⟳', label: 'Rotate', handler: handleRotate },
                { icon: '⊕', label: 'Zoom Fit', handler: handleZoomFit },
                { icon: '↺', label: 'Reset', handler: handleReset },
                { icon: '📷', label: 'Screenshot', handler: handleScreenshot },
              ].map((btn) => (
                <Button
                  key={btn.label}
                  variant="outline"
                  size="sm"
                  onClick={btn.handler}
                >
                  {btn.icon} {btn.label}
                </Button>
              ))}
            </div>

            {/* 3D Viewer */}
            <div
              ref={containerRef}
              className="w-full h-[500px] bg-gray-100"
              style={{ position: 'relative' }}
            />

            {/* Status */}
            <div className="flex items-center justify-between p-3 bg-surface-secondary border-t border-border-light text-xs text-text-secondary">
              <span>{loaded ? '🧬 Sample structure loaded' : 'Loading...'}</span>
              <span>X: -- Y: -- Z: --</span>
            </div>
          </Card>
        </div>

        {/* Style Panel */}
        <Card>
          <h3 className="font-bold text-text-primary mb-4">Display Style</h3>

          <div className="space-y-2 mb-6">
            {VIEW_STYLES.map((s) => (
              <Button
                key={s.id}
                variant={style === s.id ? 'primary' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => updateStyle(s.id)}
              >
                {s.label}
              </Button>
            ))}
          </div>

          <h3 className="font-bold text-text-primary mb-4">Color Scheme</h3>
          <div className="space-y-2">
            {COLOR_SCHEMES.map((c) => (
              <Button
                key={c.id}
                variant={colorScheme === c.id ? 'primary' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setColorScheme(c.id)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
