import { describe, expect, it } from 'vitest'
import { PrimaryKeyIndex } from './PrimaryKeyIndex'
import { comparePrimaryKeyValues } from '../types/database'

describe('PrimaryKeyIndex', () => {
  it('organiza registros pela chave primária', () => {
    const index = new PrimaryKeyIndex(comparePrimaryKeyValues)
    expect(index.insert(2, { id: 2, name: 'B' })).toBe(true)
    expect(index.insert(1, { id: 1, name: 'A' })).toBe(true)

    expect(index.search(1)).toEqual({ id: 1, name: 'A' })
    expect(index.inOrder()).toEqual([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ])
    expect(index.validate().valid).toBe(true)
  })

  it('rejeita chave primária duplicada sem sobrescrever o registro', () => {
    const index = new PrimaryKeyIndex(comparePrimaryKeyValues)
    expect(index.insert(1, { id: 1, name: 'original' })).toBe(true)
    expect(index.insert(1, { id: 1, name: 'duplicado' })).toBe(false)

    expect(index.search(1)).toEqual({ id: 1, name: 'original' })
    expect(index.size).toBe(1)
  })

  it('ordena chaves textuais sem convertê-las para números', () => {
    const index = new PrimaryKeyIndex(comparePrimaryKeyValues)
    index.insert('10', { id: '10' })
    index.insert('2', { id: '2' })
    index.insert('a', { id: 'a' })

    expect(index.inOrder()).toEqual([{ id: '10' }, { id: '2' }, { id: 'a' }])
  })

  it('compara datas e rejeita datas inválidas', () => {
    const index = new PrimaryKeyIndex(comparePrimaryKeyValues)
    const earlier = new Date('2024-01-01T00:00:00.000Z')
    const later = new Date('2025-01-01T00:00:00.000Z')
    index.insert(later, { id: later })
    index.insert(earlier, { id: earlier })

    expect(index.inOrder()).toEqual([{ id: earlier }, { id: later }])
    expect(() => index.insert(new Date('invalid'), { id: 'invalid' })).toThrow(TypeError)
  })
})
