import { useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { DatabaseWorkspace } from './components/database/DatabaseWorkspace'
import { DatabaseManager } from './database/DatabaseManager'
import type { NavigationItem } from './types/navigation'

function App() {
  const [activeItem, setActiveItem] = useState<NavigationItem>('Visão geral')
  const [manager] = useState(() => DatabaseManager.open('database-studio', 'Workspace local'))
  const [, setVersion] = useState(0)

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Sidebar activeItem={activeItem} onNavigate={setActiveItem} />
      <div className="lg:pl-64">
        <Topbar activeItem={activeItem} manager={manager} />
        <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
          <DatabaseWorkspace
            activeItem={activeItem}
            manager={manager}
            onChange={() => setVersion((version) => version + 1)}
            onNavigate={setActiveItem}
          />
        </main>
      </div>
    </div>
  )
}

export default App
