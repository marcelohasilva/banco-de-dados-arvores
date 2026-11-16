import { describe, expect, it } from 'vitest'
import { DatabaseManager } from './DatabaseManager'
import type { DatabaseTableDefinition } from '../types/database'

const table: DatabaseTableDefinition = {
  name: 'items',
  columns: [
    { name: 'id', dataType: 'int', nullable: false, primaryKey: true },
    { name: 'name', dataType: 'string', nullable: false, primaryKey: false },
    { name: 'price', dataType: 'float', nullable: false, primaryKey: false },
    { name: 'active', dataType: 'boolean', nullable: false, primaryKey: false },
    { name: 'createdAt', dataType: 'date', nullable: false, primaryKey: false },
    { name: 'note', dataType: 'string', nullable: true, primaryKey: false },
  ],
}

function createManager(): DatabaseManager {
  const manager = new DatabaseManager('catalog')
  manager.createTable(table)
  manager.insertRecord('items', {
    id: 1,
    name: 'Alpha',
    price: 10.5,
    active: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    note: null,
  })
  manager.insertRecord('items', {
    id: 2,
    name: 'Beta',
    price: 20,
    active: false,
    createdAt: new Date('2024-06-01T00:00:00.000Z'),
    note: 'featured',
  })
  manager.insertRecord('items', {
    id: 3,
    name: 'Gamma',
    price: 30.75,
    active: true,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    note: null,
  })
  return manager
}

describe('consultas e filtros', () => {
  it.each([
    ['=', [2], { column: 'price', operator: '=', value: 20 }],
    ['!=', [1, 3], { column: 'price', operator: '!=', value: 20 }],
    ['>', [3], { column: 'price', operator: '>', value: 20 }],
    ['<', [1], { column: 'price', operator: '<', value: 20 }],
    ['>=', [2, 3], { column: 'price', operator: '>=', value: 20 }],
    ['<=', [1, 2], { column: 'price', operator: '<=', value: 20 }],
  ] as const)('aplica o operador %s em números', (_operator, expectedIds, filter) => {
    const manager = createManager()
    expect(manager.queryRecords('items', [filter]).map((record) => record.id)).toEqual(expectedIds)
  })

  it('compara corretamente strings, booleanos e datas', () => {
    const manager = createManager()

    expect(manager.queryRecords('items', [{ column: 'name', operator: '>=', value: 'Beta' }]).map((record) => record.id))
      .toEqual([2, 3])
    expect(manager.queryRecords('items', [{ column: 'active', operator: '=', value: true }]).map((record) => record.id))
      .toEqual([1, 3])
    expect(manager.queryRecords('items', [{
      column: 'createdAt',
      operator: '<',
      value: new Date('2025-01-01T00:00:00.000Z'),
    }]).map((record) => record.id)).toEqual([1, 2])
  })

  it('trata NULL e combina filtros com AND', () => {
    const manager = createManager()

    expect(manager.queryRecords('items', [{ column: 'note', operator: '=', value: null }]).map((record) => record.id))
      .toEqual([1, 3])
    expect(manager.queryRecords('items', [{ column: 'note', operator: '!=', value: null }]).map((record) => record.id))
      .toEqual([2])
    expect(manager.queryRecords('items', [
      { column: 'price', operator: '>', value: 10 },
      { column: 'active', operator: '=', value: true },
    ]).map((record) => record.id)).toEqual([1, 3])
  })

  it('rejeita coluna, valor e operador incompatíveis', () => {
    const manager = createManager()

    expect(() => manager.queryRecords('items', [
      { column: 'missing', operator: '=', value: 1 },
    ])).toThrow('não existe')
    expect(() => manager.queryRecords('items', [
      { column: 'price', operator: '=', value: '20' },
    ])).toThrow('deve ser do tipo "float"')
    expect(() => manager.queryRecords('items', [
      { column: 'active', operator: '>', value: true },
    ])).toThrow('não é compatível')
    expect(() => manager.queryRecords('items', [
      { column: 'price', operator: '>', value: null },
    ])).toThrow('valores NULL')
    expect(() => manager.queryRecords('items', [
      { column: 'price', operator: 'invalid' as never, value: 1 },
    ])).toThrow('não é válido')
  })

  it('retorna resultados em ordem da chave primária', () => {
    const manager = createManager()

    expect(manager.queryRecords('items', [{ column: 'price', operator: '>=', value: 0 }])
      .map((record) => record.id)).toEqual([1, 2, 3])
  })
})
