import { describe, expect, it } from 'vitest'
import { DatabaseManager } from './DatabaseManager'
import { DatabaseValidationError } from './DatabaseValidationError'
import type { DatabaseTableDefinition } from '../types/database'

const parentTable: DatabaseTableDefinition = {
  name: 'departments',
  columns: [
    { name: 'id', dataType: 'int', nullable: false, primaryKey: true },
    { name: 'name', dataType: 'string', nullable: false, primaryKey: false },
  ],
}

const childTable: DatabaseTableDefinition = {
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
    { name: 'name', dataType: 'string', nullable: false, primaryKey: false },
  ],
}

function managerWithParent(): DatabaseManager {
  const manager = new DatabaseManager('company')
  manager.createTable(parentTable)
  return manager
}

describe('integridade referencial', () => {
  it('cria um relacionamento válido', () => {
    const manager = managerWithParent()

    expect(manager.createTable(childTable).columns[1].foreignKey).toEqual({
      tableName: 'departments',
      columnName: 'id',
    })
  })

  it.each([
    {
      name: 'tabela inexistente',
      reference: { tableName: 'missing', columnName: 'id' },
      message: 'tabela referenciada "missing" não existe',
    },
    {
      name: 'coluna inexistente',
      reference: { tableName: 'departments', columnName: 'missing' },
      message: 'coluna referenciada "departments.missing" não existe',
    },
  ])('rejeita referência com $name', ({ reference, message }) => {
    const manager = managerWithParent()
    const definition = {
      ...childTable,
      columns: childTable.columns.map((column) =>
        column.name === 'departmentId' ? { ...column, foreignKey: reference } : column,
      ),
    }

    expect(() => manager.createTable(definition)).toThrow(message)
    expect(manager.getTable('employees')).toBeUndefined()
  })

  it('rejeita referência a coluna que não é chave primária', () => {
    const manager = managerWithParent()
    const definition = {
      ...childTable,
      columns: childTable.columns.map((column) =>
        column.name === 'departmentId'
          ? { ...column, foreignKey: { tableName: 'departments', columnName: 'name' } }
          : column,
      ),
    }

    expect(() => manager.createTable(definition)).toThrow('deve ser chave primária')
  })

  it('rejeita tipos incompatíveis', () => {
    const manager = managerWithParent()
    const definition = {
      ...childTable,
      columns: childTable.columns.map((column) =>
        column.name === 'departmentId' ? { ...column, dataType: 'string' as const } : column,
      ),
    }

    expect(() => manager.createTable(definition)).toThrow('tipos')
  })

  it('permite inserir referências existentes e rejeita referências ausentes', () => {
    const manager = managerWithParent()
    manager.createTable(childTable)
    manager.insertRecord('departments', { id: 1, name: 'Engineering' })

    expect(manager.insertRecord('employees', { id: 10, departmentId: 1, name: 'Ana' })).toBe(true)
    expect(() =>
      manager.insertRecord('employees', { id: 11, departmentId: 99, name: 'Bob' }),
    ).toThrow('não encontrou o registro')
    expect(manager.listRecords('employees')).toHaveLength(1)
  })

  it('permite NULL em referência nullable e rejeita atualização inexistente', () => {
    const manager = managerWithParent()
    manager.createTable({
      ...childTable,
      columns: childTable.columns.map((column) =>
        column.name === 'departmentId' ? { ...column, nullable: true } : column,
      ),
    })

    expect(manager.insertRecord('employees', { id: 10, departmentId: null, name: 'Ana' })).toBe(true)
    expect(() =>
      manager.updateRecord('employees', 10, { id: 10, departmentId: 99, name: 'Ana' }),
    ).toThrow('não encontrou o registro')
    expect(manager.searchRecord('employees', 10)?.departmentId).toBeNull()
  })

  it('restringe remoção de registro referenciado', () => {
    const manager = managerWithParent()
    manager.createTable(childTable)
    manager.insertRecord('departments', { id: 1, name: 'Engineering' })
    manager.insertRecord('departments', { id: 2, name: 'Support' })
    manager.insertRecord('employees', { id: 10, departmentId: 1, name: 'Ana' })

    expect(() => manager.removeRecord('departments', 1)).toThrow('é referenciado')
    expect(manager.removeRecord('departments', 2)).toBe(true)
    expect(manager.searchRecord('departments', 2)).toBeUndefined()
    expect(manager.searchRecord('departments', 1)).toBeDefined()
  })

  it('restringe remoção de tabela referenciada', () => {
    const manager = managerWithParent()
    manager.createTable(childTable)

    expect(() => manager.dropTable('departments')).toThrow('é referenciada')
    expect(manager.getTable('departments')).toBeDefined()
    expect(manager.dropTable('employees')).toBe(true)
    expect(manager.dropTable('departments')).toBe(true)
  })

  it('não deixa resíduos quando a criação do relacionamento falha', () => {
    const manager = managerWithParent()

    expect(() => manager.createTable({
      name: 'invalid',
      columns: [
        { name: 'id', dataType: 'int', nullable: false, primaryKey: true },
        {
          name: 'parentId',
          dataType: 'string',
          nullable: false,
          primaryKey: false,
          foreignKey: { tableName: 'departments', columnName: 'id' },
        },
      ],
    })).toThrow(DatabaseValidationError)
    expect(manager.listTables().map((table) => table.name)).toEqual(['departments'])
  })
})
