/**
 * Nó interno da árvore AVL.
 *
 * A altura é armazenada no próprio nó para que o fator de balanceamento
 * possa ser calculado em tempo constante durante a subida da recursão.
 */
export class AVLNode<K, V> {
  public left: AVLNode<K, V> | null = null
  public right: AVLNode<K, V> | null = null

  public constructor(
    public key: K,
    public value: V,
    public height = 1,
  ) {}
} 

export type Comparator<K> = (left: K, right: K) => number

export interface AVLValidationResult {
  valid: boolean
  nodeCount: number
  height: number
  errors: string[]
}

export interface AVLVisualNode<K> {
  readonly key: K
  readonly height: number
  readonly balanceFactor: number
  readonly left: AVLVisualNode<K> | null
  readonly right: AVLVisualNode<K> | null
}

/**
 * Árvore AVL genérica: uma árvore binária de busca que se mantém
 * balanceada após inserções, atualizações e remoções.
 */
export class AVLTree<K, V> {
  private root: AVLNode<K, V> | null = null
  private readonly compare: Comparator<K>
  private treeSize = 0

  public constructor(compare: Comparator<K>) {
    this.compare = compare
  }

  public get size(): number {
    return this.treeSize
  }

  public get height(): number {
    return this.nodeHeight(this.root)
  }

  /**
   * Retorna uma cópia imutável da topologia da árvore para visualização.
   * Nenhuma referência aos nós internos é exposta ao consumidor.
   */
  public visualRoot(): AVLVisualNode<K> | null {
    return this.copyVisualNode(this.root)
  }

  public insert(key: K, value: V): boolean {
    const result = this.insertNode(this.root, key, value)
    this.root = result.node
    if (result.inserted) {
      this.treeSize += 1
    }
    return result.inserted
  }

  public search(key: K): V | undefined {
    let current = this.root
    while (current !== null) {
      const comparison = this.compare(key, current.key)
      if (comparison === 0) {
        return current.value
      }
      current = comparison < 0 ? current.left : current.right
    }
    return undefined
  }

  public has(key: K): boolean {
    let current = this.root
    while (current !== null) {
      const comparison = this.compare(key, current.key)
      if (comparison === 0) {
        return true
      }
      current = comparison < 0 ? current.left : current.right
    }
    return false
  }

  public update(key: K, value: V): boolean {
    let current = this.root
    while (current !== null) {
      const comparison = this.compare(key, current.key)
      if (comparison === 0) {
        current.value = value
        return true
      }
      current = comparison < 0 ? current.left : current.right
    }
    return false
  }

  public remove(key: K): boolean {
    const result = this.removeNode(this.root, key)
    this.root = result.node
    if (result.removed) {
      this.treeSize -= 1
    }
    return result.removed
  }

  public inOrder(): Array<{ key: K; value: V }> {
    const entries: Array<{ key: K; value: V }> = []
    this.collectInOrder(this.root, entries)
    return entries
  }

  public getBalanceFactor(key: K): number | undefined {
    let current = this.root
    while (current !== null) {
      const comparison = this.compare(key, current.key)
      if (comparison === 0) {
        return this.nodeHeight(current.left) - this.nodeHeight(current.right)
      }
      current = comparison < 0 ? current.left : current.right
    }
    return undefined
  }

  /**
   * Percorre toda a árvore e verifica as invariantes da AVL.
   * Os limites recebidos na recursão garantem a ordenação estrita da BST.
   */
  public validate(): AVLValidationResult {
    const result = this.validateNode(this.root, undefined, undefined)
    if (result.nodeCount !== this.treeSize) {
      result.errors.push(
        `Quantidade de nós inconsistente: esperada ${this.treeSize}, encontrada ${result.nodeCount}.`,
      )
    }
    return {
      valid: result.errors.length === 0,
      nodeCount: result.nodeCount,
      height: result.height,
      errors: result.errors,
    }
  }

  private insertNode(
    node: AVLNode<K, V> | null,
    key: K,
    value: V,
  ): { node: AVLNode<K, V>; inserted: boolean } {
    if (node === null) {
      return { node: new AVLNode(key, value), inserted: true }
    }

    const comparison = this.compare(key, node.key)
    if (comparison === 0) {
      node.value = value
      return { node, inserted: false }
    }

    if (comparison < 0) {
      const result = this.insertNode(node.left, key, value)
      node.left = result.node
      return { node: this.rebalance(node), inserted: result.inserted }
    }

    const result = this.insertNode(node.right, key, value)
    node.right = result.node
    return { node: this.rebalance(node), inserted: result.inserted }
  }

  private removeNode(
    node: AVLNode<K, V> | null,
    key: K,
  ): { node: AVLNode<K, V> | null; removed: boolean } {
    if (node === null) {
      return { node: null, removed: false }
    }

    const comparison = this.compare(key, node.key)
    if (comparison < 0) {
      const result = this.removeNode(node.left, key)
      node.left = result.node
      return { node: result.removed ? this.rebalance(node) : node, removed: result.removed }
    }
    if (comparison > 0) {
      const result = this.removeNode(node.right, key)
      node.right = result.node
      return { node: result.removed ? this.rebalance(node) : node, removed: result.removed }
    }

    if (node.left === null) {
      return { node: node.right, removed: true }
    }
    if (node.right === null) {
      return { node: node.left, removed: true }
    }

    const successor = this.minimum(node.right)
    node.key = successor.key
    node.value = successor.value
    const result = this.removeNode(node.right, successor.key)
    node.right = result.node
    return { node: this.rebalance(node), removed: true }
  }

  private rebalance(node: AVLNode<K, V>): AVLNode<K, V> {
    this.updateHeight(node)
    const balance = this.nodeHeight(node.left) - this.nodeHeight(node.right)

    if (balance > 1) {
      if (this.nodeHeight(node.left?.left ?? null) < this.nodeHeight(node.left?.right ?? null)) {
        node.left = this.rotateLeft(node.left!)
      }
      return this.rotateRight(node)
    }
    if (balance < -1) {
      if (this.nodeHeight(node.right?.right ?? null) < this.nodeHeight(node.right?.left ?? null)) {
        node.right = this.rotateRight(node.right!)
      }
      return this.rotateLeft(node)
    }
    return node
  }

  private rotateRight(node: AVLNode<K, V>): AVLNode<K, V> {
    const newRoot = node.left!
    node.left = newRoot.right
    newRoot.right = node
    this.updateHeight(node)
    this.updateHeight(newRoot)
    return newRoot
  }

  private rotateLeft(node: AVLNode<K, V>): AVLNode<K, V> {
    const newRoot = node.right!
    node.right = newRoot.left
    newRoot.left = node
    this.updateHeight(node)
    this.updateHeight(newRoot)
    return newRoot
  }

  private minimum(node: AVLNode<K, V>): AVLNode<K, V> {
    let current = node
    while (current.left !== null) {
      current = current.left
    }
    return current
  }

  private collectInOrder(node: AVLNode<K, V> | null, entries: Array<{ key: K; value: V }>): void {
    if (node === null) {
      return
    }
    this.collectInOrder(node.left, entries)
    entries.push({ key: node.key, value: node.value })
    this.collectInOrder(node.right, entries)
  }

  private nodeHeight(node: AVLNode<K, V> | null): number {
    return node?.height ?? 0
  }

  private updateHeight(node: AVLNode<K, V>): void {
    node.height = 1 + Math.max(this.nodeHeight(node.left), this.nodeHeight(node.right))
  }

  private copyVisualNode(node: AVLNode<K, V> | null): AVLVisualNode<K> | null {
    if (node === null) {
      return null
    }
    return {
      key: node.key,
      height: node.height,
      balanceFactor: this.nodeHeight(node.left) - this.nodeHeight(node.right),
      left: this.copyVisualNode(node.left),
      right: this.copyVisualNode(node.right),
    }
  }

  private validateNode(
    node: AVLNode<K, V> | null,
    lowerBound: K | undefined,
    upperBound: K | undefined,
  ): { nodeCount: number; height: number; errors: string[] } {
    if (node === null) {
      return { nodeCount: 0, height: 0, errors: [] }
    }

    const errors: string[] = []
    if (lowerBound !== undefined && this.compare(node.key, lowerBound) <= 0) {
      errors.push('Nó encontrado fora do limite inferior da ordenação BST.')
    }
    if (upperBound !== undefined && this.compare(node.key, upperBound) >= 0) {
      errors.push('Nó encontrado fora do limite superior da ordenação BST.')
    }

    const left = this.validateNode(node.left, lowerBound, node.key)
    const right = this.validateNode(node.right, node.key, upperBound)
    const calculatedHeight = 1 + Math.max(left.height, right.height)
    const balanceFactor = left.height - right.height

    if (node.height !== calculatedHeight) {
      errors.push(
        `Altura incorreta na chave: armazenada ${node.height}, calculada ${calculatedHeight}.`,
      )
    }
    if (Math.abs(balanceFactor) > 1) {
      errors.push(`Fator de balanceamento inválido: ${balanceFactor}.`)
    }

    return {
      nodeCount: 1 + left.nodeCount + right.nodeCount,
      height: calculatedHeight,
      errors: [...errors, ...left.errors, ...right.errors],
    }
  }
}
