// ============================================================
// Types — contratos de dados compartilhados entre camadas
// Analogia Angular: interfaces em models/ ou shared/types
// Nenhum "any" — todos os campos tipados explicitamente
// ============================================================

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id          : string;
  title       : string;
  amount      : number;
  type        : TransactionType;
  category    : string;
  description : string;
  date        : string;
  created_at  : string;
  updated_at  : string;
}

export interface CreateTransactionInput {
  title       : string;
  amount      : number;
  type        : TransactionType;
  category    : string;
  description : string;
  date        : string;
}

export interface UpdateTransactionInput {
  title?       : string;
  amount?      : number;
  type?        : TransactionType;
  category?    : string;
  description? : string;
  date?        : string;
}

export interface TransactionFilter {
  type?       : TransactionType;
  category?   : string;
  title?      : string;
  start_date? : string;
  end_date?   : string;
}

export interface TransactionSummary {
  total_income   : number;
  total_expenses : number;
  balance        : number;
  count          : number;
}

// ---- Resposta padronizada da API ----
// Espelha o padrão { success, data, message, error } do backend Go
export interface ApiResponse<T> {
  success : boolean;
  data?   : T;
  message?: string;
  error?  : string;
}

// ---- Estado de UI ----
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data   : T | null;
  status : LoadingState;
  error  : string | null;
}

// ---- Props utilitárias ----
export interface WithChildren {
  children: React.ReactNode;
}

export interface WithClassName {
  className?: string;
}

// ---- Categorias de transação ----
export const INCOME_CATEGORIES  = ['Salário', 'Freelance', 'Investimentos', 'Presente', 'Outros'] as const;
export const EXPENSE_CATEGORIES = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Vestuário', 'Assinaturas', 'Outros'] as const;

export type IncomeCategoryType  = typeof INCOME_CATEGORIES[number];
export type ExpenseCategoryType = typeof EXPENSE_CATEGORIES[number];

// ---- Importação em massa ----

// Formato de data do MongoDB Extended JSON: { "$date": "2026-03-13T00:00:00.000Z" }
export interface MongoDate {
  $date: string;
}

// Item de importação — espelha o formato do JSON exportado pelo MongoDB
export interface ImportTransactionItem {
  title       : string;
  amount      : number;
  type        : TransactionType;
  category    : string;
  description : string;
  date        : MongoDate | string;
}

// Resposta do endpoint de importação em massa
export interface BulkImportResponse {
  success  : boolean;
  message  : string;
  imported : number;
  total    : number;
  error?   : string;
}
