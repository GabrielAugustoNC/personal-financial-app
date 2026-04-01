package services

import (
	"context"
	"errors"
	"time"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TransactionService contém as regras de negócio para transações.
// Analogia .NET: class TransactionService : ITransactionService
type TransactionService struct {
	repository interfaces.TransactionRepository
}

// NewTransactionService é o construtor com injeção de dependência.
// Analogia .NET: construtor com ITransactionRepository via DI
func NewTransactionService(repo interfaces.TransactionRepository) interfaces.TransactionService {
	return &TransactionService{repository: repo}
}

// GetAll aplica os filtros e delega a busca ao repositório.
func (s *TransactionService) GetAll(ctx context.Context, filter *models.TransactionFilter) ([]models.Transaction, error) {
	mongoFilter := bson.M{}

	if filter == nil {
		return s.repository.FindAll(ctx, mongoFilter)
	}

	if filter.Type != "" {
		mongoFilter["type"] = filter.Type
	}

	if filter.Category != "" {
		mongoFilter["category"] = filter.Category
	}

	// Busca parcial por título usando regex (case-insensitive)
	// Analogia .NET: .Where(t => t.Title.Contains(filter.Title, StringComparison.OrdinalIgnoreCase))
	if filter.Title != "" {
		mongoFilter["title"] = bson.M{
			"$regex":   filter.Title,
			"$options": "i",
		}
	}

	// Busca por título com regex case-insensitive
	// Analogia .NET: .Where(t => t.Title.Contains(filter.Title))
	if filter.Title != "" {
		mongoFilter["title"] = bson.M{
			"$regex":   filter.Title,
			"$options": "i",
		}
	}

	// Filtro de intervalo de datas
	if !filter.StartDate.IsZero() || !filter.EndDate.IsZero() {
		dateFilter := bson.M{}
		if !filter.StartDate.IsZero() {
			dateFilter["$gte"] = filter.StartDate
		}
		if !filter.EndDate.IsZero() {
			dateFilter["$lte"] = filter.EndDate
		}
		mongoFilter["date"] = dateFilter
	}

	return s.repository.FindAll(ctx, mongoFilter)
}

// GetByID valida o ID e busca a transação.
func (s *TransactionService) GetByID(ctx context.Context, id string) (*models.Transaction, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, errors.New("ID inválido")
	}

	transaction, err := s.repository.FindByID(ctx, objectID)
	if err != nil {
		return nil, err
	}

	if transaction == nil {
		return nil, errors.New("transação não encontrada")
	}

	return transaction, nil
}

// Create mapeia o DTO de entrada para a entidade e persiste.
// Analogia .NET: _mapper.Map<Transaction>(input) + _repository.Add(entity)
func (s *TransactionService) Create(ctx context.Context, input *models.CreateTransactionInput) (*models.Transaction, error) {
	transaction := &models.Transaction{
		Title:       input.Title,
		Amount:      input.Amount,
		Type:        input.Type,
		Category:    input.Category,
		Description: input.Description,
		Date:        input.Date,
	}

	return s.repository.Create(ctx, transaction)
}

// Update faz patch parcial — só atualiza os campos enviados.
func (s *TransactionService) Update(ctx context.Context, id string, input *models.UpdateTransactionInput) (*models.Transaction, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, errors.New("ID inválido")
	}

	// Constrói o mapa de atualização apenas com campos preenchidos
	update := bson.M{"updated_at": time.Now()}

	if input.Title != "" {
		update["title"] = input.Title
	}
	if input.Amount > 0 {
		update["amount"] = input.Amount
	}
	if input.Type != "" {
		update["type"] = input.Type
	}
	if input.Category != "" {
		update["category"] = input.Category
	}
	if input.Description != "" {
		update["description"] = input.Description
	}
	if !input.Date.IsZero() {
		update["date"] = input.Date
	}

	return s.repository.Update(ctx, objectID, update)
}

// Delete valida o ID e remove a transação.
func (s *TransactionService) Delete(ctx context.Context, id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("ID inválido")
	}

	return s.repository.Delete(ctx, objectID)
}

// GetSummary delega o cálculo ao repositório (feito via aggregation no MongoDB).
func (s *TransactionService) GetSummary(ctx context.Context) (*models.TransactionSummary, error) {
	return s.repository.GetSummary(ctx)
}

// BulkImport valida e importa uma lista de transações do arquivo JSON.
// Processa item a item para capturar erros individuais sem abortar o lote.
// Analogia .NET: método de serviço com validação por item + transação
func (s *TransactionService) BulkImport(ctx context.Context, items []models.ImportTransactionItem) (int, error) {
	if len(items) == 0 {
		return 0, errors.New("nenhum item para importar")
	}

	transactions := make([]models.Transaction, 0, len(items))
	now := time.Now()

	for _, item := range items {
		// Valida campos obrigatórios
		if item.Title == "" || item.Amount <= 0 || item.Type == "" || item.Category == "" {
			continue // Pula itens inválidos silenciosamente
		}

		// Tenta os formatos de data mais comuns: RFC3339 completo, só data (YYYY-MM-DD)
		// e formato com milissegundos. Cai para "agora" se nenhum funcionar.
		parsedDate := now
		for _, layout := range []string{time.RFC3339, time.RFC3339Nano, "2006-01-02"} {
			if t, err := time.Parse(layout, item.Date.Value); err == nil {
				parsedDate = t
				break
			}
		}

		transactions = append(transactions, models.Transaction{
			ID:          primitive.NewObjectID(),
			Title:       item.Title,
			Amount:      item.Amount,
			Type:        item.Type,
			Category:    item.Category,
			Description: item.Description,
			Date:        parsedDate,
			CreatedAt:   now,
			UpdatedAt:   now,
		})
	}

	if len(transactions) == 0 {
		return 0, errors.New("nenhum item válido encontrado no arquivo")
	}

	return s.repository.BulkCreate(ctx, transactions)
}
