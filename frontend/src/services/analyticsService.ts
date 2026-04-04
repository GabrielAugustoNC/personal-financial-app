import type { AnalyticsOverview } from '@/types/analytics';
import type { ApiResponse } from '@/types';
import apiClient from './api';

class AnalyticsService {
  private readonly endpoint = '/analytics';

  async getOverview(months: number = 4): Promise<AnalyticsOverview> {
    const response = await apiClient.get<ApiResponse<AnalyticsOverview>>(
      `${this.endpoint}/overview`,
      { params: { months } }
    );
    if (!response.data.data) throw new Error('Dados analíticos indisponíveis');
    return response.data.data;
  }
}

export const analyticsService = new AnalyticsService();
