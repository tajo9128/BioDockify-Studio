import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatusBar } from '@/components/StatusBar'
import { useTheme } from '@/contexts/ThemeContext'

export function Layout() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden transition-colors ${
      isDark ? 'bg-gray-900' : 'bg-gray-100'
    }`}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={`flex-1 overflow-y-auto transition-colors ${
          isDark ? 'bg-gray-800' : 'bg-gray-50'
        }`}>
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  )
}
