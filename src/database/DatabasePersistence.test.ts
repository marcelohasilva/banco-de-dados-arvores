import { describe, expect, it } from 'vitest'
import { DatabaseManager } from './DatabaseManager'
import { DatabaseValidationError } from './DatabaseValidationError'
import type { DatabaseTableDefinition } from '../types/database'
import type { StorageLike } from './DatabasePersistence'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  public removeItem(key: string): void {
    this.values.delete(key)
  }
}

const departments: DatabaseTableDefinition = {
  name: 'departments',
  columns: [
    { name: 'id', dataType: 'int', nullable: false, primaryKey: true },
    { name: 'name', dataType: 'string', nullable: false, primaryKey: false },
  ],
}

const employees: DatabaseTableDefinition = {
  name: 'employees',
  columns: [
    { name: 'id', dataType: 'int', nullable: false, primaryKey: true },
    {
      name: 'departmentId',
      dataType: 'int',
      nullable: false,
      primaryKey: false,
      foreignKey: { tableName: 'departments', columnName: 'id' },
    },
    { name: 'hiredAt', dataType: 'date', nullable: false, primaryKey: false },
  ],
}

function createDatabase(storage?: StorageLike): DatabaseManager {
  const manager = new DatabaseManager('company', 'Persisted company', {
    storage,
    storageKey: 'company-db',
  })
  manager.createTable(departments)
  manager.createTable(employees)
  manager.insertRecord('departments', { id: 2, name: 'Support' })
  manager.insertRecord('departments', { id: 1, name: 'Engineering' })
  manager.insertRecord('employees', {
    id: 10,
    departmentId: 1,
    hiredAt: new Date('2024-01-02T00:00:00.000Z'),
  })
  return manager
}

describe('persistência do banco', () => {
  it('salva alterações automaticamente e recupera reconstruindo as AVLs', () => {
    const storage = new MemoryStorage()
    createDatabase(storage)

    const restored = new DatabaseManager('company', '', {
      storage,
      storageKey: 'company-db',
    })
    expect(restored.restore()).toBe(true)
    expect(restored.listTables().map((table) => table.name)).toEqual([
      'departments',
      'employees',
    ])
    expect(restored.listRecords('departments').map((record) => record.id)).toEqual([1, 2])
    expect(restored.searchRecord('employees', 10)?.hiredAt).toEqual(
      new Date('2024-01-02T00:00:00.000Z'),
    )
    expect(restored.getTable('departments')?.validateIndex().valid).toBe(true)
    expect(restored.getTable('employees')?.validateIndex().valid).toBe(true)
  })

  it('exporta um formato versionado e importa tabelas fora da ordem', () => {
    const source = createDatabase()
    const exported = JSON.parse(source.exportJSON()) as {
      tables: unknown[]
      version: number
      format: string
    }
    exported.tables.reverse()

    const imported = DatabaseManager.fromJSON(JSON.stringify(exported))
    expect(exported.format).toBe('database-studio')
    expect(exported.version).toBe(1)
    expect(imported.searchRecord('employees', 10)?.departmentId).toBe(1)
    expect(imported.listRecords('departments').map((record) => record.id)).toEqual([1, 2])
  })

  it('retorna ausência de dados sem falhar', () => {
    const manager = new DatabaseManager('empty', '', {
      storage: new MemoryStorage(),
      storageKey: 'missing',
    })

    expect(manager.restore()).toBe(false)
    expect(manager.listTables()).toEqual([])
  })

  it('rejeita JSON corrompido sem alterar o banco atual', () => {
    const manager = createDatabase()
    const before = manager.listRecords('departments')

    expect(() => manager.importJSON('{broken')).toThrow('JSON inválido')
    expect(manager.listRecords('departments')).toEqual(before)
  })

  it('rejeita registros duplicados e referências inexistentes sem substituir o banco', () => {
    const manager = createDatabase()
    const exported = JSON.parse(manager.exportJSON()) as {
      tables: Array<{ definition: DatabaseTableDefinition; records: Array<Record<string, unknown>> }>
    }
    const employeeTable = exported.tables.find((table) => table.definition.name === 'employees')!
    employeeTable.records.push(employeeTable.records[0])

    expect(() => manager.importJSON(JSON.stringify(exported))).toThrow('chave primária duplicada')
    expect(manager.listRecords('employees')).toHaveLength(1)

    employeeTable.records.pop()
    employeeTable.records[0].departmentId = 999
    expect(() => manager.importJSON(JSON.stringify(exported))).toThrow('não encontrou o registro')
    expect(manager.searchRecord('employees', 10)?.departmentId).toBe(1)
  })

  it('rejeita versão inválida e preserva os dados atuais', () => {
    const manager = createDatabase()
    const exported = JSON.parse(manager.exportJSON()) as { version: number }
    exported.version = 99

    expect(() => manager.importJSON(JSON.stringify(exported))).toThrow(DatabaseValidationError)
    expect(manager.listRecords('departments')).toHaveLength(2)
  })
})
