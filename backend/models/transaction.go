package models

import (
	"encoding/json"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TransactionType é um tipo enumerado para o tipo da transação.
// Analogia .NET: enum TransactionType
type TransactionType string

const (
	Income  TransactionType = "income"
	Expense TransactionType = "expense"
)

// Transaction representa uma transação financeira no banco de dados.
// Analogia .NET: Entity class / EF Core model
// Em Go, structs com métodos substituem classes. Tags `json` e `bson` controlam
// a serialização (como [JsonPropertyName] e colunas do EF).
type Transaction struct {
	ID          primitive.ObjectID `json:"id"          bson:"_id,omitempty"`
	Title       string             `json:"title"       bson:"title"`
	Amount      float64            `json:"amount"      bson:"amount"`
	Type        TransactionType    `json:"type"        bson:"type"`
	Category    string             `json:"category"    bson:"category"`
	Description string             `json:"description" bson:"description"`
	Date        time.Time          `json:"date"        bson:"date"`
	CreatedAt   time.Time          `json:"created_at"  bson:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"  bson:"updated_at"`
}

// CreateTransactionInput é o DTO de entrada para criar uma transação.
// Analogia .NET: record CreateTransactionRequest / CreateTransactionDto
// A tag `binding:"required"` funciona como [Required] do DataAnnotations.
type CreateTransactionInput struct {
	Title       string          `json:"title"       binding:"required,min=3,max=100"`
	Amount      float64         `json:"amount"      binding:"required,gt=0"`
	Type        TransactionType `json:"type"        binding:"required,oneof=income expense"`
	Category    string          `json:"category"    binding:"required"`
	Description string          `json:"description"`
	Date        time.Time       `json:"date"        binding:"required"`
}

// UpdateTransactionInput é o DTO para atualização parcial (PATCH semantics).
// Analogia .NET: record UpdateTransactionRequest com campos opcionais
type UpdateTransactionInput struct {
	Title       string          `json:"title"`
	Amount      float64         `json:"amount"`
	Type        TransactionType `json:"type"`
	Category    string          `json:"category"`
	Description string          `json:"description"`
	Date        time.Time       `json:"date"`
}

// TransactionFilter é o DTO de filtros para listagem.
// Analogia .NET: TransactionQueryParams / ISpecification<Transaction>
type TransactionFilter struct {
	Type      TransactionType `form:"type"`
	Category  string          `form:"category"`
	Title     string          `form:"title"`
	StartDate time.Time       `form:"start_date" time_format:"2006-01-02"`
	EndDate   time.Time       `form:"end_date"   time_format:"2006-01-02"`
}

// TransactionSummary representa o resumo financeiro agregado.
// Analogia .NET: TransactionSummaryViewModel / DTO de leitura
type TransactionSummary struct {
	TotalIncome   float64 `json:"total_income"`
	TotalExpenses float64 `json:"total_expenses"`
	Balance       float64 `json:"balance"`
	Count         int64   `json:"count"`
}

// FlexDate aceita dois formatos de data na importação:
//   - String plana:          "2026-04-01" ou "2026-04-01T00:00:00Z"
//   - MongoDB Extended JSON: { "$date": "2026-04-01T00:00:00Z" }
//
// Analogia .NET: JsonConverter customizado — equivalente a implementar
// JsonConverter<DateTime> com Read() tratando os dois casos.
type FlexDate struct {
	Value string
}

// UnmarshalJSON implementa json.Unmarshaler para o tipo FlexDate.
// É chamado automaticamente pelo encoding/json durante o Decode().
func (d *FlexDate) UnmarshalJSON(data []byte) error {
	// Tenta desserializar como objeto { "$date": "..." }
	var obj struct {
		Date string `json:"$date"`
	}
	if err := json.Unmarshal(data, &obj); err == nil && obj.Date != "" {
		d.Value = obj.Date
		return nil
	}

	// Tenta desserializar como string plana "2026-04-01" ou "2026-04-01T..."
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		d.Value = str
		return nil
	}

	return fmt.Errorf("formato de data inválido: %s", string(data))
}

// ImportTransactionItem representa cada item do arquivo JSON de importação.
// Aceita datas em formato string plana ou MongoDB Extended JSON.
// Analogia .NET: record ImportDto com JsonConverter customizado
type ImportTransactionItem struct {
	Title       string          `json:"title"`
	Amount      float64         `json:"amount"`
	Type        TransactionType `json:"type"`
	Category    string          `json:"category"`
	Description string          `json:"description"`
	Date        FlexDate        `json:"date"`
}

// BulkImportResult é o DTO de resposta da importação em massa.
type BulkImportResult struct {
	Imported int      `json:"imported"`
	Failed   int      `json:"failed"`
	Errors   []string `json:"errors,omitempty"`
}
