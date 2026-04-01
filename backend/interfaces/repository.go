package interfaces

import (
	"context"

	"github.com/user/financas-api/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TransactionRepository define o contrato de acesso a dados para transações.
// Analogia .NET: interface ITransactionRepository
//
// Em Go, interfaces são implementadas implicitamente — não é necessário
// declarar "implements". Se um struct possui todos os métodos, ele satisfaz
// a interface automaticamente. Diferente do C# que requer ": IInterface".
type TransactionRepository interface {
	FindAll(ctx context.Context, filter bson.M) ([]models.Transaction, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*models.Transaction, error)
	Create(ctx context.Context, transaction *models.Transaction) (*models.Transaction, error)
	BulkCreate(ctx context.Context, transactions []models.Transaction) (int, error)
	Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*models.Transaction, error)
	Delete(ctx context.Context, id primitive.ObjectID) error
	GetSummary(ctx context.Context) (*models.TransactionSummary, error)
}

// TransactionService define o contrato da camada de negócio.
// Analogia .NET: interface ITransactionService
//
// A separação Repository / Service segue o mesmo padrão do .NET:
// Repository cuida do acesso ao dado, Service cuida das regras de negócio.
type TransactionService interface {
	GetAll(ctx context.Context, filter *models.TransactionFilter) ([]models.Transaction, error)
	GetByID(ctx context.Context, id string) (*models.Transaction, error)
	Create(ctx context.Context, input *models.CreateTransactionInput) (*models.Transaction, error)
	Update(ctx context.Context, id string, input *models.UpdateTransactionInput) (*models.Transaction, error)
	Delete(ctx context.Context, id string) error
	BulkImport(ctx context.Context, items []models.ImportTransactionItem) (int, error)
	GetSummary(ctx context.Context) (*models.TransactionSummary, error)
}
