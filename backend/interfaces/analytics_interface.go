package interfaces

import (
	"context"

	"github.com/user/financas-api/models"
)

// AnalyticsRepository define o contrato de acesso a dados para analytics.
// Todas as queries usam MongoDB aggregation pipeline.
// Analogia .NET: interface IAnalyticsRepository
type AnalyticsRepository interface {
	GetMonthComparison(ctx context.Context) ([]models.TransactionComparison, error)
	GetCategoryBreakdown(ctx context.Context) ([]models.CategoryBreakdown, error)
	GetMonthlyEvolution(ctx context.Context, months int) ([]models.MonthlyEvolution, error)
	GetTopExpenses(ctx context.Context, limit int) ([]models.AttentionPoint, error)
}

// AnalyticsService define o contrato da camada de negócio para analytics.
// Analogia .NET: interface IAnalyticsService
type AnalyticsService interface {
	GetOverview(ctx context.Context) (*models.AnalyticsOverview, error)
}
