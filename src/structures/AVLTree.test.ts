import { describe, expect, it } from 'vitest'
import { AVLTree } from './AVLTree'

const numericTree = () => new AVLTree<number, string>((left, right) => left - right)

describe('AVLTree', () => {
  it('insere, busca, atualiza e lista em ordem', () => {
    const tree = numericTree()
    tree.insert(30, 'trinta')
    tree.insert(10, 'dez')
    tree.insert(20, 'vinte')

    expect(tree.search(10)).toBe('dez')
    expect(tree.update(20, 'vinte atualizado')).toBe(true)
    expect(tree.search(20)).toBe('vinte atualizado')
    expect(tree.inOrder().map((entry) => entry.key)).toEqual([10, 20, 30])
    expect(tree.size).toBe(3)
    expect(tree.validate().valid).toBe(true)
  })

  it('substitui o valor sem duplicar uma chave', () => {
    const tree = numericTree()
    tree.insert(1, 'antigo')
    tree.insert(1, 'novo')

    expect(tree.size).toBe(1)
    expect(tree.search(1)).toBe('novo')
  })

  it('remove folhas e nós com dois filhos', () => {
    const tree = numericTree()
    ;[20, 10, 30, 5, 15, 25, 35].forEach((key) => tree.insert(key, String(key)))

    expect(tree.remove(5)).toBe(true)
    expect(tree.remove(20)).toBe(true)
    expect(tree.remove(999)).toBe(false)
    expect(tree.inOrder().map((entry) => entry.key)).toEqual([10, 15, 25, 30, 35])
    expect(tree.size).toBe(5)
  })

  it('remove um nó com apenas um filho', () => {
    const tree = numericTree()
    tree.insert(20, '20')
    tree.insert(10, '10')
    tree.insert(5, '5')

    expect(tree.remove(10)).toBe(true)
    expect(tree.inOrder().map((entry) => entry.key)).toEqual([5, 20])
    expect(tree.size).toBe(2)
    expect(tree.validate().valid).toBe(true)
  })

  it.each([
    { name: 'rotação simples à direita', keys: [30, 20, 10] },
    { name: 'rotação simples à esquerda', keys: [10, 20, 30] },
    { name: 'rotação dupla esquerda-direita', keys: [30, 10, 20] },
    { name: 'rotação dupla direita-esquerda', keys: [10, 30, 20] },
  ])('mantém equilíbrio com $name', ({ keys }) => {
    const tree = numericTree()
    keys.forEach((key) => tree.insert(key, String(key)))

    expect(tree.height).toBe(2)
    expect(tree.getBalanceFactor(20)).toBe(0)
    expect(tree.inOrder().map((entry) => entry.key)).toEqual([10, 20, 30])
  })

  it('continua balanceada após remoções', () => {
    const tree = numericTree()
    for (let key = 1; key <= 31; key += 1) {
      tree.insert(key, String(key))
    }
    for (let key = 1; key <= 15; key += 1) {
      tree.remove(key)
    }

    expect(tree.inOrder().map((entry) => entry.key)).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 16),
    )
    expect(tree.height).toBeLessThanOrEqual(5)
    expect(tree.validate()).toEqual({
      valid: true,
      nodeCount: 16,
      height: tree.height,
      errors: [],
    })
  })

  it('valida a estrutura completa depois de inserções em ordens diferentes', () => {
    const insertionOrders = [
      [1, 2, 3, 4, 5, 6, 7],
      [7, 6, 5, 4, 3, 2, 1],
      [4, 2, 6, 1, 3, 5, 7],
    ]

    insertionOrders.forEach((keys) => {
      const tree = numericTree()
      keys.forEach((key) => tree.insert(key, String(key)))
      ;[2, 6].forEach((key) => tree.remove(key))

      const validation = tree.validate()
      expect(validation.valid).toBe(true)
      expect(validation.nodeCount).toBe(5)
      expect(validation.errors).toEqual([])
    })
  })

  it('indica buscas e atualizações de chaves inexistentes', () => {
    const tree = numericTree()
    tree.insert(1, 'um')

    expect(tree.search(999)).toBeUndefined()
    expect(tree.update(999, 'inexistente')).toBe(false)
  })
})
