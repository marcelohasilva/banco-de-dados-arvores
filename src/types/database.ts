export type DatabaseDataType = 'string' | 'int' | 'float' | 'boolean' | 'date'

export type DatabaseValue = string | number | boolean | Date | null

export type QueryOperator = '=' | '!=' | '>' | '<' | '>=' | '<='

export interface DatabaseFilter {
  column: string
  operator: QueryOperator
  value: DatabaseValue
}

export type PrimaryKeyValue = string | number | Date

/**
 * Compara chaves primárias sem converter textos arbitrários para números.
 * Tipos diferentes recebem uma ordem estável para evitar comparações ambíguas.
 */
export function comparePrimaryKeyValues(left: PrimaryKeyValue, right: PrimaryKeyValue): number {
  const leftType = primaryKeyType(left)
  const rightType = primaryKeyType(right)

  if (leftType !== rightType) {
    return leftType - rightType
  }

  if (typeof left === 'string' && typeof right === 'string') {
    return left < right ? -1 : left > right ? 1 : 0
  }
  if (typeof left === 'number' && typeof right === 'number') {
    if (Number.isNaN(left) || Number.isNaN(right)) {
      throw new TypeError('Chaves primárias numéricas não podem ser NaN.')
    }
    return left < right ? -1 : left > right ? 1 : 0
  }

  const leftDate = left instanceof Date ? left.getTime() : Number.NaN
  const rightDate = right instanceof Date ? right.getTime() : Number.NaN
  if (Number.isNaN(leftDate) || Number.isNaN(rightDate)) {
    throw new TypeError('Chaves primárias de data devem conter datas válidas.')
  }
  return leftDate < rightDate ? -1 : leftDate > rightDate ? 1 : 0
}

function primaryKeyType(value: PrimaryKeyValue): number {
  if (typeof value === 'string') {
    return 0
  }
  if (typeof value === 'number') {
    return 1
  }
  return 2
}

export interface ForeignKeyReference {
  tableName: string
  columnName: string
}

export interface DatabaseColumn {
  name: string
  dataType: DatabaseDataType
  nullable: boolean
  primaryKey: boolean
  foreignKey?: ForeignKeyReference
}

export type DatabaseRecord = Record<string, DatabaseValue>

export interface DatabaseTable {
  name: string
  description: string
  columns: DatabaseColumn[]
  recordCount: number
}

export interface Database {
  name: string
  description: string
  tables: DatabaseTable[]
}

export interface DatabaseTableDefinition {
  name: string
  description?: string
  columns: DatabaseColumn[]
}
