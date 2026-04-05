// ============================================================
// Utilitários de formatação — funções puras sem efeitos colaterais.
// Todas as funções recebem um valor e retornam uma string formatada.
// Centralizadas aqui para evitar duplicação e facilitar ajustes futuros.
// ============================================================

// formatCurrency formata um número como moeda brasileira (BRL).
// Usa a API nativa Intl.NumberFormat para localização correta.
// Exemplo: 1234.5 → "R$ 1.234,50"
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style                : 'currency',
    currency             : 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

// formatDate converte uma string ISO 8601 em data legível no formato brasileiro.
// Exemplo: "2026-03-13T00:00:00.000Z" → "13 de mar. de 2026"
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day  : '2-digit',
    month: 'short',
    year : 'numeric',
  }).format(new Date(dateString));
}

// formatDateInput converte uma string ISO 8601 para o formato YYYY-MM-DD.
// Necessário para preencher inputs do tipo date no HTML.
// Exemplo: "2026-03-13T00:00:00.000Z" → "2026-03-13"
export function formatDateInput(dateString: string): string {
  return new Date(dateString).toISOString().substring(0, 10);
}

// toISODateString converte um objeto Date para string ISO 8601 completa.
// Usado ao submeter datas dos formulários para a API.
export function toISODateString(date: Date): string {
  return date.toISOString();
}

// cn concatena classes CSS filtrando valores falsy (null, undefined, false).
// Substitui a biblioteca classnames para casos simples sem dependência extra.
// Exemplo: cn('btn', isActive && 'btn--active', undefined) → "btn btn--active"
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
