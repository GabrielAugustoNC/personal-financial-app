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

// MongoCardDetailRepository implementa interfaces.CardDetailRepository.
// Cada transação de cartão de crédito tem no máximo um documento de detalhe.
type MongoCardDetailRepository struct {
	collection *mongo.Collection
}

func NewMongoCardDetailRepository(db *mongo.Database) interfaces.CardDetailRepository {
	return &MongoCardDetailRepository{collection: db.Collection("card_details")}
}

// FindByTransactionID busca o documento de detalhe de uma fatura.
// Retorna (nil, nil) quando não existir ainda — comportamento intencional.
func (r *MongoCardDetailRepository) FindByTransactionID(ctx context.Context, transactionID primitive.ObjectID) (*models.CardDetail, error) {
	var detail models.CardDetail
	err := r.collection.FindOne(ctx, bson.M{"transaction_id": transactionID}).Decode(&detail)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &detail, nil
}

// Upsert cria ou substitui os detalhes de uma fatura.
// Usa ReplaceOne com upsert=true para garantir documento único por transaction_id.
func (r *MongoCardDetailRepository) Upsert(ctx context.Context, detail *models.CardDetail) (*models.CardDetail, error) {
	detail.UpdatedAt = time.Now()
	if detail.ID.IsZero() {
		detail.ID = primitive.NewObjectID()
	}

	filter := bson.M{"transaction_id": detail.TransactionID}
	opts := options.Replace().SetUpsert(true)

	_, err := r.collection.ReplaceOne(ctx, filter, detail, opts)
	if err != nil {
		return nil, err
	}
	return detail, nil
}
