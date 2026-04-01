// ============================================================
// TransactionService — camada de acesso à API de transações
// Analogia Angular: @Injectable() TransactionService
// ============================================================

import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilter,
  ImportTransactionItem,
  BulkImportResponse,
  TransactionSummary,
  ApiResponse,
} from '@/types';
import apiClient from './api';

class TransactionService {
  private readonly endpoint = '/transactions';

  async getAll(filter?: TransactionFilter): Promise<Transaction[]> {
    const response = await apiClient.get<ApiResponse<Transaction[]>>(
      this.endpoint,
      { params: filter }
    );
    return response.data.data ?? [];
  }

  async getSummary(): Promise<TransactionSummary> {
    const response = await apiClient.get<ApiResponse<TransactionSummary>>(
      `${this.endpoint}/summary`
    );

    if (!response.data.data) {
      throw new Error('Resumo não disponível');
    }

    return response.data.data;
  }

  async getById(id: string): Promise<Transaction> {
    const response = await apiClient.get<ApiResponse<Transaction>>(
      `${this.endpoint}/${id}`
    );

    if (!response.data.data) {
      throw new Error('Transação não encontrada');
    }

    return response.data.data;
  }

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const response = await apiClient.post<ApiResponse<Transaction>>(
      this.endpoint,
      input
    );

    if (!response.data.data) {
      throw new Error('Erro ao criar transação');
    }

    return response.data.data;
  }

  async update(id: string, input: UpdateTransactionInput): Promise<Transaction> {
    const response = await apiClient.put<ApiResponse<Transaction>>(
      `${this.endpoint}/${id}`,
      input
    );

    if (!response.data.data) {
      throw new Error('Erro ao atualizar transação');
    }

    return response.data.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${this.endpoint}/${id}`);
  }

  async bulkImport(items: ImportTransactionItem[]): Promise<BulkImportResponse> {
    const response = await apiClient.post<BulkImportResponse>(
      `${this.endpoint}/bulk-import`,
      items
    );

    if (!response.data) {
      throw new Error('Erro ao importar transações em lote');
    }

    return response.data;
  }

}

// Exporta uma instância singleton — mesmo padrão do Angular providedIn: 'root'
export const transactionService = new TransactionService();
