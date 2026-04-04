// ============================================================
// TransactionService — camada de acesso à API de transações.
// Encapsula todas as chamadas HTTP relacionadas ao recurso /transactions.
// Implementado como classe com instância singleton para consistência com o padrão Angular.
// Analogia Angular: @Injectable({ providedIn: 'root' }) TransactionService
// ============================================================

import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilter,
  TransactionSummary,
  ApiResponse,
  ImportTransactionItem,
  BulkImportResponse,
} from '@/types';
import apiClient from './api';

class TransactionService {
  // Prefixo base de todas as rotas de transação
  private readonly endpoint = '/transactions';

  // Busca a lista de transações com filtros opcionais de tipo, categoria, título e período.
  // Os filtros são enviados como query string pelo Axios via params.
  // Analogia Angular: http.get<ApiResponse<Transaction[]>>(url, { params })
  async getAll(filter?: TransactionFilter): Promise<Transaction[]> {
    const response = await apiClient.get<ApiResponse<Transaction[]>>(
      this.endpoint,
      { params: filter }
    );
    return response.data.data ?? [];
  }

  // Busca o resumo financeiro agregado (total de receitas, despesas e saldo).
  // Calculado via aggregation pipeline no MongoDB — endpoint dedicado.
  async getSummary(): Promise<TransactionSummary> {
    const response = await apiClient.get<ApiResponse<TransactionSummary>>(
      `${this.endpoint}/summary`
    );

    if (!response.data.data) {
      throw new Error('Resumo não disponível');
    }

    return response.data.data;
  }

  // Busca uma única transação pelo seu ID.
  // Lança erro se a API retornar dados nulos (não encontrado).
  async getById(id: string): Promise<Transaction> {
    const response = await apiClient.get<ApiResponse<Transaction>>(
      `${this.endpoint}/${id}`
    );

    if (!response.data.data) {
      throw new Error('Transação não encontrada');
    }

    return response.data.data;
  }

  // Busca as transações do mês anterior para uso como sugestões no formulário.
  // Calcula automaticamente as datas de início e fim do mês anterior.
  async getLastMonth(): Promise<Transaction[]> {
    const now                = new Date();
    const firstDayLastMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0);

    // Formata datas no padrão YYYY-MM-DD esperado pelo backend
    const fmt = (d: Date) => d.toISOString().substring(0, 10);

    const response = await apiClient.get<ApiResponse<Transaction[]>>(this.endpoint, {
      params: {
        start_date: fmt(firstDayLastMonth),
        end_date  : fmt(lastDayLastMonth),
      },
    });
    return response.data.data ?? [];
  }

  // Cria uma nova transação enviando o DTO de entrada no corpo da requisição.
  // Retorna a transação criada com o ID gerado pelo MongoDB.
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

  // Atualiza os campos enviados de uma transação existente (PATCH semantics).
  // Apenas os campos presentes no input serão modificados no banco.
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

  // Remove uma transação pelo ID. Não retorna dados — apenas confirma o sucesso.
  async delete(id: string): Promise<void> {
    await apiClient.delete(`${this.endpoint}/${id}`);
  }

  // Importa uma lista de transações em massa via InsertMany no backend.
  // Aceita o formato de data como string plana ou MongoDB Extended JSON.
  // Retorna o resumo da operação com total enviado e total importado.
  async bulkImport(items: ImportTransactionItem[]): Promise<BulkImportResponse> {
    const response = await apiClient.post<BulkImportResponse>(
      `${this.endpoint}/bulk-import`,
      items
    );
    return response.data;
  }
}

// Exporta uma instância singleton — padrão equivalente ao providedIn: 'root' do Angular
export const transactionService = new TransactionService();
