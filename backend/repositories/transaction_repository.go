package repositories

import (
	"context"
	"time"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MongoTransactionRepository implementa interfaces.TransactionRepository.
// Analogia .NET: class TransactionRepository : ITransactionRepository
//
// Em Go, structs com métodos substituem classes. O receptor "(r *MongoTransactionRepository)"
// é equivalente ao "this" ou instância da classe no C#.
type MongoTransactionRepository struct {
	collection *mongo.Collection
}

// NewMongoTransactionRepository é o construtor do repositório.
// Retorna a interface — quem chama não precisa saber a implementação concreta.
// Analogia .NET: construtor + services.AddScoped<ITransactionRepository, MongoTransactionRepository>()
func NewMongoTransactionRepository(db *mongo.Database) interfaces.TransactionRepository {
	return &MongoTransactionRepository{
		collection: db.Collection("transactions"),
	}
}

// FindAll busca transações com filtro dinâmico e ordena por data decrescente.
func (r *MongoTransactionRepository) FindAll(ctx context.Context, filter bson.M) ([]models.Transaction, error) {
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var transactions []models.Transaction
	if err := cursor.All(ctx, &transactions); err != nil {
		return nil, err
	}

	// Garante que nunca retornamos nil — sempre um slice (vazio ou preenchido)
	if transactions == nil {
		transactions = []models.Transaction{}
	}

	return transactions, nil
}

// FindByID busca uma transação pelo ObjectID do MongoDB.
func (r *MongoTransactionRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*models.Transaction, error) {
	var transaction models.Transaction

	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&transaction)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // Retorna nil sem erro quando não encontrado
		}
		return nil, err
	}

	return &transaction, nil
}

// Create insere uma nova transação e preenche os timestamps automaticamente.
func (r *MongoTransactionRepository) Create(ctx context.Context, transaction *models.Transaction) (*models.Transaction, error) {
	now := time.Now()

	transaction.ID = primitive.NewObjectID()
	transaction.CreatedAt = now
	transaction.UpdatedAt = now

	if _, err := r.collection.InsertOne(ctx, transaction); err != nil {
		return nil, err
	}

	return transaction, nil
}

// Update atualiza campos específicos e retorna o documento atualizado.
func (r *MongoTransactionRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*models.Transaction, error) {
	update["updated_at"] = time.Now()

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	updateDoc := bson.M{"$set": update}

	var transaction models.Transaction
	err := r.collection.FindOneAndUpdate(ctx, bson.M{"_id": id}, updateDoc, opts).Decode(&transaction)
	if err != nil {
		return nil, err
	}

	return &transaction, nil
}

// Delete remove uma transação pelo ID.
func (r *MongoTransactionRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// GetSummary usa aggregation pipeline do MongoDB para calcular o resumo financeiro.
// Analogia .NET: _context.Transactions.GroupBy(...).Select(...) com LINQ
func (r *MongoTransactionRepository) GetSummary(ctx context.Context) (*models.TransactionSummary, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$type"},
			{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		ID    string  `bson:"_id"`
		Total float64 `bson:"total"`
		Count int64   `bson:"count"`
	}

	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	summary := &models.TransactionSummary{}

	for _, result := range results {
		summary.Count += result.Count
		if result.ID == string(models.Income) {
			summary.TotalIncome = result.Total
		} else {
			summary.TotalExpenses = result.Total
		}
	}

	summary.Balance = summary.TotalIncome - summary.TotalExpenses

	return summary, nil
}

// BulkCreate insere múltiplas transações em uma única operação no MongoDB.
// Usa InsertMany para performance — uma única chamada de rede para N documentos.
// Analogia .NET: _context.Transactions.AddRange(list) + SaveChanges()
func (r *MongoTransactionRepository) BulkCreate(ctx context.Context, transactions []models.Transaction) (int, error) {
	if len(transactions) == 0 {
		return 0, nil
	}

	// Converte []Transaction para []interface{} exigido pelo InsertMany
	docs := make([]interface{}, len(transactions))
	for i := range transactions {
		docs[i] = transactions[i]
	}

	result, err := r.collection.InsertMany(ctx, docs)
	if err != nil {
		return 0, err
	}

	return len(result.InsertedIDs), nil
}
