import { useState } from 'react'

interface ExportPanelProps {
  viewerRef: React.RefObject<HTMLDivElement>
  isDark: boolean
}

export function ExportPanel({ viewerRef, isDark }: ExportPanelProps) {
  const [format, setFormat] = useState<'png' | 'svg'>('png')
  const [dpi, setDpi] = useState(300)
  const [bgColor, setBgColor] = useState('#1a1a2e')

  const exportImage = async () => {
    const canvas = viewerRef.current?.querySelector('canvas')
    if (!canvas) return

    const scale = dpi / 72
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width * scale
    exportCanvas.height = canvas.height * scale
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height)

    const link = document.createElement('a')
    link.download = `biodockify_${Date.now()}.${format}`
    link.href = exportCanvas.toDataURL('image/png')
    link.click()
  }

  const exportSVG = async () => {
    const canvas = viewerRef.current?.querySelector('canvas')
    if (!canvas) return

    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <img src="${canvas.toDataURL('image/png')}" width="${canvas.width}" height="${canvas.height}"/>
        </div>
      </foreignObject>
    </svg>`

    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.download = `biodockify_${Date.now()}.svg`
    link.href = URL.createObjectURL(blob)
    link.click()
  }

  return (
    <div className={`p-3 rounded-lg border ${isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
      <h4 className="font-medium text-sm mb-2">📸 Export Figure</h4>
      <div className="flex gap-2 items-center mb-2">
        <select value={format} onChange={e => setFormat(e.target.value as any)}
          className={`text-xs p-1 rounded ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
          <option value="png">PNG</option>
          <option value="svg">SVG</option>
        </select>
        <select value={dpi} onChange={e => setDpi(Number(e.target.value))}
          className={`text-xs p-1 rounded ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
          <option value={72}>72 DPI</option>
          <option value={150}>150 DPI</option>
          <option value={300}>300 DPI</option>
        </select>
        <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer" />
      </div>
      <button onClick={format === 'png' ? exportImage : exportSVG}
        className="w-full py-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded">
        Export {format.toUpperCase()}
      </button>
    </div>
  )
}
