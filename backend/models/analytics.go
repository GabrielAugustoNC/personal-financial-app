package models

// AnalyticsOverview é o DTO principal retornado pelo endpoint de analytics.
// Agrega todas as métricas em uma única chamada para minimizar round-trips.
// Analogia .NET: ViewModel composto com múltiplos DTOs aninhados
type AnalyticsOverview struct {
	MonthComparison   []TransactionComparison `json:"month_comparison"`
	CategoryBreakdown []CategoryBreakdown     `json:"category_breakdown"`
	MonthlyEvolution  []MonthlyEvolution      `json:"monthly_evolution"`
	Projection        BalanceProjection       `json:"projection"`
	AttentionPoints   []AttentionPoint        `json:"attention_points"`
}

// TransactionComparison compara uma transação de mesmo título entre o mês
// atual e o mês anterior. Usado para mostrar se o gasto aumentou ou diminuiu.
type TransactionComparison struct {
	Title        string          `json:"title"`
	Type         TransactionType `json:"type"`
	Category     string          `json:"category"`
	CurrentMonth float64         `json:"current_month"`
	LastMonth    float64         `json:"last_month"`
	Diff         float64         `json:"diff"`          // valor absoluto da diferença
	DiffPct      float64         `json:"diff_pct"`      // percentual de variação
	Trend        string          `json:"trend"`         // "up", "down", "stable"
}

// CategoryBreakdown representa o total de despesas por categoria no mês atual.
type CategoryBreakdown struct {
	Category   string  `json:"category"`
	Amount     float64 `json:"amount"`
	Percentage float64 `json:"percentage"` // % sobre o total de despesas
	Count      int     `json:"count"`
}

// MonthlyEvolution representa receitas e despesas de um mês específico.
// Usado para o gráfico de barras dos últimos 4 meses.
type MonthlyEvolution struct {
	Month    string  `json:"month"`    // "Jan", "Fev", etc.
	Year     int     `json:"year"`
	Income   float64 `json:"income"`
	Expenses float64 `json:"expenses"`
	Balance  float64 `json:"balance"`
}

// BalanceProjection estima o saldo do próximo mês com base na
// média dos últimos 3 meses de receitas e despesas.
type BalanceProjection struct {
	EstimatedIncome   float64 `json:"estimated_income"`
	EstimatedExpenses float64 `json:"estimated_expenses"`
	EstimatedBalance  float64 `json:"estimated_balance"`
	AvgIncome3m       float64 `json:"avg_income_3m"`
	AvgExpenses3m     float64 `json:"avg_expenses_3m"`
	Trend             string  `json:"trend"` // "positive", "negative", "neutral"
	TrendPct          float64 `json:"trend_pct"` // variação % em relação ao mês atual
}

// AttentionPoint sinaliza despesas que merecem atenção:
// as de maior valor absoluto ou com maior crescimento em relação ao mês anterior.
type AttentionPoint struct {
	Title    string  `json:"title"`
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
	Change   float64 `json:"change"`    // variação % vs mês anterior (0 se sem histórico)
	Level    string  `json:"level"`     // "critical", "high", "medium"
}
