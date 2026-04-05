// ============================================================
// AnalyticsService — camada de acesso à API de analytics.
// Encapsula a chamada ao endpoint /analytics/overview.
// O parâmetro months controla o horizonte temporal das aggregations no backend.
// Analogia Angular: @Injectable({ providedIn: 'root' }) AnalyticsService
// ============================================================

import type { AnalyticsOverview } from '@/types/analytics';
import type { ApiResponse } from '@/types';
import apiClient from './api';

class AnalyticsService {
  // Prefixo base das rotas de analytics
  private readonly endpoint = '/analytics';

  // Busca o overview completo de analytics do backend.
  // O parâmetro months define quantos meses de histórico considerar nos cálculos.
  // Padrão de 4 meses: 3 completos anteriores + mês atual em andamento.
  // Lança erro se a resposta não contiver dados — garante tipagem não-nula no retorno.
  async getOverview(months: number = 4): Promise<AnalyticsOverview> {
    const response = await apiClient.get<ApiResponse<AnalyticsOverview>>(
      `${this.endpoint}/overview`,
      { params: { months } }
    );

    if (!response.data.data) {
      throw new Error('Dados analíticos indisponíveis');
    }

    return response.data.data;
  }
}

// Exporta instância singleton — padrão equivalente ao providedIn: 'root' do Angular
export const analyticsService = new AnalyticsService();
