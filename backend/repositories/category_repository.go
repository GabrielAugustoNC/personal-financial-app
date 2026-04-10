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

// MongoCategoryRepository implementa interfaces.CategoryRepository.
// Gerencia a collection "categories" com dados iniciais pré-definidos.
type MongoCategoryRepository struct {
	collection *mongo.Collection
}

func NewMongoCategoryRepository(db *mongo.Database) interfaces.CategoryRepository {
	return &MongoCategoryRepository{collection: db.Collection("categories")}
}

// defaultCategories são as categorias pré-definidas inseridas no primeiro uso.
// Espelham as constantes que antes viviam no frontend — agora são dados de domínio.
var defaultCategories = []models.Category{
	// Receitas
	{Name: "Salário",        Type: models.CategoryIncome},
	{Name: "Freelance",      Type: models.CategoryIncome},
	{Name: "Investimentos",  Type: models.CategoryIncome},
	{Name: "Presente",       Type: models.CategoryIncome},
	{Name: "Outros",         Type: models.CategoryIncome},
	// Despesas
	{Name: "Moradia",        Type: models.CategoryExpense},
	{Name: "Alimentação",    Type: models.CategoryExpense},
	{Name: "Transporte",     Type: models.CategoryExpense},
	{Name: "Saúde",          Type: models.CategoryExpense},
	{Name: "Educação",       Type: models.CategoryExpense},
	{Name: "Lazer",          Type: models.CategoryExpense},
	{Name: "Vestuário",      Type: models.CategoryExpense},
	{Name: "Assinaturas",    Type: models.CategoryExpense},
	{Name: "Cartão de Crédito", Type: models.CategoryExpense},
	{Name: "Empréstimos",    Type: models.CategoryExpense},
	{Name: "Outros",         Type: models.CategoryExpense},
}

// Seed insere as categorias padrão apenas se a collection estiver vazia.
// Chamado uma vez na inicialização da aplicação (main.go ou routes.go).
func (r *MongoCategoryRepository) Seed(ctx context.Context) error {
	count, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return err
	}
	if count > 0 {
		return nil // já populada — não sobrescreve customizações do usuário
	}

	docs := make([]interface{}, len(defaultCategories))
	now := time.Now()
	for i, cat := range defaultCategories {
		cat.ID = primitive.NewObjectID()
		cat.CreatedAt = now
		docs[i] = cat
	}

	_, err = r.collection.InsertMany(ctx, docs)
	return err
}

// FindAll retorna categorias filtradas por tipo (income/expense) ou todas se tipo vazio.
func (r *MongoCategoryRepository) FindAll(ctx context.Context, categoryType models.CategoryType) ([]models.Category, error) {
	filter := bson.M{}
	if categoryType != "" {
		filter["type"] = categoryType
	}

	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var categories []models.Category
	if err := cursor.All(ctx, &categories); err != nil {
		return nil, err
	}
	if categories == nil {
		categories = []models.Category{}
	}
	return categories, nil
}

// Create insere uma nova categoria personalizada.
func (r *MongoCategoryRepository) Create(ctx context.Context, category *models.Category) (*models.Category, error) {
	category.ID = primitive.NewObjectID()
	category.CreatedAt = time.Now()
	if _, err := r.collection.InsertOne(ctx, category); err != nil {
		return nil, err
	}
	return category, nil
}

// Delete remove uma categoria pelo ObjectID.
func (r *MongoCategoryRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}
