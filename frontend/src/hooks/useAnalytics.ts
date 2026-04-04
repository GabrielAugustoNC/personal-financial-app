// ============================================================
// useAnalytics — hook customizado para gerenciamento de dados analíticos.
// Carrega o overview completo de analytics do backend e reage a mudanças de período.
// O período selecionado é enviado como parâmetro para o backend controlar o horizonte temporal.
// Analogia Angular: AnalyticsFacadeService com BehaviorSubject e combineLatest
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import type { AsyncState } from '@/types';
import type { AnalyticsOverview } from '@/types/analytics';
import type { Period } from '@/types/wallet';
import { PERIOD_OPTIONS } from '@/types/wallet';
import { analyticsService } from '@/services/analyticsService';

// Define o contrato de retorno do hook para os componentes consumidores
interface UseAnalyticsReturn {
  overview  : AsyncState<AnalyticsOverview>; // Dados de analytics com estado de carregamento
  period    : Period;                        // Período de visualização selecionado
  setPeriod : (p: Period) => void;           // Atualiza o período e recarrega os dados
  refetch   : () => Promise<void>;           // Força recarregamento manual
}

// useAnalytics gerencia o estado completo da tela de analytics.
// Ao mudar o período, recalcula o número de meses e dispara nova requisição ao backend.
// Isso permite que os gráficos se adaptem ao horizonte temporal selecionado.
export function useAnalytics(): UseAnalyticsReturn {
  const [period, setPeriod] = useState<Period>('1m');
  const [overview, setOverview] = useState<AsyncState<AnalyticsOverview>>({
    data: null, status: 'idle', error: null,
  });

  // Carrega os dados de analytics do backend.
  // Converte o período selecionado (1w/1m/1y) em número de meses para a API.
  // O backend usa o parâmetro months para calcular aggregations com o horizonte correto.
  const fetchOverview = useCallback(async () => {
    setOverview(prev => ({ ...prev, status: 'loading', error: null }));

    // Busca a configuração do período atual para obter o número de meses equivalente
    const months = PERIOD_OPTIONS.find(o => o.value === period)?.months ?? 4;

    try {
      const data = await analyticsService.getOverview(months);
      setOverview({ data, status: 'success', error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar analytics';
      setOverview({ data: null, status: 'error', error: message });
    }
  }, [period]); // Reexecuta automaticamente quando o período muda

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  return { overview, period, setPeriod, refetch: fetchOverview };
}
