package repositories

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// MongoAnalyticsRepository implementa interfaces.AnalyticsRepository.
// Todas as operações usam MongoDB Aggregation Pipeline.
// Analogia .NET: class AnalyticsRepository : IAnalyticsRepository
type MongoAnalyticsRepository struct {
	collection *mongo.Collection
}

// NewMongoAnalyticsRepository cria o repositório de analytics.
func NewMongoAnalyticsRepository(db *mongo.Database) interfaces.AnalyticsRepository {
	return &MongoAnalyticsRepository{
		collection: db.Collection("transactions"),
	}
}

// GetMonthComparison compara transações de mesmo título entre o mês atual e o anterior.
// Usa aggregation para agrupar por título+tipo e calcular totais por mês.
func (r *MongoAnalyticsRepository) GetMonthComparison(ctx context.Context) ([]models.TransactionComparison, error) {
	now := time.Now()
	// Início do mês atual
	currentMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	// Início do mês anterior
	lastMonthStart := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, time.UTC)

	pipeline := mongo.Pipeline{
		// Filtra os últimos 2 meses
		{{Key: "$match", Value: bson.D{
			{Key: "date", Value: bson.D{{Key: "$gte", Value: lastMonthStart}}},
		}}},
		// Agrupa por title + type + category + mês
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.D{
				{Key: "title", Value: "$title"},
				{Key: "type", Value: "$type"},
				{Key: "category", Value: "$category"},
				{Key: "isCurrentMonth", Value: bson.D{
					{Key: "$gte", Value: bson.A{"$date", currentMonthStart}},
				}},
			}},
			{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
		}}},
		// Agrupa novamente por title para ter current e last no mesmo documento
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.D{
				{Key: "title", Value: "$_id.title"},
				{Key: "type", Value: "$_id.type"},
				{Key: "category", Value: "$_id.category"},
			}},
			{Key: "months", Value: bson.D{{Key: "$push", Value: bson.D{
				{Key: "isCurrent", Value: "$_id.isCurrentMonth"},
				{Key: "total", Value: "$total"},
			}}}},
		}}},
		// Só inclui títulos que aparecem em pelo menos um dos dois meses
		{{Key: "$match", Value: bson.D{
			{Key: "months.0", Value: bson.D{{Key: "$exists", Value: true}}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id.title", Value: 1}}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	type rawResult struct {
		ID struct {
			Title    string `bson:"title"`
			Type     string `bson:"type"`
			Category string `bson:"category"`
		} `bson:"_id"`
		Months []struct {
			IsCurrent bool    `bson:"isCurrent"`
			Total     float64 `bson:"total"`
		} `bson:"months"`
	}

	var rawResults []rawResult
	if err := cursor.All(ctx, &rawResults); err != nil {
		return nil, err
	}

	comparisons := make([]models.TransactionComparison, 0, len(rawResults))

	for _, r := range rawResults {
		var current, last float64

		for _, m := range r.Months {
			if m.IsCurrent {
				current += m.Total
			} else {
				last += m.Total
			}
		}

		diff := current - last
		var diffPct float64
		if last > 0 {
			diffPct = (diff / last) * 100
		}

		trend := "stable"
		if math.Abs(diffPct) > 5 {
			if diff > 0 {
				trend = "up"
			} else {
				trend = "down"
			}
		}

		comparisons = append(comparisons, models.TransactionComparison{
			Title:        r.ID.Title,
			Type:         models.TransactionType(r.ID.Type),
			Category:     r.ID.Category,
			CurrentMonth: math.Round(current*100) / 100,
			LastMonth:    math.Round(last*100) / 100,
			Diff:         math.Round(diff*100) / 100,
			DiffPct:      math.Round(diffPct*10) / 10,
			Trend:        trend,
		})
	}

	return comparisons, nil
}

// GetCategoryBreakdown retorna o total de despesas por categoria no mês atual.
func (r *MongoAnalyticsRepository) GetCategoryBreakdown(ctx context.Context) ([]models.CategoryBreakdown, error) {
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{
			{Key: "type", Value: "expense"},
			{Key: "date", Value: bson.D{{Key: "$gte", Value: monthStart}}},
		}}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$category"},
			{Key: "amount", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "amount", Value: -1}}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	type rawResult struct {
		Category string  `bson:"_id"`
		Amount   float64 `bson:"amount"`
		Count    int     `bson:"count"`
	}

	var rawResults []rawResult
	if err := cursor.All(ctx, &rawResults); err != nil {
		return nil, err
	}

	// Calcula o total para percentuais
	var totalExpenses float64
	for _, r := range rawResults {
		totalExpenses += r.Amount
	}

	breakdown := make([]models.CategoryBreakdown, 0, len(rawResults))
	for _, r := range rawResults {
		pct := 0.0
		if totalExpenses > 0 {
			pct = math.Round((r.Amount/totalExpenses)*1000) / 10
		}
		breakdown = append(breakdown, models.CategoryBreakdown{
			Category:   r.Category,
			Amount:     math.Round(r.Amount*100) / 100,
			Percentage: pct,
			Count:      r.Count,
		})
	}

	return breakdown, nil
}

// GetMonthlyEvolution retorna receitas e despesas dos últimos N meses.
func (r *MongoAnalyticsRepository) GetMonthlyEvolution(ctx context.Context, months int) ([]models.MonthlyEvolution, error) {
	now := time.Now()
	since := time.Date(now.Year(), now.Month()-time.Month(months-1), 1, 0, 0, 0, 0, time.UTC)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{
			{Key: "date", Value: bson.D{{Key: "$gte", Value: since}}},
		}}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.D{
				{Key: "year", Value: bson.D{{Key: "$year", Value: "$date"}}},
				{Key: "month", Value: bson.D{{Key: "$month", Value: "$date"}}},
				{Key: "type", Value: "$type"},
			}},
			{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
		}}},
		{{Key: "$sort", Value: bson.D{
			{Key: "_id.year", Value: 1},
			{Key: "_id.month", Value: 1},
		}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	type rawResult struct {
		ID struct {
			Year  int    `bson:"year"`
			Month int    `bson:"month"`
			Type  string `bson:"type"`
		} `bson:"_id"`
		Total float64 `bson:"total"`
	}

	var rawResults []rawResult
	if err := cursor.All(ctx, &rawResults); err != nil {
		return nil, err
	}

	// Constrói mapa year-month → MonthlyEvolution
	monthMap := make(map[string]*models.MonthlyEvolution)
	monthNames := []string{"", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}

	for _, r := range rawResults {
		key := fmt.Sprintf("%d-%02d", r.ID.Year, r.ID.Month)
		if _, ok := monthMap[key]; !ok {
			monthMap[key] = &models.MonthlyEvolution{
				Month: monthNames[r.ID.Month],
				Year:  r.ID.Year,
			}
		}
		if r.ID.Type == "income" {
			monthMap[key].Income += r.Total
		} else {
			monthMap[key].Expenses += r.Total
		}
	}

	// Garante que todos os meses aparecem (mesmo sem transações)
	evolution := make([]models.MonthlyEvolution, 0, months)
	for i := months - 1; i >= 0; i-- {
		t := time.Date(now.Year(), now.Month()-time.Month(i), 1, 0, 0, 0, 0, time.UTC)
		key := fmt.Sprintf("%d-%02d", t.Year(), int(t.Month()))
		if m, ok := monthMap[key]; ok {
			m.Balance = math.Round((m.Income-m.Expenses)*100) / 100
			m.Income = math.Round(m.Income*100) / 100
			m.Expenses = math.Round(m.Expenses*100) / 100
			evolution = append(evolution, *m)
		} else {
			evolution = append(evolution, models.MonthlyEvolution{
				Month: monthNames[int(t.Month())],
				Year:  t.Year(),
			})
		}
	}

	return evolution, nil
}

// GetTopExpenses retorna as N maiores despesas do mês atual com variação vs mês anterior.
func (r *MongoAnalyticsRepository) GetTopExpenses(ctx context.Context, limit int) ([]models.AttentionPoint, error) {
	now := time.Now()
	currentMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	lastMonthStart := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, time.UTC)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{
			{Key: "type", Value: "expense"},
			{Key: "date", Value: bson.D{{Key: "$gte", Value: lastMonthStart}}},
		}}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.D{
				{Key: "title", Value: "$title"},
				{Key: "category", Value: "$category"},
				{Key: "isCurrent", Value: bson.D{
					{Key: "$gte", Value: bson.A{"$date", currentMonthStart}},
				}},
			}},
			{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
		}}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.D{
				{Key: "title", Value: "$_id.title"},
				{Key: "category", Value: "$_id.category"},
			}},
			{Key: "months", Value: bson.D{{Key: "$push", Value: bson.D{
				{Key: "isCurrent", Value: "$_id.isCurrent"},
				{Key: "total", Value: "$total"},
			}}}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id.title", Value: 1}}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	type rawResult struct {
		ID struct {
			Title    string `bson:"title"`
			Category string `bson:"category"`
		} `bson:"_id"`
		Months []struct {
			IsCurrent bool    `bson:"isCurrent"`
			Total     float64 `bson:"total"`
		} `bson:"months"`
	}

	var rawResults []rawResult
	if err := cursor.All(ctx, &rawResults); err != nil {
		return nil, err
	}

	points := make([]models.AttentionPoint, 0, len(rawResults))
	for _, r := range rawResults {
		var current, last float64
		for _, m := range r.Months {
			if m.IsCurrent {
				current += m.Total
			} else {
				last += m.Total
			}
		}

		if current == 0 {
			continue // ignora se não há despesa no mês atual
		}

		var change float64
		if last > 0 {
			change = math.Round(((current-last)/last)*1000) / 10
		}

		level := "medium"
		switch {
		case current > 2000 || change > 50:
			level = "critical"
		case current > 500 || change > 20:
			level = "high"
		}

		points = append(points, models.AttentionPoint{
			Title:    r.ID.Title,
			Category: r.ID.Category,
			Amount:   math.Round(current*100) / 100,
			Change:   change,
			Level:    level,
		})
	}

	// Ordena por valor decrescente e limita
	for i := 0; i < len(points)-1; i++ {
		for j := i + 1; j < len(points); j++ {
			if points[j].Amount > points[i].Amount {
				points[i], points[j] = points[j], points[i]
			}
		}
	}
	if len(points) > limit {
		points = points[:limit]
	}

	return points, nil
}
