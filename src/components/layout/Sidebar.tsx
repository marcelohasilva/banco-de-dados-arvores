import type { NavigationEntry, NavigationItem } from '../../types/navigation'

const navigation: NavigationEntry[] = [
  { label: 'Visão geral', icon: '⌂' },
  { label: 'Tabelas', icon: '▦' },
  { label: 'Consultas', icon: '⌕' },
  { label: 'Árvores', icon: '⌁' },
  { label: 'Relacionamentos', icon: '⌘' },
]

interface SidebarProps {
  activeItem: NavigationItem
  onNavigate: (item: NavigationItem) => void
}

export function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-7">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white shadow-sm shadow-blue-200">
          D
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-900">Database Studio</p>
          <p className="text-[11px] font-medium text-slate-400">Relational workspace</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-8">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Workspace
        </p>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = item.label === activeItem
            return (
              <button
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-brand'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
                key={item.label}
                onClick={() => onNavigate(item.label)}
                type="button"
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-slate-100 p-5">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-700">Projeto acadêmico</p>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            Fundação pronta para sua estrutura de dados.
          </p>
        </div>
      </div>
    </aside>
  )
}
