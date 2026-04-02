import type { TransactionType } from './index';

export interface TransactionComparison {
  title         : string;
  type          : TransactionType;
  category      : string;
  current_month : number;
  last_month    : number;
  diff          : number;
  diff_pct      : number;
  trend         : 'up' | 'down' | 'stable';
}

export interface CategoryBreakdown {
  category   : string;
  amount     : number;
  percentage : number;
  count      : number;
}

export interface MonthlyEvolution {
  month    : string;
  year     : number;
  income   : number;
  expenses : number;
  balance  : number;
}

export interface BalanceProjection {
  estimated_income   : number;
  estimated_expenses : number;
  estimated_balance  : number;
  avg_income_3m      : number;
  avg_expenses_3m    : number;
  trend              : 'positive' | 'negative' | 'neutral';
  trend_pct          : number;
}

export interface AttentionPoint {
  title    : string;
  category : string;
  amount   : number;
  change   : number;
  level    : 'critical' | 'high' | 'medium';
}

export interface AnalyticsOverview {
  month_comparison   : TransactionComparison[];
  category_breakdown : CategoryBreakdown[];
  monthly_evolution  : MonthlyEvolution[];
  projection         : BalanceProjection;
  attention_points   : AttentionPoint[];
}
