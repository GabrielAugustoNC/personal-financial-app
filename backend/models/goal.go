// Modelo de metas financeiras por categoria.
// Cada meta define um teto de gasto mensal para uma categoria específica.
// O progresso é calculado dinamicamente com base nas transações do mês atual.
package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

// Goal representa uma meta de gasto mensal para uma categoria.
// Armazenada na collection "goals" — uma meta por categoria (upsert).
// Analogia .NET: entidade Goal com repositório e serviço próprios.
type Goal struct {
	ID          primitive.ObjectID `json:"id"           bson:"_id,omitempty"`
	Category    string             `json:"category"     bson:"category"`
	LimitAmount float64            `json:"limit_amount" bson:"limit_amount"`
	CreatedAt   time.Time          `json:"created_at"   bson:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"   bson:"updated_at"`
}

// GoalProgress enriquece a meta com o progresso atual do mês.
// Calculado em tempo real — percentual gasto, valor restante e status de alerta.
// Status: "ok" (< 80%), "warning" (80–99%), "exceeded" (≥ 100%)
type GoalProgress struct {
	Goal
	SpentAmount float64 `json:"spent_amount"` // total gasto na categoria no mês atual
	Percentage  float64 `json:"percentage"`   // percentual gasto (0 a 100+)
	Remaining   float64 `json:"remaining"`    // LimitAmount - SpentAmount
	Status      string  `json:"status"`       // "ok", "warning", "exceeded"
}

// UpsertGoalInput é o DTO de entrada para criar ou atualizar uma meta.
// Upsert por categoria — se já existir meta para a categoria, atualiza o limite.
type UpsertGoalInput struct {
	Category    string  `json:"category"     binding:"required"`
	LimitAmount float64 `json:"limit_amount" binding:"required,gt=0"`
}
