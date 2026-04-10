// Domínio de categorias — armazenadas na collection "categories" do MongoDB.
// Separar categorias em coleção própria permite gerenciamento dinâmico
// sem recompilar o frontend a cada adição ou remoção.
package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

// CategoryType representa o tipo de transação que a categoria pertence.
// Uma categoria pertence exclusivamente a receitas ou despesas.
type CategoryType string

const (
	CategoryIncome  CategoryType = "income"
	CategoryExpense CategoryType = "expense"
)

// Category representa uma categoria de transação no banco de dados.
// Analogia .NET: entidade Category com repositório e serviço próprios.
type Category struct {
	ID        primitive.ObjectID `json:"id"         bson:"_id,omitempty"`
	Name      string             `json:"name"       bson:"name"`
	Type      CategoryType       `json:"type"       bson:"type"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
}

// CreateCategoryInput é o DTO de entrada para criação de uma categoria.
type CreateCategoryInput struct {
	Name string       `json:"name" binding:"required,min=2,max=60"`
	Type CategoryType `json:"type" binding:"required,oneof=income expense"`
}
