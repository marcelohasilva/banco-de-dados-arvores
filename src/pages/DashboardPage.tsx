import type { NavigationItem } from '../types/navigation'

interface DashboardPageProps {
  activeItem: NavigationItem
}

const futureFeatures = [
  { title: 'Tabelas', description: 'Defina tabelas e suas colunas.', icon: '▦' },
  { title: 'Consultas', description: 'Explore dados com filtros.', icon: '⌕' },
  { title: 'Árvores', description: 'Visualize a estrutura AVL.', icon: '⌁' },
]

export function DashboardPage({ activeItem }: DashboardPageProps) {
  const isOverview = activeItem === 'Visão geral'

  return (
    <section>
      <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold text-brand">Database Studio</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {isOverview ? 'Bem-vindo ao seu workspace.' : activeItem}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            {isOverview
              ? 'Uma base organizada para construir e explorar seu banco de dados relacional.'
              : 'Esta área está preparada para receber os próximos módulos do projeto.'}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-500 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Fundação inicial
        </span>
      </div>

      {isOverview && (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {futureFeatures.map((feature) => (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={feature.title}>
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-lg text-brand">
                  {feature.icon}
                </div>
                <h2 className="text-sm font-bold text-slate-800">{feature.title}</h2>
                <p className="mt-1 text-xs text-slate-400">{feature.description}</p>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Em breve
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-slate-900 p-7 text-white shadow-xl shadow-slate-200 md:p-9">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Próxima etapa</p>
            <h2 className="text-xl font-bold">Modele o seu primeiro banco de dados</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-300">
              A interface está pronta. Em seguida, a implementação própria da árvore AVL poderá
              armazenar os registros pela chave primária.
            </p>
          </div>
        </>
      )}
    </section>
  )
}
