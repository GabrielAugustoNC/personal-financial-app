// Pacote interfaces define os contratos (interfaces) de todas as camadas da aplicação.
// Seguindo o princípio de inversão de dependência (DIP do SOLID), cada camada
// depende de abstrações — nunca de implementações concretas.
// Analogia .NET: pasta de interfaces com IRepository<T> e IService<T>
package interfaces

import (
	"context"

	"github.com/user/financas-api/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TransactionRepository define o contrato de acesso a dados para transações.
// Qualquer implementação (MongoDB, PostgreSQL, in-memory) deve satisfazer esta interface.
//
// Em Go, interfaces são satisfeitas implicitamente — não é preciso declarar "implements".
// Basta que o struct implemente todos os métodos com as assinaturas corretas.
// Analogia .NET: interface ITransactionRepository com métodos CRUD
type TransactionRepository interface {
	// FindAll busca transações aplicando o filtro BSON fornecido
	FindAll(ctx context.Context, filter bson.M) ([]models.Transaction, error)

	// FindByID busca uma transação pelo seu ObjectID do MongoDB
	FindByID(ctx context.Context, id primitive.ObjectID) (*models.Transaction, error)

	// Create persiste uma nova transação e retorna o documento com ID gerado
	Create(ctx context.Context, transaction *models.Transaction) (*models.Transaction, error)

	// BulkCreate insere múltiplas transações em uma única operação de banco
	BulkCreate(ctx context.Context, transactions []models.Transaction) (int, error)

	// Update atualiza campos específicos de uma transação via $set
	Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*models.Transaction, error)

	// Delete remove uma transação pelo ID
	Delete(ctx context.Context, id primitive.ObjectID) error

	// GetSummary calcula o resumo financeiro via aggregation pipeline
	GetSummary(ctx context.Context) (*models.TransactionSummary, error)
}

// TransactionService define o contrato da camada de negócio para transações.
// Recebe e retorna DTOs tipados — nunca expõe detalhes de infraestrutura.
//
// A separação Repository/Service garante que regras de negócio não
// dependam do banco de dados, facilitando testes unitários.
// Analogia .NET: interface ITransactionService com métodos de domínio
type TransactionService interface {
	// GetAll lista transações aplicando filtros de domínio (tipo, categoria, período)
	GetAll(ctx context.Context, filter *models.TransactionFilter) ([]models.Transaction, error)

	// GetByID busca uma transação por ID em formato string (valida e converte para ObjectID)
	GetByID(ctx context.Context, id string) (*models.Transaction, error)

	// Create valida o DTO de entrada e persiste uma nova transação
	Create(ctx context.Context, input *models.CreateTransactionInput) (*models.Transaction, error)

	// Update aplica atualização parcial (patch) em uma transação existente
	Update(ctx context.Context, id string, input *models.UpdateTransactionInput) (*models.Transaction, error)

	// Delete remove uma transação após validar o formato do ID
	Delete(ctx context.Context, id string) error

	// BulkImport valida e importa uma lista de transações de um arquivo JSON
	BulkImport(ctx context.Context, items []models.ImportTransactionItem) (int, error)

	// GetSummary retorna o resumo financeiro agregado (totais e contagem)
	GetSummary(ctx context.Context) (*models.TransactionSummary, error)
}
