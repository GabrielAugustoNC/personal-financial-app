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

// MongoGoalRepository implementa interfaces.GoalRepository.
// Metas na collection "goals"; aggregation de gastos na collection "transactions".
type MongoGoalRepository struct {
	goals        *mongo.Collection
	transactions *mongo.Collection
}

// NewMongoGoalRepository cria o repositório com acesso às duas collections.
func NewMongoGoalRepository(db *mongo.Database) interfaces.GoalRepository {
	return &MongoGoalRepository{
		goals:        db.Collection("goals"),
		transactions: db.Collection("transactions"),
	}
}

// FindAll retorna todas as metas ordenadas por categoria.
func (r *MongoGoalRepository) FindAll(ctx context.Context) ([]models.Goal, error) {
	opts := options.Find().SetSort(bson.D{{Key: "category", Value: 1}})
	cursor, err := r.goals.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var goals []models.Goal
	if err := cursor.All(ctx, &goals); err != nil {
		return nil, err
	}
	if goals == nil {
		goals = []models.Goal{}
	}
	return goals, nil
}

// FindByCategory busca a meta de uma categoria específica.
// Retorna (nil, nil) se não existir — o service decide como tratar.
func (r *MongoGoalRepository) FindByCategory(ctx context.Context, category string) (*models.Goal, error) {
	var goal models.Goal
	err := r.goals.FindOne(ctx, bson.M{"category": category}).Decode(&goal)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &goal, nil
}

// Upsert cria ou substitui a meta de uma categoria (singleton por category).
// Usa ReplaceOne com upsert=true para garantir documento único por categoria.
func (r *MongoGoalRepository) Upsert(ctx context.Context, goal *models.Goal) (*models.Goal, error) {
	now := time.Now()
	goal.UpdatedAt = now
	if goal.ID.IsZero() {
		goal.ID = primitive.NewObjectID()
		goal.CreatedAt = now
	}

	filter := bson.M{"category": goal.Category}
	opts := options.Replace().SetUpsert(true)
	_, err := r.goals.ReplaceOne(ctx, filter, goal, opts)
	if err != nil {
		return nil, err
	}
	return goal, nil
}

// Delete remove uma meta pelo ObjectID.
func (r *MongoGoalRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.goals.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// GetMonthlySpentByCategory agrega o total de despesas por categoria no mês atual.
// Retorna um mapa category → total para cálculo eficiente de progresso de todas as metas.
// Analogia .NET: _context.Transactions.Where(mês atual).GroupBy(t => t.Category).Select(...)
func (r *MongoGoalRepository) GetMonthlySpentByCategory(ctx context.Context) (map[string]float64, error) {
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	pipeline := mongo.Pipeline{
		// Filtra apenas despesas do mês atual
		{{Key: "$match", Value: bson.D{
			{Key: "type", Value: "expense"},
			{Key: "date", Value: bson.D{{Key: "$gte", Value: monthStart}}},
		}}},
		// Agrupa por categoria somando os valores
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$category"},
			{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
		}}},
	}

	cursor, err := r.transactions.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	type row struct {
		Category string  `bson:"_id"`
		Total    float64 `bson:"total"`
	}

	var rows []row
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}

	result := make(map[string]float64, len(rows))
	for _, r := range rows {
		result[r.Category] = r.Total
	}
	return result, nil
}
