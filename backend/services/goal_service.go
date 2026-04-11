package services

import (
	"context"
	"errors"
	"math"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// GoalService implementa interfaces.GoalService.
// Orquestra o repositório de metas e o cálculo de progresso mensal.
type GoalService struct {
	repo interfaces.GoalRepository
}

// NewGoalService cria o serviço com injeção de dependência.
func NewGoalService(repo interfaces.GoalRepository) interfaces.GoalService {
	return &GoalService{repo: repo}
}

// GetAllWithProgress retorna todas as metas enriquecidas com o progresso do mês atual.
// Busca as metas e os gastos em paralelo para calcular percentual, restante e status.
func (s *GoalService) GetAllWithProgress(ctx context.Context) ([]models.GoalProgress, error) {
	goals, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	// Busca os totais gastos por categoria no mês atual em uma única query
	spentMap, err := s.repo.GetMonthlySpentByCategory(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]models.GoalProgress, 0, len(goals))

	for _, goal := range goals {
		spent := spentMap[goal.Category] // zero se nenhum gasto no mês

		pct := 0.0
		if goal.LimitAmount > 0 {
			pct = math.Round((spent/goal.LimitAmount)*1000) / 10
		}

		remaining := math.Round((goal.LimitAmount-spent)*100) / 100
		spent     = math.Round(spent*100) / 100

		// Classifica o status baseado no percentual gasto
		status := "ok"
		switch {
		case pct >= 100:
			status = "exceeded"
		case pct >= 80:
			status = "warning"
		}

		result = append(result, models.GoalProgress{
			Goal:        goal,
			SpentAmount: spent,
			Percentage:  pct,
			Remaining:   remaining,
			Status:      status,
		})
	}

	return result, nil
}

// Upsert cria ou atualiza a meta de uma categoria.
// Busca a meta existente para preservar o ID e o CreatedAt caso já exista.
func (s *GoalService) Upsert(ctx context.Context, input *models.UpsertGoalInput) (*models.Goal, error) {
	// Tenta reutilizar a meta existente para preservar metadados
	existing, _ := s.repo.FindByCategory(ctx, input.Category)

	goal := &models.Goal{
		Category:    input.Category,
		LimitAmount: input.LimitAmount,
	}

	if existing != nil {
		goal.ID        = existing.ID
		goal.CreatedAt = existing.CreatedAt
	}

	return s.repo.Upsert(ctx, goal)
}

// Delete remove uma meta pelo ID em formato string.
func (s *GoalService) Delete(ctx context.Context, id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("ID de meta inválido")
	}
	return s.repo.Delete(ctx, objectID)
}
