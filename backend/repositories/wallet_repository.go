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

// MongoWalletRepository implementa interfaces.WalletRepository.
// Usa upsert para garantir que existe sempre um único documento de carteira.
// Analogia .NET: repositório com AddOrUpdate (padrão singleton no banco)
type MongoWalletRepository struct {
	collection *mongo.Collection
}

func NewMongoWalletRepository(db *mongo.Database) interfaces.WalletRepository {
	return &MongoWalletRepository{collection: db.Collection("settings")}
}

// Get busca o documento de carteira. Retorna zero-value se ainda não existir.
func (r *MongoWalletRepository) Get(ctx context.Context) (*models.Wallet, error) {
	var wallet models.Wallet

	err := r.collection.FindOne(ctx, bson.M{"type": "wallet"}).Decode(&wallet)
	if err == mongo.ErrNoDocuments {
		return &models.Wallet{Balance: 0, Type: "wallet"}, nil
	}
	if err != nil {
		return nil, err
	}

	return &wallet, nil
}

// Upsert insere ou atualiza o documento de carteira (padrão singleton).
func (r *MongoWalletRepository) Upsert(ctx context.Context, balance float64) (*models.Wallet, error) {
	now := time.Now()

	filter := bson.M{"type": "wallet"}
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
		SetReturnDocument(options.After)

	var wallet models.Wallet
	err := r.collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&wallet)
	if err != nil {
		return nil, err
	}

	return &wallet, nil
}
