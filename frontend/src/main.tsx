// ============================================================
// main.tsx — ponto de entrada do frontend React.
// Monta o componente raiz App no elemento #root do index.html.
// Importa os estilos globais antes de qualquer componente.
// React.StrictMode ativa verificações extras de desenvolvimento:
// detecta efeitos colaterais inesperados e APIs obsoletas.
// Analogia Angular: main.ts com bootstrapApplication(AppComponent)
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@/styles/global.scss';

// Busca o elemento raiz no DOM — lança erro descritivo se não for encontrado
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento #root não encontrado no DOM. Verifique o index.html.');
}

// Cria a raiz React e renderiza o App em modo estrito
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
