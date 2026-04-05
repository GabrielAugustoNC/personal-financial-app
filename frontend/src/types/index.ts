// ============================================================
// Tipos e interfaces centrais da aplicação.
// Define os contratos de dados compartilhados entre todas as camadas do frontend.
// Nenhum uso de "any" — todos os tipos são explícitos e verificados pelo TypeScript.
// Analogia Angular: interfaces em models/ ou shared/types
// ============================================================

// TransactionType representa os dois tipos possíveis de uma transação.
// Uso de union type em vez de enum para serialização direta com o backend.
export type TransactionType = 'income' | 'expense';

// Transaction representa um lançamento financeiro retornado pela API.
// Espelha exatamente a estrutura do documento MongoDB serializado pelo backend.
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

// CreateTransactionInput define os dados necessários para criar uma nova transação.
// Todos os campos são obrigatórios — validados também no backend.
export interface CreateTransactionInput {
  title       : string;
  amount      : number;
  type        : TransactionType;
  category    : string;
  description : string;
  date        : string;
}

// UpdateTransactionInput define os dados para atualização parcial de uma transação.
// Todos os campos são opcionais — apenas os enviados serão atualizados (PATCH semantics).
export interface UpdateTransactionInput {
  title?       : string;
  amount?      : number;
  type?        : TransactionType;
  category?    : string;
  description? : string;
  date?        : string;
}

// TransactionFilter define os parâmetros aceitos para filtrar a listagem de transações.
// Enviados como query string na requisição GET /api/transactions.
export interface TransactionFilter {
  type?       : TransactionType;
  category?   : string;
  title?      : string;
  start_date? : string;
  end_date?   : string;
}

// TransactionSummary representa o resumo financeiro agregado retornado pelo backend.
// Calculado via aggregation pipeline no MongoDB.
export interface TransactionSummary {
  total_income   : number;
  total_expenses : number;
  balance        : number;
  count          : number;
}

// ApiResponse é o envelope padrão de todas as respostas da API.
// O backend sempre envolve os dados nesta estrutura para consistência.
// Analogia .NET: ActionResult<ApiResponse<T>> padronizado
export interface ApiResponse<T> {
  success : boolean;
  data?   : T;
  message?: string;
  error?  : string;
}

// LoadingState representa os estados possíveis de uma operação assíncrona.
// Usado em conjunto com AsyncState<T> para controle de UI.
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// AsyncState<T> encapsula dados, estado de carregamento e mensagem de erro
// em um único objeto coeso para gerenciamento de estado assíncrono.
// Analogia Angular: padrão com BehaviorSubject<{ data, loading, error }>
export interface AsyncState<T> {
  data   : T | null;
  status : LoadingState;
  error  : string | null;
}

// WithChildren é uma interface utilitária para componentes que aceitam filhos React.
export interface WithChildren {
  children: React.ReactNode;
}

// WithClassName é uma interface utilitária para componentes que aceitam className externo.
export interface WithClassName {
  className?: string;
}

// INCOME_CATEGORIES lista as categorias disponíveis para transações de receita.
// Definida como const array para tipagem literal estrita com typeof.
export const INCOME_CATEGORIES  = ['Salário', 'Freelance', 'Investimentos', 'Presente', 'Outros'] as const;

// EXPENSE_CATEGORIES lista as categorias disponíveis para transações de despesa.
export const EXPENSE_CATEGORIES = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Vestuário', 'Assinaturas', 'Cartão de Crédito', 'Empréstimos', 'Outros'] as const;

// Tipos derivados das constantes de categorias — garantem que apenas valores válidos sejam usados.
export type IncomeCategoryType  = typeof INCOME_CATEGORIES[number];
export type ExpenseCategoryType = typeof EXPENSE_CATEGORIES[number];

// ---- Tipos de importação em massa ----

// MongoDate representa o formato de data do MongoDB Extended JSON.
// Usado quando o arquivo de importação foi exportado diretamente do MongoDB Compass.
export interface MongoDate {
  $date: string;
}

// ImportTransactionItem representa cada item de um arquivo JSON de importação.
// Aceita data tanto como string plana quanto como objeto MongoDB Extended JSON.
export interface ImportTransactionItem {
  title       : string;
  amount      : number;
  type        : TransactionType;
  category    : string;
  description : string;
  date        : MongoDate | string;
}

// BulkImportResponse é a resposta do endpoint de importação em massa.
// Informa quantos itens foram processados com sucesso do total enviado.
export interface BulkImportResponse {
  success  : boolean;
  message  : string;
  imported : number;
  total    : number;
  error?   : string;
}
