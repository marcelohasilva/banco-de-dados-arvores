import { AVLTree, type Comparator, type AVLVisualNode } from '../structures/AVLTree'
import type { DatabaseRecord, PrimaryKeyValue } from '../types/database'

/**
 * Índice de registros que associa a chave primária de cada registro a uma AVL.
 * Restrições de chave estrangeira e persistência ficam fora desta etapa.
 */
export class PrimaryKeyIndex {
  private readonly tree: AVLTree<PrimaryKeyValue, DatabaseRecord>

  public constructor(compare: Comparator<PrimaryKeyValue>) {
    this.tree = new AVLTree(compare)
  } 

  public insert(primaryKey: PrimaryKeyValue, record: DatabaseRecord): boolean {
    if (this.tree.has(primaryKey)) {
      return false
    }
    return this.tree.insert(primaryKey, record)
  }

  public search(primaryKey: PrimaryKeyValue): DatabaseRecord | undefined {
    return this.tree.search(primaryKey)
  }

  public update(primaryKey: PrimaryKeyValue, record: DatabaseRecord): boolean {
    return this.tree.update(primaryKey, record)
  }

  public remove(primaryKey: PrimaryKeyValue): boolean {
    return this.tree.remove(primaryKey)
  }

  public inOrder(): DatabaseRecord[] {
    return this.tree.inOrder().map((entry) => entry.value)
  }

  public get size(): number {
    return this.tree.size
  }

  public get height(): number {
    return this.tree.height
  }

  public visualRoot(): AVLVisualNode<PrimaryKeyValue> | null {
    return this.tree.visualRoot()
  }

  public validate() {
    return this.tree.validate()
  }
}
