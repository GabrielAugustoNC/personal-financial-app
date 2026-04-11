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

// MongoUserRepository implementa interfaces.UserRepository.
// Gerencia a collection "users" com índice único por email.
// Analogia .NET: UserStore do ASP.NET Core Identity com MongoDB.
type MongoUserRepository struct {
	collection *mongo.Collection
}

// NewMongoUserRepository cria o repositório e garante o índice único de email.
// O índice é criado de forma idempotente — seguro chamar múltiplas vezes.
func NewMongoUserRepository(db *mongo.Database) interfaces.UserRepository {
	repo := &MongoUserRepository{collection: db.Collection("users")}

	// Cria o índice único em background para não bloquear o startup
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true).SetBackground(true),
	}
	// Erro silenciado — se o índice já existir, o MongoDB retorna sem fazer nada
	_, _ = repo.collection.Indexes().CreateOne(context.Background(), indexModel)

	return repo
}

// FindByEmail busca um usuário pelo email (case-sensitive no MongoDB).
// Retorna (nil, nil) quando não encontrado — o service interpreta como "email livre".
func (r *MongoUserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByID busca um usuário pelo ObjectID — usado pelo middleware JWT para validar o token.
func (r *MongoUserRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Create insere um novo usuário com timestamps automáticos.
// Retorna erro se o email já estiver em uso (violação de índice único).
func (r *MongoUserRepository) Create(ctx context.Context, user *models.User) (*models.User, error) {
	user.ID        = primitive.NewObjectID()
	user.CreatedAt = time.Now()

	if _, err := r.collection.InsertOne(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}
