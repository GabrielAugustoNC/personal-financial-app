// Pacote models contém todas as entidades de domínio e DTOs da aplicação.
// Define as estruturas de dados usadas entre as camadas e serializadas para JSON/BSON.
// Analogia .NET: pasta Models com Entities, DTOs e ViewModels
package models

import (
	"encoding/json"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TransactionType representa os tipos possíveis de uma transação financeira.
// Definido como string para serialização direta em JSON e MongoDB.
// Analogia .NET: enum com [JsonConverter] para serialização como string
type TransactionType string

// Constantes de tipo de transação — evitam strings literais espalhadas pelo código
const (
	Income  TransactionType = "income"  // Receita
	Expense TransactionType = "expense" // Despesa
)

// RecurringFrequency define a frequência de lançamentos automáticos.
// Analogia .NET: enum RecurringFrequency com valores string.
type RecurringFrequency string

const (
	FrequencyWeekly  RecurringFrequency = "weekly"
	FrequencyMonthly RecurringFrequency = "monthly"
	FrequencyYearly  RecurringFrequency = "yearly"
)

// Transaction é a entidade principal que representa um lançamento financeiro.
// Mapeada diretamente para a collection "transactions" no MongoDB.
// As tags `bson` controlam os nomes dos campos no banco.
// As tags `json` controlam a serialização na API REST.
// Analogia .NET: classe de entidade com anotações [BsonElement] e [JsonPropertyName]
type Transaction struct {
	ID          primitive.ObjectID `json:"id"          bson:"_id,omitempty"`
	Title       string             `json:"title"       bson:"title"`
	Amount      float64            `json:"amount"      bson:"amount"`
	Type        TransactionType    `json:"type"        bson:"type"`
	Category    string             `json:"category"    bson:"category"`
	Description string             `json:"description" bson:"description"`
	Date        time.Time          `json:"date"        bson:"date"`
	Recurring   bool               `json:"recurring"   bson:"recurring"`                 // true = lançamento recorrente
	Frequency   RecurringFrequency `json:"frequency"   bson:"frequency,omitempty"`       // frequência do lançamento automático
	NextDueDate *time.Time         `json:"next_due_date" bson:"next_due_date,omitempty"` // data do próximo lançamento automático
	CreatedAt   time.Time          `json:"created_at"  bson:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"  bson:"updated_at"`
}

// CreateTransactionInput é o DTO de entrada para criação de uma nova transação.
// Validado automaticamente pelo Gin via tags `binding`.
// Analogia .NET: record CreateTransactionRequest com DataAnnotations ([Required], [Range])
type CreateTransactionInput struct {
	Title       string             `json:"title"       binding:"required,min=3,max=100"`
	Amount      float64            `json:"amount"      binding:"required,gt=0"`
	Type        TransactionType    `json:"type"        binding:"required,oneof=income expense"`
	Category    string             `json:"category"    binding:"required"`
	Description string             `json:"description"`
	Date        time.Time          `json:"date"        binding:"required"`
	Recurring   bool               `json:"recurring"`
	Frequency   RecurringFrequency `json:"frequency"   binding:"omitempty,oneof=weekly monthly yearly"`
}

// UpdateTransactionInput é o DTO para atualização parcial de uma transação.
// Todos os campos são opcionais — apenas os enviados serão atualizados (PATCH semantics).
// Analogia .NET: record UpdateTransactionRequest com campos anuláveis
type UpdateTransactionInput struct {
	Title       string             `json:"title"`
	Amount      float64            `json:"amount"`
	Type        TransactionType    `json:"type"`
	Category    string             `json:"category"`
	Description string             `json:"description"`
	Date        time.Time          `json:"date"`
	Recurring   *bool              `json:"recurring"`
	Frequency   RecurringFrequency `json:"frequency"`
}

// TransactionFilter define os parâmetros de filtragem e paginação para listagem.
// Vinculado via query string pelo Gin (tag `form`).
// Analogia .NET: TransactionQueryParams com [FromQuery] + IPagedRequest
type TransactionFilter struct {
	Type      TransactionType `form:"type"`
	Category  string          `form:"category"`
	Title     string          `form:"title"`
	StartDate time.Time       `form:"start_date" time_format:"2006-01-02"`
	EndDate   time.Time       `form:"end_date"   time_format:"2006-01-02"`
	Page      int             `form:"page"`  // página atual (1-based, padrão 1)
	Limit     int             `form:"limit"` // itens por página (padrão 20, máx 100)
}

// PaginatedTransactions é a resposta paginada da listagem de transações.
// Contém os dados da página atual e metadados de paginação.
// Analogia .NET: PagedResult<Transaction> com TotalCount e TotalPages
type PaginatedTransactions struct {
	Data       []Transaction `json:"data"`
	Total      int64         `json:"total"`       // total de registros (sem paginação)
	Page       int           `json:"page"`        // página atual
	Limit      int           `json:"limit"`       // itens por página
	TotalPages int64         `json:"total_pages"` // total de páginas
}

// TransactionSummary é o DTO de resposta com o resumo financeiro agregado.
// Calculado via aggregation pipeline no MongoDB.
// Analogia .NET: TransactionSummaryViewModel retornado por um endpoint de relatório
type TransactionSummary struct {
	TotalIncome   float64 `json:"total_income"`
	TotalExpenses float64 `json:"total_expenses"`
	Balance       float64 `json:"balance"`
	Count         int64   `json:"count"`
}

// FlexDate é um tipo customizado que aceita dois formatos de data na importação:
//   - String plana:           "2026-04-01" ou "2026-04-01T00:00:00Z"
//   - MongoDB Extended JSON:  { "$date": "2026-04-01T00:00:00Z" }
//
// Implementa json.Unmarshaler para tratamento transparente dos dois formatos.
// Analogia .NET: JsonConverter<DateTime> customizado com override de Read()
type FlexDate struct {
	Value string // Valor da data normalizado como string ISO 8601
}

// UnmarshalJSON implementa a interface json.Unmarshaler.
// Chamado automaticamente pelo encoding/json ao fazer Decode() de FlexDate.
// Tenta primeiro desserializar como objeto MongoDB, depois como string plana.
func (d *FlexDate) UnmarshalJSON(data []byte) error {
	// Tenta formato MongoDB Extended JSON: { "$date": "..." }
	var obj struct {
		Date string `json:"$date"`
	}
	if err := json.Unmarshal(data, &obj); err == nil && obj.Date != "" {
		d.Value = obj.Date
		return nil
	}

	// Tenta formato de string plana: "2026-04-01" ou "2026-04-01T..."
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		d.Value = str
		return nil
	}

	return fmt.Errorf("formato de data inválido: %s", string(data))
}

// ImportTransactionItem é o DTO para cada item de um arquivo JSON de importação.
// Compatível com exportações do MongoDB Compass e com arquivos editados manualmente.
// A data é representada por FlexDate para aceitar os dois formatos suportados.
// Analogia .NET: ImportDto com JsonConverter customizado aplicado ao campo de data
type ImportTransactionItem struct {
	Title       string          `json:"title"`
	Amount      float64         `json:"amount"`
	Type        TransactionType `json:"type"`
	Category    string          `json:"category"`
	Description string          `json:"description"`
	Date        FlexDate        `json:"date"`
}

// BulkImportResult é o DTO de resposta após uma importação em massa.
// Informa quantos itens foram importados com sucesso e quais falharam.
type BulkImportResult struct {
	Imported int      `json:"imported"`
	Failed   int      `json:"failed"`
	Errors   []string `json:"errors,omitempty"`
}
