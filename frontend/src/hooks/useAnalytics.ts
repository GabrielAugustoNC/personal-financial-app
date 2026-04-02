import { useCallback, useEffect, useState } from 'react';
import type { AsyncState } from '@/types';
import type { AnalyticsOverview } from '@/types/analytics';
import { analyticsService } from '@/services/analyticsService';

interface UseAnalyticsReturn {
  overview : AsyncState<AnalyticsOverview>;
  refetch  : () => Promise<void>;
}

export function useAnalytics(): UseAnalyticsReturn {
  const [overview, setOverview] = useState<AsyncState<AnalyticsOverview>>({
    data: null, status: 'idle', error: null,
  });

  const fetch = useCallback(async () => {
    setOverview(prev => ({ ...prev, status: 'loading', error: null }));
    try {
      const data = await analyticsService.getOverview();
      setOverview({ data, status: 'success', error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar analytics';
      setOverview({ data: null, status: 'error', error: message });
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { overview, refetch: fetch };
}
