// Interfaces de analytics — definem os contratos para cálculo de métricas financeiras.
// Todas as queries utilizam MongoDB Aggregation Pipeline para processamento no banco.
// Analogia .NET: IAnalyticsRepository e IAnalyticsService separados por responsabilidade
package interfaces

import (
	"context"

	"github.com/user/financas-api/models"
)

// AnalyticsRepository define o contrato de acesso a dados para métricas e análises.
// Cada método representa uma query de agregação específica no MongoDB.
// Analogia .NET: interface IAnalyticsRepository com métodos de leitura somente
type AnalyticsRepository interface {
	// GetMonthComparison compara transações de mesmo título entre o mês atual e o anterior
	GetMonthComparison(ctx context.Context) ([]models.TransactionComparison, error)

	// GetCategoryBreakdown retorna o total de despesas agrupado por categoria no mês atual
	GetCategoryBreakdown(ctx context.Context) ([]models.CategoryBreakdown, error)

	// GetMonthlyEvolution retorna receitas e despesas dos últimos N meses
	GetMonthlyEvolution(ctx context.Context, months int) ([]models.MonthlyEvolution, error)

	// GetTopExpenses retorna as N maiores despesas do mês atual com variação percentual
	GetTopExpenses(ctx context.Context, limit int) ([]models.AttentionPoint, error)
}

// AnalyticsService define o contrato da camada de negócio para análises financeiras.
// Orquestra múltiplas queries e calcula a projeção de saldo para o próximo mês.
// Analogia .NET: interface IAnalyticsService com método de agregação de dados
type AnalyticsService interface {
	// GetOverview agrega todas as métricas em uma única resposta.
	// O parâmetro months controla o horizonte temporal dos gráficos (1 a 12 meses).
	GetOverview(ctx context.Context, months int) (*models.AnalyticsOverview, error)
}
