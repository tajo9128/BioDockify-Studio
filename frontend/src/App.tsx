import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Docking } from '@/pages/Docking'
import { JobQueue } from '@/pages/JobQueue'
import { Results } from '@/pages/Results'
import { AIAssistant } from '@/pages/AIAssistant'
import { Settings } from '@/pages/Settings'
import { MoleculeDynamics } from '@/pages/MoleculeDynamics'
import { useTheme } from '@/contexts/ThemeContext'

function NotFound() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <div className={`flex flex-col items-center justify-center h-full gap-4 ${
      isDark ? 'text-gray-300' : 'text-gray-600'
    }`}>
      <span className="text-6xl font-bold opacity-20">404</span>
      <p className="text-lg font-medium">Page not found</p>
      <a href="/" className="text-blue-500 hover:underline text-sm">Go to Dashboard</a>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/docking" element={<Docking />} />
          <Route path="/md" element={<MoleculeDynamics />} />
          <Route path="/jobs" element={<JobQueue />} />
          <Route path="/results" element={<Results />} />
          <Route path="/ai" element={<AIAssistant />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
