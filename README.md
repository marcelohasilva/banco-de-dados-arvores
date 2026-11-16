# Database Studio

Fundação do projeto acadêmico de banco de dados relacional com registros baseados em árvores.

## Tecnologias

- React + TypeScript
- Vite
- Tailwind CSS
- Persistência, exportação/importação e interface CRUD serão implementadas nas próximas etapas.

## Executar localmente

```bash
npm install
npm run dev
```

Para validar a compilação de produção:

```bash
npm run build
```

Para executar os testes da árvore:

```bash
npm test
```

Para visualizar a compilação:

```bash
npm run preview
```

## Organização

```text
src/
├── components/   # Componentes reutilizáveis e layout
├── database/     # Catálogo, tabelas e índices por chave primária
├── pages/        # Páginas da aplicação
├── services/     # Serviços e regras de negócio
├── structures/   # Estruturas de dados próprias
├── styles/       # Estilos globais e Tailwind
├── types/        # Tipos TypeScript
└── utils/        # Funções auxiliares
```

Nesta etapa, a árvore AVL, o índice em memória por chave primária, o gerenciamento de tabelas e registros, as consultas simples, a persistência e a visualização gráfica foram implementados e testados. Os registros são armazenados na AVL de cada tabela; consultas percorrem a árvore em ordem e snapshots JSON versionados permitem salvar, recuperar, importar e exportar o banco. A tela de Árvores usa um snapshot somente leitura da topologia real para mostrar raiz, ligações, alturas e fatores de balanceamento.
