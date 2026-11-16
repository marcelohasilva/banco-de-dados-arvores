import type { DatabaseManager } from '../../database/DatabaseManager'
import type { NavigationItem } from '../../types/navigation'

export function Topbar({ activeItem, manager }: { activeItem: NavigationItem; manager: DatabaseManager }) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6 lg:px-10">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span className="hidden sm:inline">Workspace</span>
        <span className="hidden sm:inline">/</span>
        <span className="font-medium text-slate-700">{activeItem}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline">
          {manager.listTables().length} tabelas · local
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
          MS
        </div>
      </div>
    </header>
  )
}
