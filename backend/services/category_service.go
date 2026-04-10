package services

import (
	"context"
	"errors"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ---- CategoryService ----

// CategoryService implementa interfaces.CategoryService.
type CategoryService struct {
	repo interfaces.CategoryRepository
}

func NewCategoryService(repo interfaces.CategoryRepository) interfaces.CategoryService {
	return &CategoryService{repo: repo}
}

// EnsureDefaults popula a collection com categorias padrão se estiver vazia.
// Chamado no startup da aplicação via routes.Setup().
func (s *CategoryService) EnsureDefaults(ctx context.Context) error {
	return s.repo.Seed(ctx)
}

// GetAll retorna as categorias filtradas por tipo ("income", "expense" ou "").
func (s *CategoryService) GetAll(ctx context.Context, categoryType string) ([]models.Category, error) {
	return s.repo.FindAll(ctx, models.CategoryType(categoryType))
}

// Create adiciona uma nova categoria personalizada ao banco.
func (s *CategoryService) Create(ctx context.Context, input *models.CreateCategoryInput) (*models.Category, error) {
	category := &models.Category{
		Name: input.Name,
		Type: input.Type,
	}
	return s.repo.Create(ctx, category)
}

// Delete remove uma categoria pelo ID em formato string.
func (s *CategoryService) Delete(ctx context.Context, id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("ID de categoria inválido")
	}
	return s.repo.Delete(ctx, objectID)
}

// ---- CardDetailService ----

// CardDetailService implementa interfaces.CardDetailService.
// Valida que a soma dos itens não ultrapassa o valor da fatura e registra o restante como "Outros".
type CardDetailService struct {
	repo interfaces.CardDetailRepository
}

func NewCardDetailService(repo interfaces.CardDetailRepository) interfaces.CardDetailService {
	return &CardDetailService{repo: repo}
}

// GetByTransactionID retorna os detalhes de detalhe de uma fatura.
func (s *CardDetailService) GetByTransactionID(ctx context.Context, transactionID string) (*models.CardDetail, error) {
	objectID, err := primitive.ObjectIDFromHex(transactionID)
	if err != nil {
		return nil, errors.New("ID de transação inválido")
	}
	return s.repo.FindByTransactionID(ctx, objectID)
}

// Import valida e salva os itens de detalhe de uma fatura de cartão.
// Regras de negócio:
//  1. A soma dos itens importados não pode ultrapassar invoiceTotal.
//  2. O valor restante (invoiceTotal - soma) é registrado automaticamente como "Outros".
//  3. Se não houver restante (ou for < 0,01), nenhum item "Outros" é criado.
func (s *CardDetailService) Import(
	ctx context.Context,
	transactionID string,
	invoiceTotal float64,
	input *models.ImportCardDetailInput,
) (*models.CardDetail, error) {
	objectID, err := primitive.ObjectIDFromHex(transactionID)
	if err != nil {
		return nil, errors.New("ID de transação inválido")
	}

	// Valida e soma os itens importados
	var allocatedTotal float64
	for i, item := range input.Items {
		if item.Amount <= 0 {
			return nil, errors.New("todos os valores devem ser maiores que zero")
		}
		allocatedTotal += item.Amount
		if item.Name == "" {
			input.Items[i].Name = "Item sem nome"
		}
	}

	if allocatedTotal > invoiceTotal+0.01 {
		return nil, errors.New("a soma dos itens ultrapassa o valor da fatura")
	}

	// Calcula o restante e registra como "Outros" se necessário
	remaining := invoiceTotal - allocatedTotal
	items := input.Items

	const minRemainder = 0.01
	if remaining > minRemainder {
		items = append(items, models.CardDetailItem{
			Name:     "Outros",
			Amount:   roundTwo(remaining),
			Category: "Outros",
		})
		remaining = 0
	}

	detail := &models.CardDetail{
		TransactionID:  objectID,
		Items:          items,
		InvoiceTotal:   roundTwo(invoiceTotal),
		AllocatedTotal: roundTwo(allocatedTotal),
		Remaining:      roundTwo(remaining),
	}

	return s.repo.Upsert(ctx, detail)
}

// roundTwo arredonda um float64 para 2 casas decimais.
func roundTwo(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}
