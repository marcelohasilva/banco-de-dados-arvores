import { DatabaseValidationError } from './DatabaseValidationError'
import type {
  DatabaseRecord,
  DatabaseTableDefinition,
  DatabaseValue,
} from '../types/database'

export const DATABASE_FILE_VERSION = 1

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
 
export interface PersistedTable {
  definition: DatabaseTableDefinition
  records: Array<Record<string, PersistedValue>>
}

export interface PersistedDatabase {
  format: 'database-studio'
  version: number
  name: string
  description: string
  tables: PersistedTable[]
}

export type PersistedValue = string | number | boolean | null | { $date: string }

export function encodeDatabaseRecord(
  record: DatabaseRecord,
  definition: DatabaseTableDefinition,
): Record<string, PersistedValue> {
  const encoded: Record<string, PersistedValue> = {}
  for (const column of definition.columns) {
    const value = record[column.name]
    encoded[column.name] =
      column.dataType === 'date' && value instanceof Date
        ? { $date: value.toISOString() }
        : value as string | number | boolean | null
  }
  return encoded
}

export function decodeDatabaseRecord(
  record: Record<string, PersistedValue>,
  definition: DatabaseTableDefinition,
): DatabaseRecord {
  const decoded: DatabaseRecord = {}
  for (const column of definition.columns) {
    const value = record[column.name]
    if (column.dataType === 'date' && isDateValue(value)) {
      decoded[column.name] = new Date(value.$date)
    } else {
      decoded[column.name] = value as DatabaseValue
    }
  }
  return decoded
}

export function parsePersistedDatabase(json: string): PersistedDatabase {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new DatabaseValidationError('O arquivo de banco contém JSON inválido ou corrompido.')
  }
  validatePersistedDatabase(parsed)
  return parsed
}

export function validatePersistedDatabase(value: unknown): asserts value is PersistedDatabase {
  if (!isRecord(value) || value.format !== 'database-studio' || value.version !== DATABASE_FILE_VERSION) {
    throw new DatabaseValidationError('Formato ou versão do arquivo de banco não suportado.')
  }
  if (typeof value.name !== 'string' || typeof value.description !== 'string' || !Array.isArray(value.tables)) {
    throw new DatabaseValidationError('Estrutura do arquivo de banco inválida.')
  }
  for (const table of value.tables) {
    if (!isRecord(table) || !isRecord(table.definition) || !Array.isArray(table.records)) {
      throw new DatabaseValidationError('Estrutura de tabela persistida inválida.')
    }
  }
}

function isDateValue(value: PersistedValue): value is { $date: string } {
  return isRecord(value) && typeof value.$date === 'string'
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
