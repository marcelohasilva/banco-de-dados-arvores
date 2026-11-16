export type NavigationItem =
  | 'Visão geral'
  | 'Tabelas'
  | 'Consultas'
  | 'Árvores'
  | 'Relacionamentos'

export interface NavigationEntry {
  label: NavigationItem
  icon: string
}
