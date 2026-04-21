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
	collection  *mongo.Collection // transactions
	cardDetails *mongo.Collection // card_details
}

// NewMongoAnalyticsRepository cria o repositório de analytics.
func NewMongoAnalyticsRepository(db *mongo.Database) interfaces.AnalyticsRepository {
	return &MongoAnalyticsRepository{
		collection:  db.Collection("transactions"),
		cardDetails: db.Collection("card_details"),
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

// cardSubItem é um item de subcategoria de fatura de cartão de crédito.
// Usado como elemento do mapa de lookup em GetCategoryBreakdown.
type cardSubItem struct {
	Category string
	Amount   float64
}

// GetCategoryBreakdown retorna o total de despesas por categoria no mês atual.
// Transações da categoria "Cartão de Crédito" que possuem subcategorias registradas
// em card_details são expandidas — seus itens substituem o valor total da fatura.
// Faturas sem detalhes são mantidas como "Cartão de Crédito" normalmente.
func (r *MongoAnalyticsRepository) GetCategoryBreakdown(ctx context.Context) ([]models.CategoryBreakdown, error) {
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	// ---- Passo 1: busca todas as despesas do mês com seu ID e categoria ----
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{
			{Key: "type", Value: "expense"},
			{Key: "date", Value: bson.D{{Key: "$gte", Value: monthStart}}},
		}}},
		{{Key: "$project", Value: bson.D{
			{Key: "_id", Value: 1},
			{Key: "category", Value: 1},
			{Key: "amount", Value: 1},
		}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	type rawTx struct {
		ID       interface{} `bson:"_id"`
		Category string      `bson:"category"`
		Amount   float64     `bson:"amount"`
	}

	var txList []rawTx
	if err := cursor.All(ctx, &txList); err != nil {
		return nil, err
	}

	// ---- Passo 2: busca todos os card_details disponíveis ----
	detailsCursor, err := r.cardDetails.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer detailsCursor.Close(ctx)

	type cardDetailDoc struct {
		TransactionID interface{}   `bson:"transaction_id"`
		Items         []cardSubItem `bson:"items"`
	}

	var allDetails []cardDetailDoc
	if err := detailsCursor.All(ctx, &allDetails); err != nil {
		return nil, err
	}

	// Mapa transactionID(string) → subcategorias
	detailsMap := make(map[string][]cardSubItem)
	for _, d := range allDetails {
		key := fmt.Sprintf("%v", d.TransactionID)
		detailsMap[key] = d.Items
	}

	// ---- Passo 3: agrega por categoria expandindo subcategorias do cartão ----
	type aggEntry struct {
		Amount float64
		Count  int
	}
	agg := make(map[string]*aggEntry)

	for _, tx := range txList {
		txKey := fmt.Sprintf("%v", tx.ID)
		items, hasDetails := detailsMap[txKey]

		if tx.Category == "Cartão de Crédito" && hasDetails && len(items) > 0 {
			// Expande a fatura nas subcategorias dos itens de detalhe
			for _, item := range items {
				subCat := item.Category
				if subCat == "" {
					subCat = "Outros"
				}
				if agg[subCat] == nil {
					agg[subCat] = &aggEntry{}
				}
				agg[subCat].Amount += item.Amount
				agg[subCat].Count++
			}
		} else {
			// Transação normal ou cartão sem detalhes cadastrados
			cat := tx.Category
			if agg[cat] == nil {
				agg[cat] = &aggEntry{}
			}
			agg[cat].Amount += tx.Amount
			agg[cat].Count++
		}
	}

	// ---- Passo 4: calcula percentuais e monta o slice de resultado ----
	var totalExpenses float64
	for _, entry := range agg {
		totalExpenses += entry.Amount
	}

	breakdown := make([]models.CategoryBreakdown, 0, len(agg))
	for cat, entry := range agg {
		pct := 0.0
		if totalExpenses > 0 {
			pct = math.Round((entry.Amount/totalExpenses)*1000) / 10
		}
		breakdown = append(breakdown, models.CategoryBreakdown{
			Category:   cat,
			Amount:     math.Round(entry.Amount*100) / 100,
			Percentage: pct,
			Count:      entry.Count,
		})
	}

	// Ordena por valor decrescente (insertion sort simples — N é pequeno)
	for i := 1; i < len(breakdown); i++ {
		for j := 0; j < len(breakdown)-i; j++ {
			if breakdown[j].Amount < breakdown[j+1].Amount {
				breakdown[j], breakdown[j+1] = breakdown[j+1], breakdown[j]
			}
		}
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

	// Monta a lista de meses em ordem cronológica, omitindo os sem transações.
	// Meses zerados são ignorados para não poluir os gráficos com barras vazias.
	evolution := make([]models.MonthlyEvolution, 0, months)
	for i := months - 1; i >= 0; i-- {
		t := time.Date(now.Year(), now.Month()-time.Month(i), 1, 0, 0, 0, 0, time.UTC)
		key := fmt.Sprintf("%d-%02d", t.Year(), int(t.Month()))
		if m, ok := monthMap[key]; ok {
			// Só inclui o mês se tiver pelo menos uma receita ou despesa
			if m.Income > 0 || m.Expenses > 0 {
				m.Balance  = math.Round((m.Income-m.Expenses)*100) / 100
				m.Income   = math.Round(m.Income*100) / 100
				m.Expenses = math.Round(m.Expenses*100) / 100
				evolution  = append(evolution, *m)
			}
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
