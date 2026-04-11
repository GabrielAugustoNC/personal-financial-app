// ============================================================
// Tipos de domínio para metas financeiras por categoria.
// ============================================================

// Goal representa uma meta de gasto mensal para uma categoria.
export interface Goal {
  id          : string;
  category    : string;
  limit_amount: number;
  created_at  : string;
  updated_at  : string;
}

// GoalProgress enriquece a meta com o progresso do mês atual.
// status: "ok" (< 80%), "warning" (80–99%), "exceeded" (≥ 100%)
export interface GoalProgress extends Goal {
  spent_amount: number;
  percentage  : number;
  remaining   : number;
  status      : 'ok' | 'warning' | 'exceeded';
}

// UpsertGoalInput é o DTO de entrada para criar ou atualizar uma meta.
export interface UpsertGoalInput {
  category    : string;
  limit_amount: number;
}
