// Pacote repositories implementa o acesso a dados para todas as collections do MongoDB.
// Cada repositório implementa a interface correspondente do pacote interfaces.
// Analogia .NET: implementações concretas de IRepository<T> usando o driver do MongoDB
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

// MongoTransactionRepository implementa interfaces.TransactionRepository usando MongoDB.
// O campo collection mantém a referência à collection "transactions".
// Analogia .NET: class TransactionRepository : ITransactionRepository com _dbContext
type MongoTransactionRepository struct {
	collection *mongo.Collection
}

// NewMongoTransactionRepository cria uma nova instância do repositório de transações.
// Retorna a interface em vez da implementação concreta — quem consome não precisa
// conhecer os detalhes de implementação (princípio de inversão de dependência).
// Analogia .NET: construtor registrado como services.AddScoped<ITransactionRepository, MongoTransactionRepository>()
func NewMongoTransactionRepository(db *mongo.Database) interfaces.TransactionRepository {
	return &MongoTransactionRepository{
		collection: db.Collection("transactions"),
	}
}

// FindAll busca transações com filtro BSON dinâmico, ordenadas por data decrescente.
// O filtro é construído pela camada de serviço com base nos parâmetros da requisição.
// Garante que nunca retorna nil — sempre um slice vazio ou preenchido.
// Analogia .NET: _context.Transactions.Where(filter).OrderByDescending(t => t.Date).ToListAsync()
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

	// Inicializa slice vazio em vez de nil para evitar null no JSON de resposta
	if transactions == nil {
		transactions = []models.Transaction{}
	}

	return transactions, nil
}

// FindByID busca uma única transação pelo ObjectID do MongoDB.
// Retorna (nil, nil) quando o documento não é encontrado — sem erro.
// O chamador decide como tratar a ausência do registro.
// Analogia .NET: _context.Transactions.FindAsync(id) retornando null quando não encontrado
func (r *MongoTransactionRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*models.Transaction, error) {
	var transaction models.Transaction

	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&transaction)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // Não encontrado sem erro — o service trata o nil
		}
		return nil, err
	}

	return &transaction, nil
}

// Create insere uma nova transação no MongoDB.
// Gera automaticamente um novo ObjectID e preenche os timestamps de auditoria.
// Analogia .NET: _context.Transactions.AddAsync(entity) + SaveChangesAsync()
func (r *MongoTransactionRepository) Create(ctx context.Context, transaction *models.Transaction) (*models.Transaction, error) {
	now := time.Now()

	// Preenche campos gerados automaticamente pelo servidor
	transaction.ID = primitive.NewObjectID()
	transaction.CreatedAt = now
	transaction.UpdatedAt = now

	if _, err := r.collection.InsertOne(ctx, transaction); err != nil {
		return nil, err
	}

	return transaction, nil
}

// BulkCreate insere múltiplas transações em uma única operação InsertMany.
// Muito mais eficiente que múltiplos Create() — uma única chamada de rede para N documentos.
// Analogia .NET: _context.Transactions.AddRangeAsync(list) + SaveChangesAsync()
func (r *MongoTransactionRepository) BulkCreate(ctx context.Context, transactions []models.Transaction) (int, error) {
	if len(transactions) == 0 {
		return 0, nil
	}

	// InsertMany exige []interface{} — converte o slice tipado
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

// Update aplica uma atualização parcial via operador $set do MongoDB.
// Adiciona automaticamente o timestamp updated_at ao mapa de atualização.
// Retorna o documento já atualizado (ReturnDocument.After).
// Analogia .NET: _context.Transactions.Update(entity) com campos parciais
func (r *MongoTransactionRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*models.Transaction, error) {
	// Injeta o timestamp de atualização independentemente dos campos enviados
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

// Delete remove uma transação da collection pelo ObjectID.
// Analogia .NET: _context.Transactions.Remove(entity) + SaveChangesAsync()
func (r *MongoTransactionRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// GetSummary calcula o resumo financeiro usando Aggregation Pipeline do MongoDB.
// Agrupa por tipo (income/expense), soma os valores e conta os documentos.
// Analogia .NET: _context.Transactions.GroupBy(t => t.Type).Select(g => new { Total = g.Sum(t => t.Amount) })
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

	// Struct anônima para receber o resultado bruto da aggregation
	var results []struct {
		ID    string  `bson:"_id"`
		Total float64 `bson:"total"`
		Count int64   `bson:"count"`
	}

	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	// Constrói o resumo iterando pelos grupos retornados
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
