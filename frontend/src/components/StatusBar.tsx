import { useTheme } from '@/contexts/ThemeContext'

export function StatusBar() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
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
      </div>
      <div className="flex items-center gap-4">
        <span>v4.2.1</span>
      </div>
    </footer>
  )
}
