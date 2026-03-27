import { useHealth, useGPU } from '@/hooks'

export function StatusBar() {
  const { data: health } = useHealth()
  const { data: gpu } = useGPU()

  const isBackendConnected = health?.status === 'healthy'
  const isOllamaAvailable = health?.ollama?.status === 'available'
  const hasGPU = gpu?.available && gpu.gpus.length > 0

  return (
    <footer className="h-8 bg-background-dark text-gray-400 flex items-center px-4 text-xs border-t border-gray-800">
      {/* Backend Status */}
      <div className="flex items-center gap-1.5">
        <span className={isBackendConnected ? 'text-green-400' : 'text-red-400'}>●</span>
        <span>Backend: {isBackendConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      <div className="mx-3 text-gray-700">|</div>

      {/* GPU Status */}
      <div className="flex items-center gap-1.5">
        <span className={hasGPU ? 'text-green-400' : 'text-gray-500'}>🖥</span>
        <span>GPU: {hasGPU ? gpu.gpus[0].name : 'Not detected'}</span>
      </div>

      <div className="mx-3 text-gray-700">|</div>

      {/* AI Status */}
      <div className="flex items-center gap-1.5">
        <span className={isOllamaAvailable ? 'text-green-400' : 'text-gray-500'}>🤖</span>
        <span>AI: {isOllamaAvailable ? 'Ollama available' : 'Offline'}</span>
      </div>

      <div className="flex-1" />

      {/* Docker Status */}
      <div className="flex items-center gap-1.5">
        <span className="text-green-400">●</span>
        <span>Docker Running</span>
      </div>

      <div className="mx-3 text-gray-700">|</div>

      <span className="text-gray-500">v1.2.3</span>
    </footer>
  )
}
