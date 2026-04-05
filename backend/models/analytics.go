// Pacote models — structs de analytics retornados pelo endpoint /api/analytics/overview.
// Cada struct espelha uma dimensão de análise financeira calculada pelo repositório.
// Todos os campos têm tags json para serialização direta pelo handler Gin.
package models

// AnalyticsOverview agrega todas as métricas financeiras em uma única resposta.
// O handler retorna este struct completo, evitando múltiplas chamadas do frontend.
// Analogia .NET: ViewModel composto com DTOs aninhados para uma única requisição
type AnalyticsOverview struct {
	MonthComparison   []TransactionComparison `json:"month_comparison"`
	CategoryBreakdown []CategoryBreakdown     `json:"category_breakdown"`
	MonthlyEvolution  []MonthlyEvolution      `json:"monthly_evolution"`
	Projection        BalanceProjection       `json:"projection"`
	AttentionPoints   []AttentionPoint        `json:"attention_points"`
}

// TransactionComparison compara o total de uma transação de mesmo título
// entre o mês atual e o mês anterior. Calculado via aggregation em dois estágios.
// Trend indica a direção: "up" (subiu >5%), "down" (caiu >5%) ou "stable".
type TransactionComparison struct {
	Title        string          `json:"title"`         // Nome da transação
	Type         TransactionType `json:"type"`          // income ou expense
	Category     string          `json:"category"`      // Categoria da transação
	CurrentMonth float64         `json:"current_month"` // Total no mês atual
	LastMonth    float64         `json:"last_month"`    // Total no mês anterior
	Diff         float64         `json:"diff"`          // Diferença absoluta (atual - anterior)
	DiffPct      float64         `json:"diff_pct"`      // Variação percentual
	Trend        string          `json:"trend"`         // "up", "down" ou "stable"
}

// CategoryBreakdown representa o total de despesas de uma categoria no mês atual.
// Percentual calculado em relação ao total de despesas do período.
// Ordenado por amount decrescente para destacar os maiores gastos.
type CategoryBreakdown struct {
	Category   string  `json:"category"`   // Nome da categoria
	Amount     float64 `json:"amount"`     // Total gasto na categoria
	Percentage float64 `json:"percentage"` // Percentual sobre o total de despesas
	Count      int     `json:"count"`      // Quantidade de transações na categoria
}

// MonthlyEvolution representa as receitas, despesas e saldo de um mês específico.
// Usado nos gráficos de barras (evolução) e de linha (saldo mês a mês) do Analytics.
// Balance é calculado no repositório como income - expenses.
type MonthlyEvolution struct {
	Month    string  `json:"month"`    // Abreviação do mês em inglês ("Jan", "Feb", etc.)
	Year     int     `json:"year"`     // Ano do período
	Income   float64 `json:"income"`   // Total de receitas do mês
	Expenses float64 `json:"expenses"` // Total de despesas do mês
	Balance  float64 `json:"balance"`  // Saldo líquido (income - expenses)
}

// BalanceProjection estima o saldo do próximo mês com base na média
// dos últimos N meses completos (excluindo o mês atual em andamento).
// TrendPct indica a variação percentual estimada em relação ao mês atual.
type BalanceProjection struct {
	EstimatedIncome   float64 `json:"estimated_income"`   // Receita estimada
	EstimatedExpenses float64 `json:"estimated_expenses"` // Despesa estimada
	EstimatedBalance  float64 `json:"estimated_balance"`  // Saldo estimado
	AvgIncome3m       float64 `json:"avg_income_3m"`      // Média histórica de receitas
	AvgExpenses3m     float64 `json:"avg_expenses_3m"`    // Média histórica de despesas
	Trend             string  `json:"trend"`              // "positive", "negative" ou "neutral"
	TrendPct          float64 `json:"trend_pct"`          // Variação % vs mês atual
}

// AttentionPoint sinaliza uma despesa de destaque — pelo valor alto ou pelo
// crescimento expressivo em relação ao mês anterior.
// Level é calculado pelo repositório com base em thresholds predefinidos.
type AttentionPoint struct {
	Title    string  `json:"title"`    // Nome da transação
	Category string  `json:"category"` // Categoria da despesa
	Amount   float64 `json:"amount"`   // Valor no mês atual
	Change   float64 `json:"change"`   // Variação % vs mês anterior (0 se sem histórico)
	Level    string  `json:"level"`    // "critical", "high" ou "medium"
}
