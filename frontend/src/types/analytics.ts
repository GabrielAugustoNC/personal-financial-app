// ============================================================
// Tipos de analytics — espelham exatamente as structs Go do backend.
// Usados pelo analyticsService, useAnalytics e AnalyticsDashboard.
// ============================================================

import type { TransactionType } from './index';

// TransactionComparison compara uma transação de mesmo título
// entre o mês atual e o mês anterior.
// Inclui a variação absoluta, percentual e a tendência calculada.
export interface TransactionComparison {
  title         : string;          // Nome da transação comparada
  type          : TransactionType; // Tipo: income ou expense
  category      : string;          // Categoria da transação
  current_month : number;          // Total no mês atual
  last_month    : number;          // Total no mês anterior
  diff          : number;          // Diferença absoluta (atual - anterior)
  diff_pct      : number;          // Variação percentual em relação ao mês anterior
  trend         : 'up' | 'down' | 'stable'; // Direção da variação
}

// CategoryBreakdown representa o total de despesas de uma categoria no mês atual.
// Usado para compor o gráfico de donut de distribuição de despesas.
export interface CategoryBreakdown {
  category   : string;  // Nome da categoria
  amount     : number;  // Total gasto na categoria
  percentage : number;  // Percentual sobre o total de despesas do mês
  count      : number;  // Quantidade de transações na categoria
}

// MonthlyEvolution representa receitas, despesas e saldo de um mês específico.
// Usado nos gráficos de barras (evolução) e de linha (saldo mês a mês).
export interface MonthlyEvolution {
  month    : string;  // Abreviação do mês ("Jan", "Feb", etc.)
  year     : number;  // Ano do período
  income   : number;  // Total de receitas do mês
  expenses : number;  // Total de despesas do mês
  balance  : number;  // Saldo líquido do mês (income - expenses)
}

// BalanceProjection estima o saldo do próximo mês com base
// na média dos últimos N meses completos de receitas e despesas.
// Inclui a tendência em relação ao mês atual para sinalizar melhora ou piora.
export interface BalanceProjection {
  estimated_income   : number;  // Receita estimada para o próximo mês
  estimated_expenses : number;  // Despesa estimada para o próximo mês
  estimated_balance  : number;  // Saldo estimado (income - expenses)
  avg_income_3m      : number;  // Média de receitas dos últimos N meses
  avg_expenses_3m    : number;  // Média de despesas dos últimos N meses
  trend              : 'positive' | 'negative' | 'neutral'; // Direção da projeção
  trend_pct          : number;  // Variação percentual vs mês atual
}

// AttentionPoint representa uma despesa que merece atenção especial —
// seja pelo valor absoluto alto ou pelo crescimento em relação ao mês anterior.
// Classificada em três níveis de prioridade: critical, high ou medium.
export interface AttentionPoint {
  title    : string;  // Nome da transação
  category : string;  // Categoria da despesa
  amount   : number;  // Valor no mês atual
  change   : number;  // Variação percentual vs mês anterior (0 se sem histórico)
  level    : 'critical' | 'high' | 'medium'; // Nível de atenção calculado pelo backend
}

// AnalyticsOverview agrega todos os dados analíticos em uma única resposta.
// O backend retorna tudo em uma chamada para minimizar latência de rede.
// Analogia .NET: ViewModel composto com múltiplos DTOs aninhados
export interface AnalyticsOverview {
  month_comparison   : TransactionComparison[]; // Comparativo vs mês anterior por transação
  category_breakdown : CategoryBreakdown[];     // Distribuição de despesas por categoria
  monthly_evolution  : MonthlyEvolution[];      // Histórico mensal de receitas e despesas
  projection         : BalanceProjection;       // Projeção financeira do próximo mês
  attention_points   : AttentionPoint[];        // Despesas que merecem atenção prioritária
}
