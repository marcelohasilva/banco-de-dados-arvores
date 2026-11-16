import { DatabaseValidationError } from './DatabaseValidationError'
import { TableStore } from './TableStore'
import type {
  DatabaseRecord,
  DatabaseFilter,
  DatabaseTable,
  DatabaseTableDefinition,
  DatabaseValue,
  PrimaryKeyValue,
} from '../types/database'
import { comparePrimaryKeyValues } from '../types/database'
import {
  DATABASE_FILE_VERSION,
  decodeDatabaseRecord,
  encodeDatabaseRecord,
  parsePersistedDatabase,
  type PersistedDatabase,
  type StorageLike,
} from './DatabasePersistence'  

/**
 * Catálogo central de tabelas do banco em memória.
 * Os registros continuam armazenados nos índices AVL de cada TableStore.
 */
export class DatabaseManager {
  private readonly tables = new Map<string, TableStore>()
  private readonly storage?: StorageLike
  private readonly storageKey: string

  public constructor(
    public readonly name: string,
    public description = '',
    options: { storage?: StorageLike; storageKey?: string } = {},
  ) {
    this.storage = options.storage ?? getBrowserStorage()
    this.storageKey = options.storageKey ?? `database-studio:${name}`
  }

  public createTable(definition: DatabaseTableDefinition): DatabaseTable {
    if (this.tables.has(definition.name)) {
      throw new DatabaseValidationError(`A tabela "${definition.name}" já existe.`)
    }
    const table = new TableStore(definition)
    this.validateForeignKeyDefinitions(table)
    this.tables.set(table.name, table)
    this.save()
    return table.schema
  }

  public getTable(tableName: string): TableStore | undefined {
    return this.tables.get(tableName)
  }

  public listTables(): DatabaseTable[] {
    return Array.from(this.tables.values(), (table) => table.schema)
  }

  public dropTable(tableName: string): boolean {
    const table = this.tables.get(tableName)
    if (table === undefined) {
      return false
    }
    const dependentTable = this.findDependentTable(table.name)
    if (dependentTable !== undefined) {
      throw new DatabaseValidationError(
        `A tabela "${tableName}" não pode ser removida porque é referenciada pela tabela "${dependentTable.name}".`,
      )
    }
    const removed = this.tables.delete(table.name)
    if (removed) {
      this.save()
    }
    return removed
  }

  public insertRecord(
    tableName: string,
    record: DatabaseRecord,
  ): boolean {
    const table = this.requireTable(tableName)
    const normalizedRecord = table.validateRecord(record)
    this.validateForeignKeyValues(table, normalizedRecord)
    const inserted = table.insertValidated(normalizedRecord)
    if (inserted) {
      this.save()
    }
    return inserted
  }

  public searchRecord(
    tableName: string,
    primaryKey: PrimaryKeyValue,
  ): DatabaseRecord | undefined {
    return this.requireTable(tableName).search(primaryKey)
  }

  public listRecords(tableName: string): DatabaseRecord[] {
    return this.requireTable(tableName).list()
  }

  public queryRecords(tableName: string, filters: DatabaseFilter[] = []): DatabaseRecord[] {
    return this.requireTable(tableName).query(filters)
  }

  public updateRecord(
    tableName: string,
    primaryKey: PrimaryKeyValue,
    record: DatabaseRecord,
  ): boolean {
    const table = this.requireTable(tableName)
    if (table.search(primaryKey) === undefined) {
      return false
    }
    const normalizedRecord = table.validateRecord(record)
    this.validateForeignKeyValues(table, normalizedRecord)
    const updated = table.updateValidated(primaryKey, normalizedRecord)
    if (updated) {
      this.save()
    }
    return updated
  }

  public removeRecord(tableName: string, primaryKey: PrimaryKeyValue): boolean {
    const table = this.requireTable(tableName)
    if (table.search(primaryKey) === undefined) {
      return false
    }
    const dependentTable = this.findDependentRecord(table.name, primaryKey)
    if (dependentTable !== undefined) {
      throw new DatabaseValidationError(
        `O registro não pode ser removido porque é referenciado pela tabela "${dependentTable.name}".`,
      )
    }
    const removed = table.remove(primaryKey)
    if (removed) {
      this.save()
    }
    return removed
  }

  public exportJSON(): string {
    return JSON.stringify(this.toPersistedDatabase(), null, 2)
  }

  public downloadJSON(fileName = `${this.name}.json`): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      throw new DatabaseValidationError('A exportação de arquivo exige um ambiente de navegador.')
    }
    const blob = new Blob([this.exportJSON()], { type: 'application/json' })
    const link = document.createElement('a')
    const objectUrl = URL.createObjectURL(blob)
    link.href = objectUrl
    link.download = fileName
    link.click()
    URL.revokeObjectURL(objectUrl)
  }

  public save(): void {
    if (this.storage !== undefined) {
      this.storage.setItem(this.storageKey, this.exportJSON())
    }
  }

  public restore(): boolean {
    if (this.storage === undefined) {
      return false
    }
    const json = this.storage.getItem(this.storageKey)
    if (json === null) {
      return false
    }
    try {
      const candidate = DatabaseManager.fromJSON(json, {
        storage: this.storage,
        storageKey: this.storageKey,
      })
      this.replaceWith(candidate)
      return true
    } catch (error) {
      if (error instanceof DatabaseValidationError) {
        return false
      }
      throw error
    }
  }

  public importJSON(json: string): void {
    const candidate = DatabaseManager.fromJSON(json, {
      storage: this.storage,
      storageKey: this.storageKey,
    })
    this.replaceWith(candidate)
    this.save()
  }

  public async importFile(file: Blob): Promise<void> {
    this.importJSON(await file.text())
  }

  public static fromJSON(
    json: string,
    options: { storage?: StorageLike; storageKey?: string } = {},
  ): DatabaseManager {
    const persisted = parsePersistedDatabase(json)
    const manager = new DatabaseManager(persisted.name, persisted.description, options)
    manager.loadPersistedTables(persisted)
    return manager
  }

  public static open(
    name: string,
    description = '',
    options: { storage?: StorageLike; storageKey?: string } = {},
  ): DatabaseManager {
    const manager = new DatabaseManager(name, description, options)
    manager.restore()
    return manager
  }

  private toPersistedDatabase(): PersistedDatabase {
    const tables = Array.from(this.tables.values(), (table) => {
      const schema = table.schema
      const definition: DatabaseTableDefinition = {
        name: schema.name,
        description: schema.description,
        columns: schema.columns,
      }
      return {
        definition,
        records: table.list().map((record) => encodeDatabaseRecord(record, definition)),
      }
    })
    return {
      format: 'database-studio',
      version: DATABASE_FILE_VERSION,
      name: this.name,
      description: this.description,
      tables,
    }
  }

  private loadPersistedTables(persisted: PersistedDatabase): void {
    const pending = [...persisted.tables]
    const creationOrder: typeof persisted.tables = []
    while (pending.length > 0) {
      const before = pending.length
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        const persistedTable = pending[index]
        if (!this.canCreateTable(persistedTable.definition)) {
          continue
        }
        this.createTableWithoutSaving(persistedTable.definition)
        creationOrder.push(persistedTable)
        pending.splice(index, 1)
      }
      if (pending.length === before) {
        throw new DatabaseValidationError(
          'Não foi possível resolver as dependências entre as tabelas importadas.',
        )
      }
    }

    for (const persistedTable of creationOrder) {
      const table = this.requireTable(persistedTable.definition.name)
      for (const persistedRecord of persistedTable.records) {
        const record = decodeDatabaseRecord(persistedRecord, persistedTable.definition)
        const normalizedRecord = table.validateRecord(record)
        this.validateForeignKeyValues(table, normalizedRecord)
        if (!table.insertValidated(normalizedRecord)) {
          throw new DatabaseValidationError(
            `A tabela "${table.name}" contém uma chave primária duplicada.`,
          )
        }
      }
    }
  }

  private canCreateTable(definition: DatabaseTableDefinition): boolean {
    return definition.columns.every((column) =>
      column.foreignKey === undefined || this.tables.has(column.foreignKey.tableName),
    )
  }

  private createTableWithoutSaving(definition: DatabaseTableDefinition): void {
    if (this.tables.has(definition.name)) {
      throw new DatabaseValidationError(`A tabela "${definition.name}" foi declarada mais de uma vez.`)
    }
    const table = new TableStore(definition)
    this.validateForeignKeyDefinitions(table)
    this.tables.set(table.name, table)
  }

  private replaceWith(candidate: DatabaseManager): void {
    this.tables.clear()
    for (const [tableName, table] of candidate.tables) {
      this.tables.set(tableName, table)
    }
    this.description = candidate.description
  }

  private validateForeignKeyDefinitions(table: TableStore): void {
    for (const column of table.schema.columns) {
      const reference = column.foreignKey
      if (reference === undefined) {
        continue
      }
      const referencedTable = this.tables.get(reference.tableName)
      if (referencedTable === undefined) {
        throw new DatabaseValidationError(
          `A tabela referenciada "${reference.tableName}" não existe.`,
        )
      }
      const referencedColumn = referencedTable.schema.columns.find(
        (candidate) => candidate.name === reference.columnName,
      )
      if (referencedColumn === undefined) {
        throw new DatabaseValidationError(
          `A coluna referenciada "${reference.tableName}.${reference.columnName}" não existe.`,
        )
      }
      if (!referencedColumn.primaryKey) {
        throw new DatabaseValidationError(
          `A coluna referenciada "${reference.tableName}.${reference.columnName}" deve ser chave primária.`,
        )
      }
      if (column.dataType !== referencedColumn.dataType) {
        throw new DatabaseValidationError(
          `Os tipos da referência "${table.name}.${column.name}" e "${reference.tableName}.${reference.columnName}" são incompatíveis.`,
        )
      }
    }
  }

  private validateForeignKeyValues(table: TableStore, record: DatabaseRecord): void {
    for (const column of table.schema.columns) {
      const reference = column.foreignKey
      const value = record[column.name]
      if (reference === undefined || value === null) {
        continue
      }
      const referencedTable = this.requireTable(reference.tableName)
      if (!isPrimaryKeyValue(value)) {
        throw new DatabaseValidationError(
          `O valor da chave estrangeira "${table.name}.${column.name}" é inválido.`,
        )
      }
      if (referencedTable.search(value) === undefined) {
        throw new DatabaseValidationError(
          `A referência "${table.name}.${column.name}" não encontrou o registro "${reference.tableName}.${reference.columnName}=${formatValue(value)}".`,
        )
      }
    }
  }

  private findDependentTable(tableName: string): TableStore | undefined {
    return Array.from(this.tables.values()).find((table) =>
      table.schema.columns.some((column) => column.foreignKey?.tableName === tableName),
    )
  }

  private findDependentRecord(
    tableName: string,
    primaryKey: PrimaryKeyValue,
  ): TableStore | undefined {
    return Array.from(this.tables.values()).find((table) =>
      table.schema.columns.some((column) => {
        const reference = column.foreignKey
        if (reference?.tableName !== tableName) {
          return false
        }
        return table.list().some((record) => {
          const value = record[column.name]
          return isPrimaryKeyValue(value) && comparePrimaryKeyValues(value, primaryKey) === 0
        })
      }),
    )
  }

  private requireTable(tableName: string): TableStore {
    const table = this.tables.get(tableName)
    if (table === undefined) {
      throw new DatabaseValidationError(`A tabela "${tableName}" não existe.`)
    }
    return table
  }
}

function isPrimaryKeyValue(value: DatabaseValue): value is PrimaryKeyValue {
  return value !== null && (typeof value === 'string' || typeof value === 'number' || value instanceof Date)
}

function formatValue(value: PrimaryKeyValue): string {
  return value instanceof Date ? value.toISOString() : String(value)
}

function getBrowserStorage(): StorageLike | undefined {
  if (typeof localStorage === 'undefined') {
    return undefined
  }
  return localStorage
}
