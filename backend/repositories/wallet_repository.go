// Repositório da carteira — implementa o acesso ao documento singleton na collection "settings".
// O padrão upsert garante que sempre exista exatamente um documento com type="wallet".
// Analogia .NET: class WalletRepository : IWalletRepository com FindOneAndUpdate
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

// MongoWalletRepository implementa interfaces.WalletRepository usando MongoDB.
// Persiste na collection "settings" com discriminador type="wallet".
// Analogia .NET: class WalletRepository : IWalletRepository com _settings collection
type MongoWalletRepository struct {
	collection *mongo.Collection
}

// NewMongoWalletRepository cria uma instância do repositório com a collection "settings".
// Retorna a interface para manter baixo acoplamento entre camadas.
func NewMongoWalletRepository(db *mongo.Database) interfaces.WalletRepository {
	return &MongoWalletRepository{collection: db.Collection("settings")}
}

// Get busca o documento de carteira na collection "settings".
// Retorna um Wallet com balance zero se nenhum documento foi criado ainda (primeira execução).
// Analogia .NET: FindAsync + retorno de objeto default quando não encontrado
func (r *MongoWalletRepository) Get(ctx context.Context) (*models.Wallet, error) {
	var wallet models.Wallet

	err := r.collection.FindOne(ctx, bson.M{"type": "wallet"}).Decode(&wallet)
	if err == mongo.ErrNoDocuments {
		// Primeira execução: retorna zero-value sem erro — o frontend exibe R$ 0,00
		return &models.Wallet{Balance: 0, Type: "wallet"}, nil
	}
	if err != nil {
		return nil, err
	}

	return &wallet, nil
}

// Upsert cria ou atualiza o documento de carteira usando FindOneAndUpdate com upsert=true.
// $set atualiza balance e updated_at em toda execução.
// $setOnInsert define _id e type apenas na criação — evita sobrescrever o ID existente.
// ReturnDocument.After garante que o documento retornado reflita os valores atualizados.
// Analogia .NET: dbContext.Settings.AddOrUpdate(wallet) + SaveChangesAsync()
func (r *MongoWalletRepository) Upsert(ctx context.Context, balance float64) (*models.Wallet, error) {
	now := time.Now()

	// Filtro de busca — encontra o documento singleton da carteira
	filter := bson.M{"type": "wallet"}

	// Operações de atualização:
	// $set: campos atualizados em toda execução (balance e timestamp)
	// $setOnInsert: campos definidos apenas na criação (ID e discriminador)
	update := bson.M{
		"$set": bson.M{
			"balance":    balance,
			"updated_at": now,
		},
		"$setOnInsert": bson.M{
			"_id":  primitive.NewObjectID(),
			"type": "wallet",
		},
	}

	opts := options.FindOneAndUpdate().
		SetUpsert(true).
		SetReturnDocument(options.After) // Retorna o documento após a atualização

	var wallet models.Wallet
	err := r.collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&wallet)
	if err != nil {
		return nil, err
	}

	return &wallet, nil
}
