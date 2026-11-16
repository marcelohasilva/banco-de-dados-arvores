import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { DatabaseManager } from '../../database/DatabaseManager'
import type { AVLVisualNode } from '../../structures/AVLTree'
import type {
  DatabaseColumn,
  DatabaseDataType,
  DatabaseFilter,
  DatabaseRecord,
  DatabaseTableDefinition,
  DatabaseValue,
  QueryOperator,
} from '../../types/database'
import type { NavigationItem } from '../../types/navigation'

const dataTypes: DatabaseDataType[] = ['string', 'int', 'float', 'boolean', 'date']
const operators: QueryOperator[] = ['=', '!=', '>', '<', '>=', '<=']

interface DatabaseWorkspaceProps {
  manager: DatabaseManager
  activeItem: string
  onChange: () => void
  onNavigate: (item: NavigationItem) => void
}

interface ColumnDraft {
  name: string
  dataType: DatabaseDataType
  nullable: boolean
  primaryKey: boolean
  foreignTable: string
  foreignColumn: string
}

interface Feedback {
  type: 'success' | 'error'
  message: string
}

interface FilterDraft extends Omit<DatabaseFilter, 'value'> {
  value: DatabaseValue | ''
}

export function DatabaseWorkspace({
  manager,
  activeItem,
  onChange,
  onNavigate,
}: DatabaseWorkspaceProps) {
  const [selectedTable, setSelectedTable] = useState<string | undefined>(
    manager.listTables()[0]?.name,
  )
  const [feedback, setFeedback] = useState<Feedback | undefined>()

  const report = (action: () => void, success?: string) => {
    try {
      action()
      onChange()
      if (success) setFeedback({ type: 'success', message: success })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível concluir a operação.',
      })
    }
  }

  const currentTable = selectedTable ? manager.getTable(selectedTable) : undefined
  const selectTable = (name: string) => {
    setSelectedTable(name)
    onNavigate('Tabelas')
    setFeedback(undefined)
  }

  return (
    <>
      {feedback && (
        <div
          className={`mb-6 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
          role="alert"
        >
          <span>{feedback.message}</span>
          <button className="font-bold opacity-60 hover:opacity-100" onClick={() => setFeedback(undefined)} type="button">
            ×
          </button>
        </div>
      )}
      {activeItem === 'Visão geral' && (
        <Overview manager={manager} onSelectTable={selectTable} onNavigate={onNavigate} onReport={setFeedback} onRefresh={onChange} />
      )}
      {activeItem === 'Tabelas' && (
        <TablesView
          manager={manager}
          selectedTable={selectedTable}
          onSelectTable={setSelectedTable}
          onTableDeleted={() => setSelectedTable(undefined)}
          onRefresh={onChange}
          onReport={setFeedback}
        />
      )}
      {activeItem === 'Consultas' && (
        <QueriesView manager={manager} selectedTable={selectedTable} onSelectTable={setSelectedTable} />
      )}
      {activeItem === 'Árvores' && (
        <TreesView manager={manager} selectedTable={selectedTable} onSelectTable={setSelectedTable} />
      )}
      {activeItem === 'Relacionamentos' && (
        <RelationshipsView manager={manager} onSelectTable={setSelectedTable} />
      )}
      {currentTable && activeItem === 'Visão geral' && (
        <div className="mt-8">
          <TablePreview table={currentTable} />
        </div>
      )}
      <div className="sr-only" aria-live="polite">
        {feedback?.message}
      </div>
    </>
  )
}

function Overview({
  manager,
  onSelectTable,
  onNavigate,
  onReport,
  onRefresh,
}: {
  manager: DatabaseManager
  onSelectTable: (name: string) => void
  onNavigate: (item: 'Visão geral' | 'Tabelas' | 'Consultas') => void
  onReport: (feedback: Feedback) => void
  onRefresh: () => void
}) {
  const tables = manager.listTables()
  const totalRecords = tables.reduce((total, table) => total + table.recordCount, 0)
  return (
    <section>
      <PageHeader
        eyebrow="Database Studio"
        title="Seu banco, em um só lugar."
        description="Modele tabelas, gerencie registros e consulte seus dados com a árvore AVL."
        action={<div className="flex flex-wrap gap-2"><DataActions manager={manager} onReport={onReport} onRefresh={onRefresh} /><button className="primary-button" onClick={() => onNavigate('Tabelas')} type="button">+ Nova tabela</button></div>}
      />
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <StatCard label="Banco de dados" value={manager.name} detail={manager.description || 'Workspace local'} />
        <StatCard label="Tabelas" value={String(tables.length)} detail="Estruturas disponíveis" />
        <StatCard label="Registros" value={String(totalRecords)} detail="Armazenados nas árvores AVL" />
      </div>
      <section className="panel">
        <div className="panel-header">
          <div><h2 className="section-title">Tabelas recentes</h2><p className="section-caption">Selecione uma tabela para visualizar seus registros.</p></div>
          <button className="secondary-button" onClick={() => onNavigate('Tabelas')} type="button">Gerenciar tabelas</button>
        </div>
        {tables.length === 0 ? <EmptyState title="Nenhuma tabela criada" description="Comece criando o primeiro esquema do seu banco." action="Criar tabela" onAction={() => onNavigate('Tabelas')} /> : (
          <div className="divide-y divide-slate-100">
            {tables.map((table) => (
              <button className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-slate-50" key={table.name} onClick={() => onSelectTable(table.name)} type="button">
                <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-brand">▦</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">{table.name}</span><span className="block truncate text-xs text-slate-400">{table.columns.length} colunas · {table.description || 'Sem descrição'}</span></span></span>
                <span className="whitespace-nowrap text-xs font-semibold text-slate-500">{table.recordCount} registros →</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}

function TablesView({
  manager,
  selectedTable,
  onSelectTable,
  onTableDeleted,
  onRefresh,
  onReport,
}: {
  manager: DatabaseManager
  selectedTable?: string
  onSelectTable: (name: string) => void
  onTableDeleted: () => void
  onRefresh: () => void
  onReport: (feedback: Feedback) => void
}) {
  const [showDesigner, setShowDesigner] = useState(manager.listTables().length === 0)
  const table = selectedTable ? manager.getTable(selectedTable) : undefined
  const deleteTable = (tableName: string) => {
    if (!window.confirm(`Excluir a tabela "${tableName}"? Todos os registros serão removidos.`)) {
      return
    }
    try {
      const removed = manager.dropTable(tableName)
      if (!removed) {
        onReport({ type: 'error', message: `A tabela "${tableName}" não foi encontrada.` })
        return
      }
      if (selectedTable === tableName) {
        onTableDeleted()
      }
      onRefresh()
      onReport({ type: 'success', message: `Tabela "${tableName}" excluída com sucesso.` })
    } catch (error) {
      onReport({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível excluir a tabela.',
      })
    }
  }
  return (
    <section>
      <PageHeader eyebrow="Workspace / Tabelas" title="Estruturas e registros" description="Crie esquemas e trabalhe diretamente sobre os dados armazenados na AVL." action={<button className="primary-button" onClick={() => setShowDesigner(true)} type="button">+ Nova tabela</button>} />
      {showDesigner && <TableDesigner manager={manager} onCancel={() => setShowDesigner(false)} onCreated={(name) => { onSelectTable(name); setShowDesigner(false); onRefresh(); onReport({ type: 'success', message: `Tabela "${name}" criada com sucesso.` }) }} onError={(message) => onReport({ type: 'error', message })} />}
      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <section className="panel h-fit">
          <div className="panel-header"><div><h2 className="section-title">Tabelas</h2><p className="section-caption">{manager.listTables().length} disponíveis</p></div></div>
          {manager.listTables().length === 0 ? <p className="px-5 pb-5 text-xs text-slate-400">Crie uma tabela para começar.</p> : <div className="space-y-1 p-3">{manager.listTables().map((item) => <div className={`flex w-full items-center gap-1 rounded-lg text-sm ${selectedTable === item.name ? 'bg-blue-50' : 'hover:bg-slate-50'}`} key={item.name}><button className={`min-w-0 flex-1 truncate px-3 py-3 text-left ${selectedTable === item.name ? 'font-bold text-brand' : 'text-slate-600'}`} onClick={() => onSelectTable(item.name)} type="button"><span>▦ {item.name}</span><span className="ml-2 text-xs opacity-60">{item.recordCount}</span></button><button aria-label={`Excluir tabela ${item.name}`} className="table-action mr-2 text-rose-600 hover:bg-rose-50" onClick={() => deleteTable(item.name)} type="button">Excluir</button></div>)}</div>}
        </section>
        {table ? <TableWorkspace manager={manager} table={table} onRefresh={onRefresh} onReport={onReport} /> : <div className="panel flex min-h-64 items-center justify-center"><EmptyState title="Selecione uma tabela" description="Escolha uma tabela ao lado ou crie uma nova." /></div>}
      </div>
    </section>
  )
}

function TableDesigner({ manager, onCancel, onCreated, onError }: { manager: DatabaseManager; onCancel: () => void; onCreated: (name: string) => void; onError: (message: string) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [columns, setColumns] = useState<ColumnDraft[]>([{ name: 'id', dataType: 'int', nullable: false, primaryKey: true, foreignTable: '', foreignColumn: '' }])
  const tables = manager.listTables()
  const addColumn = () => setColumns([...columns, { name: '', dataType: 'string', nullable: true, primaryKey: false, foreignTable: '', foreignColumn: '' }])
  const updateColumn = (index: number, patch: Partial<ColumnDraft>) => setColumns(columns.map((column, i) => i === index ? { ...column, ...patch, ...(patch.primaryKey ? { nullable: false } : {}) } : column))
  const submit = () => {
    try {
      const definition: DatabaseTableDefinition = { name, description, columns: columns.map((column) => ({ name: column.name, dataType: column.dataType, nullable: column.nullable, primaryKey: column.primaryKey, ...(column.foreignTable ? { foreignKey: { tableName: column.foreignTable, columnName: column.foreignColumn } } : {}) })) }
      manager.createTable(definition)
      onCreated(name)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível criar a tabela.')
    }
  }
  return <section className="panel mb-6 border-blue-200"><div className="panel-header"><div><h2 className="section-title">Nova tabela</h2><p className="section-caption">Defina o esquema antes de criar a estrutura.</p></div><button className="icon-button" onClick={onCancel} type="button">×</button></div><div className="grid gap-4 p-6 md:grid-cols-2"><label className="field"><span>Nome da tabela</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="ex.: customers" /></label><label className="field"><span>Descrição</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Opcional" /></label></div><div className="overflow-x-auto px-6 pb-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Colunas</h3><button className="secondary-button" onClick={addColumn} type="button">+ Adicionar coluna</button></div><div className="min-w-[760px] space-y-2">{columns.map((column, index) => <div className="grid grid-cols-[1.4fr_1fr_100px_110px_1.2fr_32px] items-center gap-2" key={index}><input aria-label={`Nome da coluna ${index + 1}`} value={column.name} onChange={(event) => updateColumn(index, { name: event.target.value })} placeholder="nome" /><select aria-label={`Tipo da coluna ${index + 1}`} value={column.dataType} onChange={(event) => updateColumn(index, { dataType: event.target.value as DatabaseDataType })}>{dataTypes.map((type) => <option key={type}>{type}</option>)}</select><label className="flex items-center gap-1 text-xs text-slate-500"><input checked={column.nullable} disabled={column.primaryKey} onChange={(event) => updateColumn(index, { nullable: event.target.checked })} type="checkbox" /> NULL</label><label className="flex items-center gap-1 text-xs text-slate-500"><input checked={column.primaryKey} onChange={(event) => updateColumn(index, { primaryKey: event.target.checked })} type="checkbox" /> PK</label><select aria-label={`Referência da coluna ${index + 1}`} value={`${column.foreignTable}|${column.foreignColumn}`} onChange={(event) => { const [foreignTable, foreignColumn] = event.target.value.split('|'); updateColumn(index, { foreignTable: foreignTable || '', foreignColumn: foreignColumn || '' }) }}><option value="|">Sem referência</option>{tables.flatMap((table) => table.columns.filter((ref) => ref.primaryKey).map((ref) => <option key={`${table.name}|${ref.name}`} value={`${table.name}|${ref.name}`}>{table.name}.{ref.name}</option>))}</select><button className="icon-button text-rose-500" disabled={columns.length === 1} onClick={() => setColumns(columns.filter((_, i) => i !== index))} type="button">×</button></div>)}</div></div><div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><button className="secondary-button" onClick={onCancel} type="button">Cancelar</button><button className="primary-button" onClick={submit} type="button">Criar tabela</button></div></section>
}

function TableWorkspace({ manager, table, onRefresh, onReport }: { manager: DatabaseManager; table: ReturnType<DatabaseManager['getTable']> & object; onRefresh: () => void; onReport: (feedback: Feedback) => void }) {
  const [editingKey, setEditingKey] = useState<DatabaseValue | undefined>()
  const [showForm, setShowForm] = useState(false)
  const schema = table.schema
  const record = editingKey !== undefined ? table.search(editingKey as never) : undefined
  const remove = (key: DatabaseValue) => {
    if (!window.confirm('Excluir este registro? Esta ação não pode ser desfeita.')) return
    try { manager.removeRecord(table.name, key as never); onRefresh(); onReport({ type: 'success', message: 'Registro removido.' }) } catch (error) { onReport({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível remover.' }) }
  }
  return <section className="panel min-w-0"><div className="panel-header"><div><div className="flex items-center gap-2"><h2 className="section-title">{schema.name}</h2><span className="badge">{schema.recordCount} registros</span></div><p className="section-caption">{schema.description || 'Esquema da tabela'}</p></div><button className="primary-button" onClick={() => { setEditingKey(undefined); setShowForm(true) }} type="button">+ Registro</button></div><div className="border-b border-slate-100 px-6 py-4"><div className="flex flex-wrap gap-2">{schema.columns.map((column) => <span className="column-chip" key={column.name}><b>{column.name}</b> {column.dataType}{column.primaryKey ? ' · PK' : ''}{column.nullable ? ' · NULL' : ''}</span>)}</div></div>{showForm && <RecordForm manager={manager} table={table} initialRecord={record} onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); onRefresh(); onReport({ type: 'success', message: record ? 'Registro atualizado.' : 'Registro inserido.' }) }} onError={(message) => onReport({ type: 'error', message })} />}{schema.recordCount === 0 ? <EmptyState title="Tabela vazia" description="Insira o primeiro registro para começar." action="Adicionar registro" onAction={() => setShowForm(true)} /> : <div className="overflow-x-auto"><table className="data-table"><thead><tr>{schema.columns.map((column) => <th key={column.name}>{column.name}</th>)}<th className="text-right">Ações</th></tr></thead><tbody>{table.list().map((row, index) => { const key = row[schema.columns.find((column) => column.primaryKey)!.name]!; return <tr key={String(key) + index}>{schema.columns.map((column) => <td key={column.name}>{formatValue(row[column.name])}</td>)}<td><div className="flex justify-end gap-1"><button className="table-action" onClick={() => { setEditingKey(key); setShowForm(true) }} type="button">Editar</button><button className="table-action text-rose-600" onClick={() => remove(key)} type="button">Excluir</button></div></td></tr> })}</tbody></table></div>}</section>
}

function RecordForm({ manager, table, initialRecord, onCancel, onSaved, onError }: { manager: DatabaseManager; table: NonNullable<ReturnType<DatabaseManager['getTable']>>; initialRecord?: DatabaseRecord; onCancel: () => void; onSaved: () => void; onError: (message: string) => void }) {
  const [values, setValues] = useState<DatabaseRecord>(() => Object.fromEntries(table.schema.columns.map((column) => [column.name, initialRecord?.[column.name] ?? null])))
  const editing = initialRecord !== undefined
  const submit = () => {
    try {
      const record = Object.fromEntries(table.schema.columns.map((column) => [column.name, parseInputValue(values[column.name], column)]))
      const primary = table.schema.columns.find((column) => column.primaryKey)!.name
      if (editing) manager.updateRecord(table.name, values[primary] as never, record)
      else manager.insertRecord(table.name, record)
      onSaved()
    } catch (error) { onError(error instanceof Error ? error.message : 'Não foi possível salvar o registro.') }
  }
  return <div className="border-b border-blue-100 bg-blue-50/40 p-6"><div className="mb-4 flex items-center justify-between"><div><h3 className="section-title">{editing ? 'Editar registro' : 'Novo registro'}</h3><p className="section-caption">Os valores serão validados pelo esquema da tabela.</p></div></div><div className="grid gap-4 md:grid-cols-2">{table.schema.columns.map((column) => <label className="field" key={column.name}><span>{column.name} <em>{column.primaryKey ? 'PK' : column.nullable ? 'NULL' : 'NOT NULL'}</em></span>{column.dataType === 'boolean' ? <select disabled={editing && column.primaryKey} value={values[column.name] === null ? '' : String(values[column.name])} onChange={(event) => setValues({ ...values, [column.name]: event.target.value === '' ? null : event.target.value === 'true' })}><option value="">NULL</option><option value="true">true</option><option value="false">false</option></select> : <input disabled={editing && column.primaryKey} type={column.dataType === 'date' ? 'date' : column.dataType === 'int' || column.dataType === 'float' ? 'number' : 'text'} step={column.dataType === 'float' ? 'any' : undefined} value={formatInputValue(values[column.name], column.dataType)} onChange={(event) => setValues({ ...values, [column.name]: event.target.value })} placeholder={column.nullable ? 'NULL' : ''} />}</label>)}</div><div className="mt-5 flex justify-end gap-2"><button className="secondary-button" onClick={onCancel} type="button">Cancelar</button><button className="primary-button" onClick={submit} type="button">Salvar registro</button></div></div>
}

function QueriesView({ manager, selectedTable, onSelectTable }: { manager: DatabaseManager; selectedTable?: string; onSelectTable: (name: string) => void }) {
  const [filters, setFilters] = useState<FilterDraft[]>([])
  const table = selectedTable ? manager.getTable(selectedTable) : undefined
  const queryState = useMemo(() => {
    if (!table) return { results: [], error: undefined }
    const incomplete = filters.find((filter) => filter.value === '')
    if (incomplete) {
      return { results: [], error: 'Preencha o valor de todos os filtros antes de consultar.' }
    }
    try {
      return { results: table.query(filters as DatabaseFilter[]), error: undefined }
    } catch (error) {
      return {
        results: [],
        error: error instanceof Error ? error.message : 'Não foi possível executar a consulta.',
      }
    }
  }, [filters, table])
  const addFilter = () => { if (!table) return; setFilters([...filters, { column: table.schema.columns[0].name, operator: '=', value: '' }]) }
  return <section><PageHeader eyebrow="Workspace / Consultas" title="Consulte seus dados" description="Combine filtros e explore o resultado ordenado pela chave primária." /><div className="mb-6 grid gap-6 lg:grid-cols-[320px_1fr]"><section className="panel h-fit"><div className="panel-header"><div><h2 className="section-title">Filtros</h2><p className="section-caption">Todos devem ser atendidos.</p></div><button className="secondary-button px-2" onClick={addFilter} type="button">+ Filtro</button></div><div className="space-y-3 p-5"><label className="field"><span>Tabela</span><select value={selectedTable ?? ''} onChange={(event) => { onSelectTable(event.target.value); setFilters([]) }}><option value="" disabled>Selecione</option>{manager.listTables().map((item) => <option key={item.name}>{item.name}</option>)}</select></label>{filters.length === 0 ? <p className="py-3 text-xs text-slate-400">Adicione um filtro para começar.</p> : filters.map((filter, index) => <FilterRow filter={filter} table={table} onChange={(next) => setFilters(filters.map((current, i) => i === index ? next : current))} onRemove={() => setFilters(filters.filter((_, i) => i !== index))} key={index} />)}{filters.length > 0 && <button className="text-xs font-semibold text-slate-400 hover:text-slate-700" onClick={() => setFilters([])} type="button">Limpar filtros</button>}</div></section><section className="panel min-w-0"><div className="panel-header"><div><h2 className="section-title">Resultado</h2><p className="section-caption">{table ? `${queryState.results.length} registros encontrados` : 'Selecione uma tabela'}</p></div></div>{queryState.error ? <div className="p-6"><div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">{queryState.error}</div></div> : !table || queryState.results.length === 0 ? <EmptyState title={table ? 'Nenhum resultado' : 'Selecione uma tabela'} description={table ? 'Tente ajustar os filtros aplicados.' : 'Escolha uma tabela para consultar.'} /> : <div className="overflow-x-auto"><table className="data-table"><thead><tr>{table.schema.columns.map((column) => <th key={column.name}>{column.name}</th>)}</tr></thead><tbody>{queryState.results.map((row, index) => <tr key={index}>{table.schema.columns.map((column) => <td key={column.name}>{formatValue(row[column.name])}</td>)}</tr>)}</tbody></table></div>}</section></div></section>
}

function FilterRow({ filter, table, onChange, onRemove }: { filter: FilterDraft; table?: NonNullable<ReturnType<DatabaseManager['getTable']>>; onChange: (filter: FilterDraft) => void; onRemove: () => void }) {
  const column = table?.schema.columns.find((item) => item.name === filter.column)
  const setValue = (rawValue: string) => {
    if (rawValue === '') {
      onChange({ ...filter, value: '' })
      return
    }
    if (rawValue === 'NULL') {
      onChange({ ...filter, value: null })
      return
    }
    if (column?.dataType === 'int') {
      onChange({ ...filter, value: Number(rawValue) })
    } else if (column?.dataType === 'float') {
      onChange({ ...filter, value: Number(rawValue) })
    } else if (column?.dataType === 'date') {
      onChange({ ...filter, value: new Date(`${rawValue}T00:00:00`) })
    } else {
      onChange({ ...filter, value: rawValue })
    }
  }
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><div className="flex gap-2"><select className="min-w-0 flex-1" value={filter.column} onChange={(event) => onChange({ ...filter, column: event.target.value, value: '' })}>{table?.schema.columns.map((item) => <option key={item.name}>{item.name}</option>)}</select><button className="icon-button" onClick={onRemove} type="button">×</button></div><div className="mt-2 grid grid-cols-2 gap-2"><select value={filter.operator} onChange={(event) => onChange({ ...filter, operator: event.target.value as QueryOperator })}>{operators.map((operator) => <option key={operator}>{operator}</option>)}</select>{column?.dataType === 'boolean' ? <select value={filter.value === '' ? '' : filter.value === null ? 'NULL' : String(filter.value)} onChange={(event) => onChange({ ...filter, value: event.target.value === '' ? '' : event.target.value === 'NULL' ? null : event.target.value === 'true' })}><option value="">Selecione</option><option value="true">true</option><option value="false">false</option><option value="NULL">NULL</option></select> : <input type={column?.dataType === 'date' ? 'date' : column?.dataType === 'int' || column?.dataType === 'float' ? 'number' : 'text'} value={formatInputValue(filter.value, column?.dataType)} onChange={(event) => setValue(event.target.value)} placeholder="valor" />}</div></div>
}

function TablePreview({ table }: { table: NonNullable<ReturnType<DatabaseManager['getTable']>> }) {
  return <section className="panel"><div className="panel-header"><div><h2 className="section-title">{table.name}</h2><p className="section-caption">{table.schema.recordCount} registros · ordenados pela chave primária</p></div></div><div className="overflow-x-auto"><table className="data-table"><thead><tr>{table.schema.columns.map((column) => <th key={column.name}>{column.name}</th>)}</tr></thead><tbody>{table.list().slice(0, 5).map((row, index) => <tr key={index}>{table.schema.columns.map((column) => <td key={column.name}>{formatValue(row[column.name])}</td>)}</tr>)}</tbody></table></div></section>
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 text-sm font-semibold text-brand">{eyebrow}</p><h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p></div>{action}</div>
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="panel p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>
}

function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">∅</div><h3 className="text-sm font-bold text-slate-700">{title}</h3><p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">{description}</p>{action && onAction && <button className="secondary-button mt-4" onClick={onAction} type="button">{action}</button>}</div>
}

function TreesView({
  manager,
  selectedTable,
  onSelectTable,
}: {
  manager: DatabaseManager
  selectedTable?: string
  onSelectTable: (name: string) => void
}) {
  const table = selectedTable ? manager.getTable(selectedTable) : undefined
  return (
    <section>
      <PageHeader
        eyebrow="Workspace / Árvores"
        title="Visualizador AVL"
        description="Acompanhe a hierarquia, as rotações e o fator de balanceamento de cada tabela."
      />
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <label className="field w-full max-w-sm">
          <span>Tabela selecionada</span>
          <select value={selectedTable ?? ''} onChange={(event) => onSelectTable(event.target.value)}>
            <option value="" disabled>Selecione uma tabela</option>
            {manager.listTables().map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
        </label>
        {table && <div className="flex gap-2 text-xs font-semibold text-slate-500"><span className="badge">{table.schema.recordCount} nós</span><span className="badge">altura {table.visualRoot() ? table.validateIndex().height : 0}</span></div>}
      </div>
      {!table ? (
        <div className="panel"><EmptyState title="Selecione uma tabela" description="Escolha uma tabela para visualizar sua árvore AVL." /></div>
      ) : (
        <AVLVisualization table={table} />
      )}
    </section>
  )
}

interface PositionedVisualNode {
  node: AVLVisualNode<DatabaseValue>
  id: string
  x: number
  y: number
  leftId?: string
  rightId?: string
}

function AVLVisualization({ table }: { table: NonNullable<ReturnType<DatabaseManager['getTable']>> }) {
  const root = table.visualRoot() as AVLVisualNode<DatabaseValue> | null
  if (root === null) {
    return <div className="panel"><EmptyState title="Árvore vazia" description="Insira registros nesta tabela para visualizar a raiz e suas rotações." /></div>
  }

  const nodes: PositionedVisualNode[] = []
  const connections: Array<{ from: string; to: string }> = []
  let order = 0
  const place = (node: AVLVisualNode<DatabaseValue>, depth: number, parentId?: string, side?: 'left' | 'right'): string => {
    const id = `node-${order++}`
    const leftId = node.left ? place(node.left, depth + 1, id, 'left') : undefined
    const rightId = node.right ? place(node.right, depth + 1, id, 'right') : undefined
    const leftX = node.left ? nodes.find((item) => item.id === leftId)!.x : undefined
    const rightX = node.right ? nodes.find((item) => item.id === rightId)!.x : undefined
    const x = leftX !== undefined && rightX !== undefined
      ? (leftX + rightX) / 2
      : leftX ?? rightX ?? nodes.length * 140 + 80
    nodes.push({ node, id, x, y: depth * 120 + 65, leftId, rightId })
    if (parentId) connections.push({ from: parentId, to: id })
    return id
  }
  place(root, 0)
  const minX = Math.min(...nodes.map((node) => node.x))
  const maxX = Math.max(...nodes.map((node) => node.x))
  const width = Math.max(720, maxX - minX + 160)
  const height = Math.max(260, Math.max(...nodes.map((node) => node.y)) + 100)
  const offset = minX < 80 ? 80 - minX : 0
  const byId = new Map(nodes.map((node) => [node.id, node]))

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div>
          <h2 className="section-title">{table.name} · árvore AVL</h2>
          <p className="section-caption">A raiz está destacada. BF = altura esquerda − altura direita.</p>
        </div>
        <span className="text-xs font-semibold text-slate-400">Atualizado pela estrutura real</span>
      </div>
      <div className="tree-scroll p-4">
        <svg aria-label={`Árvore AVL da tabela ${table.name}`} className="mx-auto" height={height} role="img" viewBox={`0 0 ${width} ${height}`} width={width}>
          {connections.map((connection) => {
            const from = byId.get(connection.from)!
            const to = byId.get(connection.to)!
            return <line className="tree-edge" key={`${connection.from}-${connection.to}`} x1={from.x + offset} x2={to.x + offset} y1={from.y + 27} y2={to.y - 27} />
          })}
          {nodes.map(({ node, id, x, y }) => {
            const isRoot = y === 65
            const balanceClass = Math.abs(node.balanceFactor) === 1 ? 'tree-balance-warning' : 'tree-balance'
            return <g key={id} transform={`translate(${x + offset}, ${y})`}><circle className={isRoot ? 'tree-node tree-node-root' : 'tree-node'} r="27" /><text className="tree-key" textAnchor="middle" y="-2">{formatTreeKey(node.key)}</text><text className={balanceClass} textAnchor="middle" y="15">BF {node.balanceFactor}</text>{isRoot && <text className="tree-root-label" textAnchor="middle" y="-39">RAIZ</text>}</g>
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-4 border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
        <span><i className="legend-dot legend-root" /> raiz</span>
        <span><i className="legend-dot legend-node" /> nó</span>
        <span><b>BF</b> fator de balanceamento</span>
      </div>
    </section>
  )
}

function formatTreeKey(value: DatabaseValue): string {
  if (value === null) return 'NULL'
  if (value instanceof Date) return value.toLocaleDateString('pt-BR')
  return String(value)
}

interface RelationshipViewModel {
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
}

function RelationshipsView({
  manager,
  onSelectTable,
}: {
  manager: DatabaseManager
  onSelectTable: (name: string) => void
}) {
  const tables = manager.listTables()
  const relationships: RelationshipViewModel[] = tables.flatMap((table) =>
    table.columns.flatMap((column) =>
      column.foreignKey
        ? [{
            sourceTable: table.name,
            sourceColumn: column.name,
            targetTable: column.foreignKey.tableName,
            targetColumn: column.foreignKey.columnName,
          }]
        : [],
    ),
  )

  return (
    <section>
      <PageHeader
        eyebrow="Workspace / Relacionamentos"
        title="Mapa de relacionamentos"
        description="Visualize como as tabelas se conectam por chaves estrangeiras. Esta tela é somente leitura."
      />
      {tables.length === 0 ? (
        <div className="panel">
          <EmptyState title="Nenhuma tabela criada" description="Crie tabelas no workspace para visualizar o modelo relacional." />
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tables.map((table) => {
              const primaryKey = table.columns.find((column) => column.primaryKey)
              const foreignKeys = table.columns.filter((column) => column.foreignKey)
              return (
                <button
                  className="relationship-table-card text-left"
                  key={table.name}
                  onClick={() => onSelectTable(table.name)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span className="relationship-table-icon">▦</span>
                      <span className="text-sm font-bold text-slate-800">{table.name}</span>
                    </span>
                    <span className="badge">{table.recordCount} registros</span>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                    <p className="flex items-center justify-between gap-3 text-slate-500">
                      <span>PK</span>
                      <span className="font-semibold text-blue-700">{primaryKey?.name ?? '—'}</span>
                    </p>
                    <p className="flex items-center justify-between gap-3 text-slate-500">
                      <span>FKs</span>
                      <span className="font-semibold text-slate-700">{foreignKeys.length}</span>
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="section-title">Conexões entre tabelas</h2>
                <p className="section-caption">{relationships.length} relacionamento(s) definido(s)</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">FK → PK</span>
            </div>
            {relationships.length === 0 ? (
              <EmptyState
                title="Nenhum relacionamento"
                description="Configure uma chave estrangeira no designer de tabelas para criar uma conexão."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {relationships.map((relationship) => (
                  <div className="relationship-row" key={`${relationship.sourceTable}.${relationship.sourceColumn}-${relationship.targetTable}.${relationship.targetColumn}`}>
                    <button className="relationship-endpoint" onClick={() => onSelectTable(relationship.sourceTable)} type="button">
                      <span className="relationship-endpoint-label">Origem · FK</span>
                      <span className="relationship-endpoint-name">{relationship.sourceTable}</span>
                      <span className="relationship-column">{relationship.sourceColumn}</span>
                    </button>
                    <div className="relationship-arrow" aria-label="referencia">
                      <span />
                      <b>→</b>
                    </div>
                    <button className="relationship-endpoint relationship-endpoint-target" onClick={() => onSelectTable(relationship.targetTable)} type="button">
                      <span className="relationship-endpoint-label">Destino · PK</span>
                      <span className="relationship-endpoint-name">{relationship.targetTable}</span>
                      <span className="relationship-column">{relationship.targetColumn}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}

function DataActions({ manager, onReport, onRefresh }: { manager: DatabaseManager; onReport: (feedback: Feedback) => void; onRefresh: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const exportDatabase = () => {
    try {
      manager.downloadJSON()
      onReport({ type: 'success', message: 'Banco exportado com sucesso.' })
    } catch (error) {
      onReport({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível exportar o banco.' })
    }
  }
  const importDatabase = async (file: File) => {
    if (!window.confirm('Importar este arquivo substituirá o banco atual. Continuar?')) return
    setLoading(true)
    try {
      await manager.importFile(file)
      onRefresh()
      onReport({ type: 'success', message: 'Banco importado com sucesso.' })
    } catch (error) {
      onReport({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível importar o banco.' })
    } finally {
      setLoading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }
  return <div className="flex gap-2"><input ref={fileInput} className="hidden" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importDatabase(file) }} type="file" /><button className="secondary-button" disabled={loading} onClick={() => fileInput.current?.click()} type="button">{loading ? 'Importando...' : 'Importar JSON'}</button><button className="secondary-button" onClick={exportDatabase} type="button">Exportar JSON</button></div>
}

function ComingSoon({ title }: { title: string }) {
  return <section><PageHeader eyebrow={`Workspace / ${title}`} title={title} description="Este módulo está preparado para receber a próxima camada de visualização." /><div className="panel"><EmptyState title="Em desenvolvimento" description="A lógica do banco já está pronta para esta experiência." /></div></section>
}

function formatValue(value: DatabaseValue): string {
  if (value === null) return 'NULL'
  if (value instanceof Date) return value.toLocaleDateString('pt-BR')
  return String(value)
}

function formatInputValue(value: DatabaseValue | undefined, type?: DatabaseDataType): string {
  if (value === null || value === undefined) return ''
  if (type === 'date' && value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

function parseInputValue(value: DatabaseValue, column: DatabaseColumn): DatabaseValue {
  if (value === null || value === '') return null
  if (column.dataType === 'int') return Number(value)
  if (column.dataType === 'float') return Number(value)
  if (column.dataType === 'date') return new Date(String(value))
  if (column.dataType === 'boolean') return value === true || value === 'true'
  return String(value)
}
