// GoalService — acesso à API de metas financeiras.
import type { GoalProgress, UpsertGoalInput, Goal } from '@/types/goal';
import type { ApiResponse } from '@/types';
import apiClient from './api';

class GoalService {
  private readonly endpoint = '/goals';

  // Retorna todas as metas com progresso do mês atual.
  async getAll(): Promise<GoalProgress[]> {
    const response = await apiClient.get<ApiResponse<GoalProgress[]>>(this.endpoint);
    return response.data.data ?? [];
  }

  // Cria ou atualiza a meta de uma categoria (upsert por category).
  async upsert(input: UpsertGoalInput): Promise<Goal> {
    const response = await apiClient.post<ApiResponse<Goal>>(this.endpoint, input);
    if (!response.data.data) throw new Error('Erro ao salvar meta');
    return response.data.data;
  }

  // Remove uma meta pelo ID.
  async delete(id: string): Promise<void> {
    await apiClient.delete(`${this.endpoint}/${id}`);
  }
}

export const goalService = new GoalService();
