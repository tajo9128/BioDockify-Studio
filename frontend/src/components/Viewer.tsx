import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    NGL: any
  }
}

interface ViewerProps {
  pdbData?: string
  ligandPdb?: string
  receptorPdb?: string
  representation?: 'cartoon' | 'surface' | 'stick' | 'ball+stick' | 'line'
  colorScheme?: 'chainid' | 'element' | 'bfactor' | 'hydrophobicity'
  showSurface?: boolean
  showCartoon?: boolean
  showLigand?: boolean
  showBindingSite?: boolean
  width?: string
  height?: string
  backgroundColor?: string
}

export function Viewer({
  pdbData,
  ligandPdb,
  receptorPdb,
  representation = 'cartoon',
  colorScheme = 'chainid',
  showSurface = false,
  showCartoon = true,
  showLigand = true,
  showBindingSite = true,
  width = '100%',
  height = '100%',
  backgroundColor = '#1a1a2e'
}: ViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!viewerRef.current) return

    const loadNGL = async () => {
      if (window.NGL) {
        initViewer()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/ngl@2.3.0/dist/ngl.js'
      script.onload = () => initViewer()
      script.onerror = () => setError('Failed to load 3D viewer')
      document.head.appendChild(script)
    }

    const initViewer = () => {
      if (!viewerRef.current || !window.NGL) return

      if (stageRef.current) {
        stageRef.current.dispose()
      }

      const stage = new window.NGL.Stage(viewerRef.current, {
        backgroundColor,
        antialias: true,
        tooltip: true
      })
      stageRef.current = stage

      if (pdbData) {
        const blob = new Blob([pdbData], { type: 'text/plain' })
        stage.loadFile(URL.createObjectURL(blob), { ext: 'pdb' }).then((component: any) => {
          addRepresentations(component)
          component.autoView()
          setLoaded(true)
        }).catch((e: any) => {
          setError(`Failed to load structure: ${e.message}`)
        })
      } else if (receptorPdb) {
        const blob = new Blob([receptorPdb], { type: 'text/plain' })
        stage.loadFile(URL.createObjectURL(blob), { ext: 'pdb' }).then((component: any) => {
          if (showCartoon) {
            component.addRepresentation('cartoon', {
              color: colorScheme,
              opacity: 0.8,
              smoothness: 3
            })
          }
          if (showSurface) {
            component.addRepresentation('surface', {
              opacity: 0.3,
              color: colorScheme === 'hydrophobicity' ? 'hydrophobicity' : 'chainid'
            })
          }
          if (showBindingSite && ligandPdb) {
            component.addRepresentation('licorice', {
              sele: 'around 5 of ligand',
              color: 'element',
              radius: 0.15
            })
          }
          if (showLigand && ligandPdb) {
            const ligBlob = new Blob([ligandPdb], { type: 'text/plain' })
            stage.loadFile(URL.createObjectURL(ligBlob), { ext: 'pdb' }).then((ligComp: any) => {
              ligComp.addRepresentation('ball+stick', {
                color: 'element',
                radius: 0.3,
                multipleBond: true
              })
              component.autoView()
            })
          } else {
            component.autoView()
          }
          setLoaded(true)
        }).catch((e: any) => setError(`Failed to load: ${e.message}`))
      } else {
        setLoaded(true)
      }
    }

    loadNGL()

    return () => {
      if (stageRef.current) {
        stageRef.current.dispose()
        stageRef.current = null
      }
    }
  }, [pdbData, receptorPdb, ligandPdb, showCartoon, showSurface, showLigand, showBindingSite, colorScheme, backgroundColor])

  const addRepresentations = (component: any) => {
    if (showCartoon) {
      component.addRepresentation('cartoon', {
        color: colorScheme,
        opacity: 0.8,
        smoothness: 3
      })
    }
    if (showSurface) {
      component.addRepresentation('surface', {
        opacity: 0.3,
        color: colorScheme === 'hydrophobicity' ? 'hydrophobicity' : 'chainid'
      })
    }
    if (representation === 'stick') {
      component.addRepresentation('licorice', { color: 'element', radius: 0.15 })
    } else if (representation === 'ball+stick') {
      component.addRepresentation('ball+stick', { color: 'element', radius: 0.3 })
    } else if (representation === 'line') {
      component.addRepresentation('line', { color: 'element' })
    }
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-red-400">
          <p className="text-lg">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={viewerRef} style={{ width, height, minHeight: '400px' }}>
      {!loaded && (
        <div className="flex items-center justify-center h-full text-gray-500">
          Loading 3D viewer...
        </div>
      )}
    </div>
  )
}
