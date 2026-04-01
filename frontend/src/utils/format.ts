// ============================================================
// Utilitários — funções puras de formatação
// ============================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style                : 'currency',
    currency             : 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day  : '2-digit',
    month: 'short',
    year : 'numeric',
  }).format(new Date(dateString));
}

export function formatDateInput(dateString: string): string {
  return new Date(dateString).toISOString().substring(0, 10);
}

export function toISODateString(date: Date): string {
  return date.toISOString();
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
