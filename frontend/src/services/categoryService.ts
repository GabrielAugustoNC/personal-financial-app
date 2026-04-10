// ============================================================
// CategoryService — acesso à API de categorias e propagação em massa.
// CardDetailService — acesso à API de detalhes de cartão de crédito.
// ============================================================

import type {
  Category,
  CreateCategoryInput,
  BulkCategoryUpdateInput,
  BulkCategoryUpdateResult,
  CardDetail,
  ImportCardDetailInput,
} from '@/types/category';
import type { ApiResponse } from '@/types';
import apiClient from './api';

// ---- CategoryService ----

class CategoryService {
  private readonly endpoint = '/categories';

  // Busca todas as categorias, opcionalmente filtradas por tipo.
  async getAll(type?: 'income' | 'expense'): Promise<Category[]> {
    const response = await apiClient.get<ApiResponse<Category[]>>(
      this.endpoint,
      { params: type ? { type } : undefined }
    );
    return response.data.data ?? [];
  }

  // Cria uma nova categoria personalizada.
  async create(input: CreateCategoryInput): Promise<Category> {
    const response = await apiClient.post<ApiResponse<Category>>(this.endpoint, input);
    if (!response.data.data) throw new Error('Erro ao criar categoria');
    return response.data.data;
  }

  // Remove uma categoria pelo ID.
  async delete(id: string): Promise<void> {
    await apiClient.delete(`${this.endpoint}/${id}`);
  }

  // Propaga uma nova categoria para todas as transações com título ≥50% similar.
  // Chamado automaticamente após edição inline de categoria na lista de transações.
  async bulkUpdate(input: BulkCategoryUpdateInput): Promise<BulkCategoryUpdateResult> {
    const response = await apiClient.post<BulkCategoryUpdateResult>(
      `${this.endpoint}/bulk-update`,
      input
    );
    return response.data;
  }
}

export const categoryService = new CategoryService();

// ---- CardDetailService ----

class CardDetailService {
  private readonly endpoint = '/transactions';

  // Busca os detalhes de subcategorização de uma fatura de cartão.
  // Retorna null quando nenhum detalhe foi importado ainda.
  async getByTransaction(transactionId: string): Promise<CardDetail | null> {
    const response = await apiClient.get<ApiResponse<CardDetail>>(
      `${this.endpoint}/${transactionId}/card-details`
    );
    return response.data.data ?? null;
  }

  // Importa os itens de detalhe de uma fatura.
  // O backend valida que a soma não ultrapassa o valor da fatura
  // e registra automaticamente o restante como "Outros".
  async import(transactionId: string, input: ImportCardDetailInput): Promise<CardDetail> {
    const response = await apiClient.post<ApiResponse<CardDetail>>(
      `${this.endpoint}/${transactionId}/card-details`,
      input
    );
    if (!response.data.data) throw new Error('Erro ao importar detalhes');
    return response.data.data;
  }
}

export const cardDetailService = new CardDetailService();
