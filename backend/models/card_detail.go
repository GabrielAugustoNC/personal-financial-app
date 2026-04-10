// Modelo de detalhes de cartão de crédito — subcategorização de uma fatura.
// Cada fatura ("Cartão de Crédito") pode ter uma lista de itens detalhados.
// A soma dos itens não pode ultrapassar o valor da fatura — o restante vai para "Outros".
package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

// CardDetailItem representa um item de gasto dentro de uma fatura de cartão.
// Tem nome, valor e categoria — equivalente a uma linha do extrato do cartão.
type CardDetailItem struct {
	Name     string  `json:"name"     bson:"name"`
	Amount   float64 `json:"amount"   bson:"amount"`
	Category string  `json:"category" bson:"category"`
}

// CardDetail agrupa todos os itens de detalhe de uma fatura específica.
// É um documento singleton por transaction_id — upsert na collection "card_details".
// O campo Remaining contém o valor não alocado, registrado automaticamente como "Outros".
type CardDetail struct {
	ID            primitive.ObjectID `json:"id"             bson:"_id,omitempty"`
	TransactionID primitive.ObjectID `json:"transaction_id" bson:"transaction_id"`
	Items         []CardDetailItem   `json:"items"          bson:"items"`
	InvoiceTotal  float64            `json:"invoice_total"  bson:"invoice_total"`  // valor original da fatura
	AllocatedTotal float64           `json:"allocated_total" bson:"allocated_total"` // soma dos itens importados
	Remaining     float64            `json:"remaining"      bson:"remaining"`       // InvoiceTotal - AllocatedTotal
	UpdatedAt     time.Time          `json:"updated_at"     bson:"updated_at"`
}

// ImportCardDetailInput é o DTO de entrada para importação dos detalhes do cartão.
// O frontend envia a lista de itens (CSV ou JSON); o backend calcula o restante.
type ImportCardDetailInput struct {
	Items []CardDetailItem `json:"items" binding:"required"`
}
