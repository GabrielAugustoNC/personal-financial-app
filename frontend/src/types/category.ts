// ============================================================
// Tipos de domínio para categorias e detalhes de cartão de crédito.
// Espelham exatamente as structs Go do backend.
// ============================================================

// CategoryType define os tipos possíveis de uma categoria.
export type CategoryType = 'income' | 'expense';

// Category representa uma categoria de transação armazenada no banco.
// Substituiu as constantes hardcoded — agora são dados dinâmicos da API.
export interface Category {
  id        : string;
  name      : string;
  type      : CategoryType;
  created_at: string;
}

// CreateCategoryInput é o DTO de entrada para criação de uma nova categoria.
export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
}

// BulkCategoryUpdateInput é o DTO para propagação de categoria por similaridade de título.
export interface BulkCategoryUpdateInput {
  reference_title : string; // título da transação que foi alterada
  new_category    : string; // nova categoria a propagar
}

// BulkCategoryUpdateResult é a resposta do endpoint de propagação em massa.
export interface BulkCategoryUpdateResult {
  success : boolean;
  updated : number;  // quantidade de transações atualizadas
  message : string;
}

// ---- Detalhes de Cartão de Crédito ----

// CardDetailItem representa um item de gasto dentro de uma fatura de cartão.
export interface CardDetailItem {
  name    : string;
  amount  : number;
  category: string;
}

// CardDetail agrupa todos os itens de detalhe de uma fatura específica.
export interface CardDetail {
  id             : string;
  transaction_id : string;
  items          : CardDetailItem[];
  invoice_total  : number;   // valor original da fatura
  allocated_total: number;   // soma dos itens importados
  remaining      : number;   // valor não alocado (registrado como "Outros")
  updated_at     : string;
}

// ImportCardDetailInput é o DTO de entrada para importação de detalhes.
export interface ImportCardDetailInput {
  items: CardDetailItem[];
}
