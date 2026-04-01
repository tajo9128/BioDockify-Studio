import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export function StatusBar() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [gpuStatus, setGpuStatus] = useState<string>('Checking...')
  const [jobs] = useState(0)
  
  useEffect(() => {
    fetch('/api/gpu/status')
      .then(r => r.json())
      .then(d => setGpuStatus(d.available ? 'Available' : 'CPU Only'))
      .catch(() => setGpuStatus('Unknown'))
  }, [])
  
  return (
    <footer className={`px-4 py-1.5 text-xs flex items-center justify-between transition-colors ${
      isDark 
        ? 'bg-gray-800 text-gray-400 border-t border-gray-700' 
        : 'bg-white text-gray-500 border-t border-gray-200'
    }`}>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Ready
        </span>
        <span>GPU: {gpuStatus}</span>
      </div>
      <div className="flex items-center gap-4">
        <span>Jobs: {jobs}</span>
        <span>v2.3.5</span>
      </div>
    </footer>
  )
}
