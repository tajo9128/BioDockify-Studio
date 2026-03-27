import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { StatusBar } from '@/components/StatusBar'

export function Layout() {
  return (
    <div className="h-screen w-screen flex flex-col bg-surface-tertiary overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  )
}
