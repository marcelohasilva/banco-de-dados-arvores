import { describe, expect, it } from 'vitest'
import { AVLTree } from './AVLTree'

describe('representação visual da AVL', () => {
  it('retorna uma cópia da hierarquia com alturas e fatores', () => {
    const tree = new AVLTree<number, string>((left, right) => left - right)
    tree.insert(30, '30')
    tree.insert(10, '10')
    tree.insert(20, '20')

    expect(tree.visualRoot()).toEqual({
      key: 20,
      height: 2,
      balanceFactor: 0,
      left: { key: 10, height: 1, balanceFactor: 0, left: null, right: null },
      right: { key: 30, height: 1, balanceFactor: 0, left: null, right: null },
    })
  })

  it('retorna null para uma árvore vazia e não expõe os nós internos', () => {
    const tree = new AVLTree<number, string>((left, right) => left - right)
    expect(tree.visualRoot()).toBeNull()
  })
})
