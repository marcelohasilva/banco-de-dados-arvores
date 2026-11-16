import { describe, expect, it } from 'vitest'
import { DatabaseManager } from './DatabaseManager'
import { DatabaseValidationError } from './DatabaseValidationError'
import type { DatabaseTableDefinition } from '../types/database'

const usersTable: DatabaseTableDefinition = {
  name: 'users',
  description: 'Usuários da aplicação',
  columns: [
    { name: 'id', dataType: 'int', nullable: false, primaryKey: true },
    { name: 'name', dataType: 'string', nullable: false, primaryKey: false },
    { name: 'score', dataType: 'float', nullable: true, primaryKey: false },
    { name: 'active', dataType: 'boolean', nullable: false, primaryKey: false },
    { name: 'birthday', dataType: 'date', nullable: true, primaryKey: false },
  ],
}

const createManager = () => {
  const manager = new DatabaseManager('school')
  manager.createTable(usersTable)
  return manager
}

describe('DatabaseManager', () => {
  it('cria, consulta e remove tabelas', () => {
    const manager = new DatabaseManager('school')
    const schema = manager.createTable(usersTable)

    expect(schema.name).toBe('users')
    expect(schema.columns).toHaveLength(5)
    expect(manager.listTables()).toHaveLength(1)
    expect(manager.getTable('users')?.schema.recordCount).toBe(0)
    expect(manager.dropTable('users')).toBe(true)
    expect(manager.dropTable('users')).toBe(false)
  })

  it('rejeita tabelas e colunas duplicadas', () => {
    const manager = new DatabaseManager('school')
    manager.createTable(usersTable)

    expect(() => manager.createTable(usersTable)).toThrow('já existe')
    expect(() =>
      manager.createTable({
        name: 'duplicated_columns',
        columns: [
          { name: 'id', dataType: 'int', nullable: false, primaryKey: true },
          { name: 'id', dataType: 'string', nullable: false, primaryKey: false },
        ],
      }),
    ).toThrow('declarada mais de uma vez')
  })

  it('insere, busca, lista, atualiza e remove registros usando a AVL', () => {
    const manager = createManager()
    const date = new Date('2020-01-01T00:00:00.000Z')

    expect(manager.insertRecord('users', { id: 20, name: 'B', score: 9.5, active: true, birthday: date })).toBe(true)
    expect(manager.insertRecord('users', { id: 10, name: 'A', score: null, active: false, birthday: null })).toBe(true)
    expect(manager.insertRecord('users', { id: 30, name: 'C', score: 7, active: true, birthday: null })).toBe(true)
    expect(manager.listRecords('users').map((record) => record.id)).toEqual([10, 20, 30])
    expect(manager.searchRecord('users', 20)).toEqual({
      id: 20,
      name: 'B',
      score: 9.5,
      active: true,
      birthday: date,
    })

    expect(manager.updateRecord('users', 20, {
      id: 20,
      name: 'Updated',
      score: 10,
      active: false,
      birthday: date,
    })).toBe(true)
    expect(manager.searchRecord('users', 20)?.name).toBe('Updated')
    expect(manager.removeRecord('users', 10)).toBe(true)
    expect(manager.searchRecord('users', 10)).toBeUndefined()
    expect(manager.getTable('users')?.schema.recordCount).toBe(2)
    expect(manager.getTable('users')?.validateIndex().valid).toBe(true)
  })

  it('rejeita chave duplicada, valores inválidos e colunas ausentes', () => {
    const manager = createManager()
    const validRecord = { id: 1, name: 'A', score: null, active: true, birthday: null }
    manager.insertRecord('users', validRecord)

    expect(manager.insertRecord('users', validRecord)).toBe(false)
    expect(() => manager.insertRecord('users', { ...validRecord, name: 123 })).toThrow(
      'deve ser do tipo "string"',
    )
    expect(() => manager.insertRecord('users', { ...validRecord, active: null })).toThrow(
      'não aceita valores nulos',
    )
    expect(() => manager.insertRecord('users', { ...validRecord, extra: 'x' })).toThrow(
      'não existe',
    )
    expect(() => manager.insertRecord('users', { ...validRecord, id: null })).toThrow(
      'não aceita valores nulos',
    )
  })

  it('exige chave primária e impede alteração da chave', () => {
    const manager = createManager()
    const record = { id: 1, name: 'A', score: null, active: true, birthday: null }

    expect(() => manager.updateRecord('users', 99, record)).not.toThrow()
    expect(manager.updateRecord('users', 99, record)).toBe(false)
    manager.insertRecord('users', record)
    expect(() => manager.updateRecord('users', 1, { ...record, id: 2 })).toThrow(
      'não pode ser alterada',
    )
    expect(() => manager.createTable({
      name: 'without_pk',
      columns: [{ name: 'value', dataType: 'string', nullable: false, primaryKey: false }],
    })).toThrow(DatabaseValidationError)
  })

  it('retorna erro compreensível para tabela inexistente', () => {
    const manager = new DatabaseManager('school')

    expect(() => manager.listRecords('missing')).toThrow('não existe')
  })
})
