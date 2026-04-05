// Serviço de analytics — orquestra as queries do repositório e calcula a projeção.
// O serviço executa as queries sequencialmente e compõe o AnalyticsOverview final.
// A projeção é calculada em memória a partir dos dados de evolução mensal.
// Analogia .NET: classe AnalyticsService : IAnalyticsService
package services

import (
	"context"
	"math"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
)

// AnalyticsService implementa interfaces.AnalyticsService.
// Orquestra múltiplas queries do repositório e aplica cálculos de projeção.
// Analogia .NET: class AnalyticsService : IAnalyticsService com injeção de IAnalyticsRepository
type AnalyticsService struct {
	repo interfaces.AnalyticsRepository
}

// NewAnalyticsService cria uma instância do serviço com injeção de dependência.
// Retorna a interface para manter o baixo acoplamento entre camadas.
func NewAnalyticsService(repo interfaces.AnalyticsRepository) interfaces.AnalyticsService {
	return &AnalyticsService{repo: repo}
}

// GetOverview executa todas as queries analíticas e retorna o overview completo.
// O parâmetro months controla o horizonte temporal dos gráficos (1 a 12 meses).
// A projeção é calculada localmente com base nos dados de evolução mensal.
// Analogia .NET: método de serviço compondo múltiplos repositórios e retornando ViewModel
func (s *AnalyticsService) GetOverview(ctx context.Context, months int) (*models.AnalyticsOverview, error) {
	// Busca o comparativo de transações entre o mês atual e o anterior
	comparison, err := s.repo.GetMonthComparison(ctx)
	if err != nil {
		return nil, err
	}

	// Busca a distribuição de despesas por categoria no mês atual
	breakdown, err := s.repo.GetCategoryBreakdown(ctx)
	if err != nil {
		return nil, err
	}

	// Busca o histórico mensal com o número de meses solicitado pelo frontend
	evolution, err := s.repo.GetMonthlyEvolution(ctx, months)
	if err != nil {
		return nil, err
	}

	// Busca as 6 despesas de maior atenção (por valor ou crescimento)
	attention, err := s.repo.GetTopExpenses(ctx, 6)
	if err != nil {
		return nil, err
	}

	// Calcula a projeção do próximo mês em memória (sem acesso ao banco)
	projection := s.calculateProjection(evolution)

	return &models.AnalyticsOverview{
		MonthComparison:   comparison,
		CategoryBreakdown: breakdown,
		MonthlyEvolution:  evolution,
		Projection:        projection,
		AttentionPoints:   attention,
	}, nil
}

// calculateProjection estima o saldo do próximo mês com base na média histórica.
// Exclui o mês atual dos cálculos pois ele está incompleto (mês em andamento).
// A tendência compara a projeção com o saldo atual: positiva, negativa ou neutra.
// Analogia .NET: método privado com cálculos estatísticos simples sem acesso ao banco
func (s *AnalyticsService) calculateProjection(evolution []models.MonthlyEvolution) models.BalanceProjection {
	// Usa apenas os meses completos — exclui o último (mês atual) dos cálculos
	historicalMonths := evolution
	if len(historicalMonths) > 1 {
		historicalMonths = evolution[:len(evolution)-1]
	}

	// Retorna projeção neutra se não há histórico suficiente
	if len(historicalMonths) == 0 {
		return models.BalanceProjection{Trend: "neutral"}
	}

	// Soma receitas e despesas de todos os meses históricos
	var totalIncome, totalExpenses float64
	for _, m := range historicalMonths {
		totalIncome += m.Income
		totalExpenses += m.Expenses
	}

	// Calcula as médias dividindo pelo número de meses históricos
	count            := float64(len(historicalMonths))
	avgIncome        := totalIncome / count
	avgExpenses      := totalExpenses / count
	estimatedBalance := avgIncome - avgExpenses

	// Calcula a variação percentual em relação ao saldo do mês atual
	currentBalance := 0.0
	if len(evolution) > 0 {
		current        := evolution[len(evolution)-1]
		currentBalance  = current.Income - current.Expenses
	}

	trendPct := 0.0
	if currentBalance != 0 {
		trendPct = math.Round(((estimatedBalance-currentBalance)/math.Abs(currentBalance))*1000) / 10
	}

	// Classifica a tendência com base no saldo estimado e na variação percentual
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
