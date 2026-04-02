package services

import (
	"context"
	"math"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
)

// AnalyticsService orquestra os dados de analytics e calcula a projeção.
// Analogia .NET: class AnalyticsService : IAnalyticsService
type AnalyticsService struct {
	repo interfaces.AnalyticsRepository
}

// NewAnalyticsService é o construtor com injeção de dependência.
func NewAnalyticsService(repo interfaces.AnalyticsRepository) interfaces.AnalyticsService {
	return &AnalyticsService{repo: repo}
}

// GetOverview agrega todas as métricas em paralelo e calcula a projeção.
// Analogia .NET: Task.WhenAll(task1, task2, task3) — aqui feito sequencialmente
// por simplicidade, mas pode ser paralelizado com goroutines se necessário.
func (s *AnalyticsService) GetOverview(ctx context.Context) (*models.AnalyticsOverview, error) {
	comparison, err := s.repo.GetMonthComparison(ctx)
	if err != nil {
		return nil, err
	}

	breakdown, err := s.repo.GetCategoryBreakdown(ctx)
	if err != nil {
		return nil, err
	}

	// 4 meses: 3 completos anteriores + mês atual (para o gráfico de evolução)
	evolution, err := s.repo.GetMonthlyEvolution(ctx, 4)
	if err != nil {
		return nil, err
	}

	attention, err := s.repo.GetTopExpenses(ctx, 6)
	if err != nil {
		return nil, err
	}

	projection := s.calculateProjection(evolution)

	return &models.AnalyticsOverview{
		MonthComparison:   comparison,
		CategoryBreakdown: breakdown,
		MonthlyEvolution:  evolution,
		Projection:        projection,
		AttentionPoints:   attention,
	}, nil
}

// calculateProjection estima o próximo mês com base na média dos 3 meses anteriores.
// Exclui o mês atual do cálculo para não distorcer a média com dados parciais.
func (s *AnalyticsService) calculateProjection(evolution []models.MonthlyEvolution) models.BalanceProjection {
	// Usa apenas os meses completos (exclui o último = mês atual)
	historicalMonths := evolution
	if len(historicalMonths) > 1 {
		historicalMonths = evolution[:len(evolution)-1]
	}

	if len(historicalMonths) == 0 {
		return models.BalanceProjection{Trend: "neutral"}
	}

	var totalIncome, totalExpenses float64
	for _, m := range historicalMonths {
		totalIncome += m.Income
		totalExpenses += m.Expenses
	}

	count := float64(len(historicalMonths))
	avgIncome := totalIncome / count
	avgExpenses := totalExpenses / count
	estimatedBalance := avgIncome - avgExpenses

	// Calcula tendência comparando a média histórica com o mês atual
	currentBalance := 0.0
	if len(evolution) > 0 {
		current := evolution[len(evolution)-1]
		currentBalance = current.Income - current.Expenses
	}

	trendPct := 0.0
	if currentBalance != 0 {
		trendPct = math.Round(((estimatedBalance-currentBalance)/math.Abs(currentBalance))*1000) / 10
	}

	trend := "neutral"
	switch {
	case estimatedBalance > 0 && trendPct >= 0:
		trend = "positive"
	case estimatedBalance < 0 || trendPct < -10:
		trend = "negative"
	}

	return models.BalanceProjection{
		EstimatedIncome:   math.Round(avgIncome*100) / 100,
		EstimatedExpenses: math.Round(avgExpenses*100) / 100,
		EstimatedBalance:  math.Round(estimatedBalance*100) / 100,
		AvgIncome3m:       math.Round(avgIncome*100) / 100,
		AvgExpenses3m:     math.Round(avgExpenses*100) / 100,
		Trend:             trend,
		TrendPct:          trendPct,
	}
}
