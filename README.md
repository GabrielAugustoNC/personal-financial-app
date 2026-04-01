# 💰 Personal Finantial App

> A full stack personal finance tracker built as a study project with the support of **Claude AI (Anthropic)**.

---

## About

**Personal Finantial App** was born out of a hands-on learning process — the goal was to explore two brand-new technologies (**React** and **Go**) coming from a solid background in **Angular** and **.NET**, with Claude AI as a development partner throughout the entire journey: from initial architecture decisions to pinpointing specific bugs.

The result is a fully functional income and expense tracker, featuring a modern dark-themed frontend, an interface-driven backend, and a local NoSQL database.

---

## Tech Stack

| Layer     | Stack                                              |
|-----------|----------------------------------------------------|
| Frontend  | React 18 · TypeScript · Vite · SCSS Modules        |
| Backend   | Go 1.22 · Gin · layered architecture               |
| Database  | MongoDB · official Go driver                       |
| Quality   | strict TypeScript · no `any` · Go interfaces       |

---

## Features

- 📊 **Dashboard** with summary cards (income, expenses, balance) and area chart history
- ➕ **Full CRUD** for transactions with validation across all layers
- 🔍 **Filters** by type, category, title and date range
- 📥 **Bulk import** via `.json` file — supports plain string or MongoDB Extended JSON date format
- 📤 **Template download** to make importing easier
- 🗂️ **Sidebar navigation** by type (Income, Expenses, All)

---

## Architecture

The backend follows the same layered pattern familiar from the .NET ecosystem:

```
Handler (Controller) → Service (business logic) → Repository (MongoDB)
```

Each layer depends only on the **interface** of the layer below — never on the concrete implementation — ensuring low coupling and testability.

The frontend mirrors Angular's separation of concerns:

```
Service (HTTP) → Custom Hook (state) → Component (presentation)
```

---

## Built with AI Support

This project was built entirely in partnership with **Claude Code**, the AI assistant by [Anthropic](https://anthropic.com), as a study object. Throughout development, Claude acted as:

- 🏗️ **Architect** — proposing folder structure, layers, and interface contracts
- 🛠️ **Pair programmer** — generating, reviewing, and fixing code in real time
- 🐛 **Debugger** — diagnosing CORS, validation, typing, and JSON parsing issues

> *"The best way to learn a new stack is to build something real with it."*

---

## Getting Started

```bash
# Backend
cd backend && cp .env.example .env && go mod tidy && go run main.go

# Frontend
cd frontend && npm install && npm run dev
```
