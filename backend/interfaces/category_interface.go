// Contratos de acesso a dados para categorias e detalhes de cartão.
package interfaces

import (
	"context"

	"github.com/user/financas-api/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CategoryRepository define o contrato de acesso à collection "categories".
// Analogia .NET: interface ICategoryRepository
type CategoryRepository interface {
	// FindAll retorna todas as categorias, opcionalmente filtradas por tipo
	FindAll(ctx context.Context, categoryType models.CategoryType) ([]models.Category, error)

	// Seed insere as categorias padrão se a collection estiver vazia
	Seed(ctx context.Context) error

	// Create persiste uma nova categoria
	Create(ctx context.Context, category *models.Category) (*models.Category, error)

	// Delete remove uma categoria pelo ID
	Delete(ctx context.Context, id primitive.ObjectID) error
}

// CategoryService define o contrato da camada de negócio para categorias.
type CategoryService interface {
	GetAll(ctx context.Context, categoryType string) ([]models.Category, error)
	Create(ctx context.Context, input *models.CreateCategoryInput) (*models.Category, error)
	Delete(ctx context.Context, id string) error
	EnsureDefaults(ctx context.Context) error
}

// CardDetailRepository define o contrato de acesso à collection "card_details".
type CardDetailRepository interface {
	// FindByTransactionID busca os detalhes de uma fatura pelo ID da transação
	FindByTransactionID(ctx context.Context, transactionID primitive.ObjectID) (*models.CardDetail, error)

	// Upsert cria ou substitui os detalhes de uma fatura (singleton por transaction_id)
	Upsert(ctx context.Context, detail *models.CardDetail) (*models.CardDetail, error)
}

// CardDetailService define o contrato da camada de negócio para detalhes de cartão.
type CardDetailService interface {
	// GetByTransactionID retorna os detalhes de uma fatura
	GetByTransactionID(ctx context.Context, transactionID string) (*models.CardDetail, error)

	// Import valida e importa os itens de detalhe de uma fatura.
	// Garante que a soma não ultrapassa o valor da fatura e registra o restante como "Outros".
	Import(ctx context.Context, transactionID string, invoiceTotal float64, input *models.ImportCardDetailInput) (*models.CardDetail, error)
}
