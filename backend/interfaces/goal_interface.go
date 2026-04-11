package interfaces

import (
	"context"

	"github.com/user/financas-api/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// GoalRepository define o contrato de acesso à collection "goals".
// Uma meta por categoria — upsert garante unicidade.
type GoalRepository interface {
	FindAll(ctx context.Context) ([]models.Goal, error)
	FindByCategory(ctx context.Context, category string) (*models.Goal, error)
	Upsert(ctx context.Context, goal *models.Goal) (*models.Goal, error)
	Delete(ctx context.Context, id primitive.ObjectID) error
	// GetMonthlySpentByCategory retorna mapa category → total gasto no mês atual
	GetMonthlySpentByCategory(ctx context.Context) (map[string]float64, error)
}

// GoalService define o contrato da camada de negócio para metas financeiras.
type GoalService interface {
	// GetAllWithProgress retorna metas enriquecidas com progresso do mês atual
	GetAllWithProgress(ctx context.Context) ([]models.GoalProgress, error)
	Upsert(ctx context.Context, input *models.UpsertGoalInput) (*models.Goal, error)
	Delete(ctx context.Context, id string) error
}
