// Pacote services implementa as regras de negócio da aplicação.
// Os services recebem DTOs dos handlers, aplicam validações e regras,
// e delegam operações de persistência para os repositórios.
// Analogia .NET: camada de Application Services / Use Cases
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

// TransactionService implementa interfaces.TransactionService.
// Contém todas as regras de negócio relacionadas a transações financeiras.
// Depende da interface do repositório — não da implementação concreta.
// Analogia .NET: class TransactionService : ITransactionService
type TransactionService struct {
	repository interfaces.TransactionRepository
}

// NewTransactionService cria uma nova instância do serviço de transações.
// Recebe o repositório via injeção de dependência — facilita testes com mocks.
// Analogia .NET: construtor com ITransactionRepository injetado pelo container DI
func NewTransactionService(repo interfaces.TransactionRepository) interfaces.TransactionService {
	return &TransactionService{repository: repo}
}

// GetAll converte o filtro de domínio em um filtro BSON e delega ao repositório.
// Constrói o filtro dinamicamente — apenas campos preenchidos são incluídos na query.
// Analogia .NET: método com ISpecification<Transaction> ou Expression<Func<Transaction, bool>>
func (s *TransactionService) GetAll(ctx context.Context, filter *models.TransactionFilter) ([]models.Transaction, error) {
	mongoFilter := bson.M{}

	// Retorna todas as transações se nenhum filtro for fornecido
	if filter == nil {
		return s.repository.FindAll(ctx, mongoFilter)
	}

	// Aplica cada filtro apenas se o campo foi preenchido
	if filter.Type != "" {
		mongoFilter["type"] = filter.Type
	}
	if filter.Category != "" {
		mongoFilter["category"] = filter.Category
	}

	// Busca parcial por título (case-insensitive) usando regex do MongoDB
	// Analogia .NET: .Where(t => t.Title.Contains(filter.Title, StringComparison.OrdinalIgnoreCase))
	if filter.Title != "" {
		mongoFilter["title"] = bson.M{
			"$regex":   filter.Title,
			"$options": "i",
		}
	}

	// Filtro de intervalo de datas — aceita apenas início, apenas fim ou ambos
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

// GetByID valida o formato do ID, busca a transação e trata o caso não encontrado.
// A conversão de string para ObjectID é responsabilidade do service, não do handler.
// Analogia .NET: método que valida o Guid e lança NotFoundException se não encontrado
func (s *TransactionService) GetByID(ctx context.Context, id string) (*models.Transaction, error) {
	// Converte a string do parâmetro de rota para ObjectID do MongoDB
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, errors.New("ID inválido")
	}

	transaction, err := s.repository.FindByID(ctx, objectID)
	if err != nil {
		return nil, err
	}

	// Repositório retorna nil sem erro quando não encontrado — service converte em erro de negócio
	if transaction == nil {
		return nil, errors.New("transação não encontrada")
	}

	return transaction, nil
}

// Create mapeia o DTO de entrada para a entidade de domínio e persiste.
// A separação entre DTO e entidade evita que campos internos (ID, timestamps)
// sejam expostos ou sobrescritos por entradas externas.
// Analogia .NET: _mapper.Map<Transaction>(input) + _repository.AddAsync(entity)
func (s *TransactionService) Create(ctx context.Context, input *models.CreateTransactionInput) (*models.Transaction, error) {
	// Mapeia apenas os campos permitidos — ID e timestamps são gerados pelo repositório
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

// Update aplica atualização parcial — apenas os campos com valores são incluídos.
// Campos zero-value são ignorados, preservando os valores existentes no banco.
// Analogia .NET: método PATCH com verificação de propriedades não nulas
func (s *TransactionService) Update(ctx context.Context, id string, input *models.UpdateTransactionInput) (*models.Transaction, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, errors.New("ID inválido")
	}

	// Constrói o mapa de atualização apenas com os campos que foram enviados
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

// Delete valida o ID e remove a transação do banco de dados.
// Analogia .NET: _repository.DeleteAsync(id)
func (s *TransactionService) Delete(ctx context.Context, id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("ID inválido")
	}

	return s.repository.Delete(ctx, objectID)
}

// BulkImport valida e importa uma lista de transações de um arquivo JSON externo.
// Itera sobre cada item, faz o parse da data em múltiplos formatos aceitos
// e pula silenciosamente os itens inválidos para maximizar o aproveitamento do arquivo.
// Ao final, delega a inserção em massa para o repositório com InsertMany.
// Analogia .NET: serviço de importação com validação por item e salvamento em lote
func (s *TransactionService) BulkImport(ctx context.Context, items []models.ImportTransactionItem) (int, error) {
	if len(items) == 0 {
		return 0, errors.New("nenhum item para importar")
	}

	transactions := make([]models.Transaction, 0, len(items))
	now := time.Now()

	for _, item := range items {
		// Pula itens com campos obrigatórios ausentes ou inválidos
		if item.Title == "" || item.Amount <= 0 || item.Type == "" || item.Category == "" {
			continue
		}

		// Tenta parsear a data nos formatos mais comuns (RFC3339, RFC3339Nano, só data)
		// Usa o momento atual como fallback se nenhum formato for reconhecido
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

// GetSummary delega o cálculo do resumo financeiro ao repositório.
// O cálculo é feito via aggregation pipeline diretamente no MongoDB
// para máxima eficiência — sem transferir todos os documentos para a aplicação.
// Analogia .NET: _repository.GetFinancialSummaryAsync()
func (s *TransactionService) GetSummary(ctx context.Context) (*models.TransactionSummary, error) {
	return s.repository.GetSummary(ctx)
}
