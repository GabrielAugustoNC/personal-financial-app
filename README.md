# 💰 Finanças App

> Aplicação full stack de controle financeiro pessoal, desenvolvida como objeto de estudo com o apoio da IA **Claude (Anthropic)**.

---

## Sobre o projeto

O **Finanças App** nasceu de um processo de aprendizado prático — a ideia era explorar duas tecnologias completamente novas (**React** e **Go**) partindo de uma base sólida em **Angular** e **.NET**, com a IA Claude como parceira de desenvolvimento ao longo de todo o processo: desde a arquitetura inicial até a resolução de bugs pontuais.

O resultado é uma plataforma funcional de controle de receitas e despesas, com frontend moderno em tema dark, backend orientado a interfaces e banco de dados NoSQL local.

---

## Tecnologias

| Camada    | Stack                                              |
|-----------|----------------------------------------------------|
| Frontend  | React 18 · TypeScript · Vite · SCSS Modules        |
| Backend   | Go 1.22 · Gin · arquitetura em camadas             |
| Banco     | MongoDB · driver oficial Go                        |

---

## Funcionalidades

- 📊 **Dashboard** com cards de resumo (receitas, despesas, saldo) e gráfico de histórico
- ➕ **CRUD completo** de transações com validação em todas as camadas
- 🔍 **Filtros** por tipo, categoria, título e intervalo de datas
- 📥 **Importação em massa** via arquivo `.json` — aceita string plana ou formato MongoDB Extended JSON
- 📤 **Download de modelo** `.json` para facilitar a importação
- 🗂️ **Navegação por tipo** via sidebar (Receitas, Despesas, Todas)

---

## Arquitetura

O backend segue o padrão de camadas familiar ao ecossistema .NET:

```
Handler (Controller) → Service (regras de negócio) → Repository (MongoDB)
```

Cada camada depende apenas da **interface** da camada seguinte — não da implementação concreta — o que garante baixo acoplamento e facilidade para testes.

O frontend organiza responsabilidades de forma análoga ao Angular:

```
Service (HTTP) → Hook customizado (estado) → Componente (apresentação)
```

---

## Desenvolvido com apoio de IA

Este projeto foi inteiramente construído em parceria com o **Claude Code**, IA da [Anthropic](https://anthropic.com), como objeto de estudo. Durante o desenvolvimento, o Claude atuou como:

- 🏗️ **Arquiteto** — propondo a estrutura de pastas, camadas e contratos de interface
- 🛠️ **Pair programmer** — gerando, revisando e corrigindo código em tempo real
- 🐛 **Debugger** — diagnosticando erros de CORS, validação, tipagem e parsing de JSON

---

## Como rodar

```bash
# Backend
cd backend && cp .env.example .env && go mod tidy && go run main.go

# Frontend
cd frontend && npm install && npm run dev
```

