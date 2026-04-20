package services

import (
	"context"
	"log"
	"time"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RecurringService verifica e lança automaticamente transações recorrentes vencidas.
// Chamado no startup da aplicação e pode ser chamado via endpoint manual.
// Analogia .NET: IHostedService com execução periódica ou BackgroundService.
type RecurringService struct {
	repository interfaces.TransactionRepository
}

// NewRecurringService cria o serviço de recorrências.
func NewRecurringService(repo interfaces.TransactionRepository) *RecurringService {
	return &RecurringService{repository: repo}
}

// ProcessDue busca todas as transações recorrentes com NextDueDate vencida (≤ hoje)
// e cria um novo lançamento para cada uma, avançando a data para o próximo ciclo.
// Retorna a quantidade de transações criadas automaticamente.
func (s *RecurringService) ProcessDue(ctx context.Context) (int, error) {
	now := time.Now()

	// Busca transações recorrentes com data de vencimento no passado ou hoje
	filter := bson.M{
		"recurring": true,
		"next_due_date": bson.M{"$lte": now},
	}

	due, err := s.repository.FindAll(ctx, filter)
	if err != nil {
		return 0, err
	}

	created := 0

	for _, t := range due {
		if t.NextDueDate == nil {
			continue
		}

		// Cria o novo lançamento com a data de vencimento
		newTx := &models.Transaction{
			ID:          primitive.NewObjectID(),
			Title:       t.Title,
			Amount:      t.Amount,
			Type:        t.Type,
			Category:    t.Category,
			Description: t.Description,
			Date:        *t.NextDueDate,
			Recurring:   true,
			Frequency:   t.Frequency,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		// Calcula a próxima data de vencimento baseado na frequência
		nextDue := calculateNextDue(*t.NextDueDate, t.Frequency)
		newTx.NextDueDate = &nextDue

		// Persiste o novo lançamento
		if _, err := s.repository.Create(ctx, newTx); err != nil {
			log.Printf("⚠️ Erro ao criar recorrência de '%s': %v", t.Title, err)
			continue
		}

		// Atualiza a data de vencimento da transação original
		update := bson.M{"next_due_date": nextDue}
		if _, err := s.repository.Update(ctx, t.ID, update); err != nil {
			log.Printf("⚠️ Erro ao atualizar next_due_date de '%s': %v", t.Title, err)
		}

		created++
	}

	if created > 0 {
		log.Printf("✅ Recorrências processadas: %d transações criadas automaticamente", created)
	}

	return created, nil
}

// calculateNextDue calcula a data do próximo lançamento baseado na frequência.
// Usa a lógica de data do Go — meses com durações variáveis são tratados corretamente.
func calculateNextDue(current time.Time, frequency models.RecurringFrequency) time.Time {
	switch frequency {
	case models.FrequencyWeekly:
		return current.AddDate(0, 0, 7)
	case models.FrequencyMonthly:
		return current.AddDate(0, 1, 0)
	case models.FrequencyYearly:
		return current.AddDate(1, 0, 0)
	default:
		return current.AddDate(0, 1, 0) // mensal como padrão
	}
}
