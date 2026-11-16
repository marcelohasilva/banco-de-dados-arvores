import { PrimaryKeyIndex } from './PrimaryKeyIndex'
import type { AVLVisualNode } from '../structures/AVLTree'
import { DatabaseValidationError } from './DatabaseValidationError'
import {
  comparePrimaryKeyValues,
  type DatabaseColumn,
  type DatabaseFilter,
  type DatabaseRecord,
  type DatabaseTable,
  type DatabaseTableDefinition,
  type DatabaseValue,
  type PrimaryKeyValue,
} from '../types/database'
 
/**
 * Mantém o esquema e os registros de uma única tabela.
 * O índice AVL é a única estrutura de armazenamento dos registros.
 */
export class TableStore {
  private readonly primaryKeyColumn: DatabaseColumn
  private readonly primaryKeyIndex = new PrimaryKeyIndex(comparePrimaryKeyValues)
  private readonly columnByName = new Map<string, DatabaseColumn>()
  private readonly metadata: DatabaseTable

  public constructor(definition: DatabaseTableDefinition) {
    validateTableDefinition(definition)
    definition.columns.forEach((column) => this.columnByName.set(column.name, column))
    this.primaryKeyColumn = definition.columns.find((column) => column.primaryKey)!
    this.metadata = {
      name: definition.name,
      description: definition.description ?? '',
      columns: definition.columns.map((column) => ({ ...column })),
      recordCount: 0,
    }
  }

  public get name(): string {
    return this.metadata.name
  }

  public visualRoot(): AVLVisualNode<PrimaryKeyValue> | null {
    return this.primaryKeyIndex.visualRoot()
  }

  public get schema(): DatabaseTable {
    return {
      ...this.metadata,
      columns: this.metadata.columns.map((column) => ({ ...column })),
      recordCount: this.primaryKeyIndex.size,
    }
  }

  public insert(record: DatabaseRecord): boolean {
    return this.insertValidated(this.validateRecord(record))
  }

  public insertValidated(record: DatabaseRecord): boolean {
    const normalizedRecord = record
    const primaryKey = normalizedRecord[this.primaryKeyColumn.name]
    if (!isPrimaryKeyValue(primaryKey)) {
      throw new DatabaseValidationError(
        `A chave primária "${this.primaryKeyColumn.name}" deve possuir um valor válido.`,
      )
    }
    return this.primaryKeyIndex.insert(primaryKey, normalizedRecord)
  }

  public search(primaryKey: PrimaryKeyValue): DatabaseRecord | undefined {
    return this.primaryKeyIndex.search(primaryKey)
  }

  public list(): DatabaseRecord[] {
    return this.primaryKeyIndex.inOrder()
  }

  /**
   * Consulta os registros percorrendo a AVL em ordem e filtrando o resultado.
   * O array retornado é somente uma coleção temporária; a AVL continua sendo
   * a única estrutura de armazenamento dos registros.
   */
  public query(filters: DatabaseFilter[] = []): DatabaseRecord[] {
    const validatedFilters = filters.map((filter) => this.validateFilter(filter))
    return this.list().filter((record) =>
      validatedFilters.every((filter) => matchesFilter(record, filter)),
    )
  }

  public update(primaryKey: PrimaryKeyValue, record: DatabaseRecord): boolean {
    if (this.primaryKeyIndex.search(primaryKey) === undefined) {
      return false
    }
    return this.updateValidated(primaryKey, this.validateRecord(record))
  }

  public updateValidated(primaryKey: PrimaryKeyValue, record: DatabaseRecord): boolean {
    const normalizedRecord = record
    const updatedPrimaryKey = normalizedRecord[this.primaryKeyColumn.name]
    if (!isPrimaryKeyValue(updatedPrimaryKey)) {
      throw new DatabaseValidationError(
        `A chave primária "${this.primaryKeyColumn.name}" deve possuir um valor válido.`,
      )
    }
    if (comparePrimaryKeyValues(primaryKey, updatedPrimaryKey) !== 0) {
      throw new DatabaseValidationError(
        `A chave primária "${this.primaryKeyColumn.name}" não pode ser alterada durante a atualização.`,
      )
    }
    return this.primaryKeyIndex.update(primaryKey, normalizedRecord)
  }

  public remove(primaryKey: PrimaryKeyValue): boolean {
    return this.primaryKeyIndex.remove(primaryKey)
  }

  public validateIndex() {
    return this.primaryKeyIndex.validate()
  }

  public validateRecord(record: DatabaseRecord): DatabaseRecord {
    const normalizedRecord: DatabaseRecord = {}

    for (const fieldName of Object.keys(record)) {
      if (!this.columnByName.has(fieldName)) {
        throw new DatabaseValidationError(
          `A coluna "${fieldName}" não existe na tabela "${this.name}".`,
        )
      }
    }

    for (const column of this.metadata.columns) {
      const hasValue = Object.prototype.hasOwnProperty.call(record, column.name)
      const value = hasValue ? record[column.name] : null
      if (value === null) {
        if (!column.nullable || column.primaryKey) {
          throw new DatabaseValidationError(
            `A coluna "${column.name}" não aceita valores nulos.`,
          )
        }
        normalizedRecord[column.name] = null
        continue
      }
      if (!hasValue || value === undefined) {
        throw new DatabaseValidationError(`A coluna "${column.name}" deve ser preenchida.`)
      }
      if (!matchesColumnType(value, column)) {
        throw new DatabaseValidationError(
          `O valor da coluna "${column.name}" deve ser do tipo "${column.dataType}".`,
        )
      }
      normalizedRecord[column.name] = value
    }

    return normalizedRecord
  }

  private validateFilter(filter: DatabaseFilter): DatabaseFilter {
    const column = this.columnByName.get(filter.column)
    if (column === undefined) {
      throw new DatabaseValidationError(
        `A coluna "${filter.column}" não existe na tabela "${this.name}".`,
      )
    }
    if (!isQueryOperator(filter.operator)) {
      throw new DatabaseValidationError(`O operador "${filter.operator}" não é válido.`)
    }
    if (filter.value === null) {
      if (filter.operator !== '=' && filter.operator !== '!=') {
        throw new DatabaseValidationError(
          `O operador "${filter.operator}" não pode ser usado com valores NULL.`,
        )
      }
      return filter
    }
    if (!matchesColumnType(filter.value, column)) {
      throw new DatabaseValidationError(
        `O valor do filtro para a coluna "${column.name}" deve ser do tipo "${column.dataType}".`,
      )
    }
    if (column.dataType === 'boolean' && filter.operator !== '=' && filter.operator !== '!=') {
      throw new DatabaseValidationError(
        `O operador "${filter.operator}" não é compatível com a coluna booleana "${column.name}".`,
      )
    }
    return filter
  }
}

function validateTableDefinition(definition: DatabaseTableDefinition): void {
  if (!definition.name.trim()) {
    throw new DatabaseValidationError('O nome da tabela não pode ser vazio.')
  }
  if (definition.columns.length === 0) {
    throw new DatabaseValidationError(`A tabela "${definition.name}" deve possuir colunas.`)
  }

  const columnNames = new Set<string>()
  let primaryKeyCount = 0
  for (const column of definition.columns) {
    if (!column.name.trim()) {
      throw new DatabaseValidationError('O nome da coluna não pode ser vazio.')
    }
    if (columnNames.has(column.name)) {
      throw new DatabaseValidationError(
        `A coluna "${column.name}" foi declarada mais de uma vez.`,
      )
    }
    columnNames.add(column.name)
    if (column.primaryKey) {
      primaryKeyCount += 1
      if (column.nullable) {
        throw new DatabaseValidationError(
          `A chave primária "${column.name}" não pode aceitar valores nulos.`,
        )
      }
    }
  }
  if (primaryKeyCount !== 1) {
    throw new DatabaseValidationError('A tabela deve possuir exatamente uma chave primária.')
  }
}

function matchesColumnType(value: DatabaseValue, column: DatabaseColumn): boolean {
  switch (column.dataType) {
    case 'string':
      return typeof value === 'string'
    case 'int':
      return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value)
    case 'float':
      return typeof value === 'number' && Number.isFinite(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'date':
      return value instanceof Date && !Number.isNaN(value.getTime())
  }
}

function isPrimaryKeyValue(value: DatabaseValue): value is PrimaryKeyValue {
  return value !== null && (typeof value === 'string' || typeof value === 'number' || value instanceof Date)
}

function isQueryOperator(value: string): value is DatabaseFilter['operator'] {
  return value === '=' || value === '!=' || value === '>' || value === '<' || value === '>=' || value === '<='
}

function matchesFilter(record: DatabaseRecord, filter: DatabaseFilter): boolean {
  const recordValue = record[filter.column]
  if (filter.value === null) {
    return filter.operator === '=' ? recordValue === null : recordValue !== null
  }
  if (recordValue === null) {
    return false
  }

  const comparison = compareDatabaseValues(recordValue, filter.value)
  switch (filter.operator) {
    case '=':
      return comparison === 0
    case '!=':
      return comparison !== 0
    case '>':
      return comparison > 0
    case '<':
      return comparison < 0
    case '>=':
      return comparison >= 0
    case '<=':
      return comparison <= 0
  }
}

function compareDatabaseValues(left: Exclude<DatabaseValue, null>, right: Exclude<DatabaseValue, null>): number {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() < right.getTime() ? -1 : left.getTime() > right.getTime() ? 1 : 0
  }
  if (typeof left === 'string' && typeof right === 'string') {
    return left < right ? -1 : left > right ? 1 : 0
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return left < right ? -1 : left > right ? 1 : 0
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return left === right ? 0 : left === false ? -1 : 1
  }
  return 0
}
