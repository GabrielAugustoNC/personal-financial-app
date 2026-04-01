# Contexto do Projeto — Finanças App

## Stack
- **Backend:** Go 1.22 + Gin + MongoDB Driver
- **Frontend:** React 18 + TypeScript + Vite + SCSS Modules
- **Banco:** MongoDB (local, porta 27017)
- **Ports:** Backend :8080 | Frontend :5173

### Go (Backend)
- Orientação a objetos via structs + interfaces
- Camadas: Handler → Service → Repository (igual ao .NET)
- Interfaces definidas em `/interfaces/` para facilitar mocking
- Erros sempre verificados e tratados — nunca ignorados com `_`
- Comentários em português explicando o porquê das decisões

### TypeScript (Frontend)
- `strict: true` no tsconfig — sem `any` implícito
- SCSS Modules para estilos (`Component.module.scss`)
- Variáveis e design tokens centralizados em `_variables.scss`
- Hooks customizados para lógica com estado
- Services como classes singleton para chamadas HTTP

### Geral
- Mensagens de commit em português
- Sem hardcode de URLs — sempre via variáveis de ambiente
- Nomes de variáveis em português no domínio de negócio

## Estrutura

```
financas-app/
├── CLAUDE.md                              ← raiz do projeto
│
├── backend/
│   ├── main.go                            ← "main.go"
│   ├── package                            ← "package" (go.mod)
│   │
│   ├── config/
│   │   └── config.go                      ← "config.go"
│   │
│   ├── models/
│   │   └── transaction.go                 ← "transaction.go"
│   │
│   ├── interfaces/
│   │   └── repository.go                  ← "repository.go"
│   │
│   ├── repositories/
│   │   └── transaction_repository.go      ← "transaction_repository.go"
│   │
│   ├── services/
│   │   └── transaction_service.go         ← "transaction_service.go"
│   │
│   ├── handlers/
│   │   └── transaction_handler.go         ← "transaction_handler.go"
│   │
│   └── routes/
│       └── routes.go                      ← "routes.go"
│
└── frontend/
    ├── package                            ← "package" (package.json)
    ├── tsconfig                           ← "tsconfig"
    ├── vite.config                        ← "vite.config"
    │
    └── src/
        ├── main.tsx                       ← "main.tsx"
        ├── App.tsx                        ← "App.tsx"
        │
        ├── types/
        │   └── index.ts                   ← "index"
        │
        ├── services/
        │   ├── api.ts                     ← "api"
        │   └── transactionService.ts      ← "transactionService"
        │
        ├── hooks/
        │   └── useTransactions.ts         ← "useTransactions"
        │
        ├── utils/
        │   └── format.ts                  ← "format"
        │
        ├── styles/
        │   ├── _variables.scss            ← "_variables.scss"
        │   ├── _mixins.scss               ← "_mixins.scss"
        │   └── global.scss                ← "global.scss"
        │
        └── components/
            ├── Sidebar/
            │   ├── Sidebar.tsx            ← "Sidebar.tsx"
            │   └── Sidebar.module.scss    ← "Sidebar.module.scss"
            │
            ├── SummaryCard/
            │   ├── SummaryCard.tsx        ← "SummaryCard.tsx"
            │   └── SummaryCard.module.scss
            │
            ├── TransactionList/
            │   ├── TransactionList.tsx
            │   └── TransactionList.module.scss
            │
            ├── TransactionForm/
            │   ├── TransactionForm.tsx
            │   └── TransactionForm.module.scss
            │
            └── Dashboard/
                ├── Dashboard.tsx
                └── Dashboard.module.scss
```

## Comandos Iniciais

```bash
# Backend
cd backend && go run main.go

# Frontend
cd frontend && npm install && npm run dev
```
