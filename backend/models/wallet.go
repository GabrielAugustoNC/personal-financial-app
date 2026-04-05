// Structs de domínio para a carteira do usuário.
// A carteira é armazenada como documento singleton na collection "settings"
// usando o campo type="wallet" como discriminador.
// Analogia .NET: entidade com upsert via AddOrUpdate do EF Core
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Wallet representa o saldo manual configurado pelo usuário.
// Existe como documento único (singleton) na collection "settings".
// O campo Type é sempre "wallet" e serve como chave de busca para o upsert.
type Wallet struct {
	ID        primitive.ObjectID `json:"id"         bson:"_id,omitempty"` // ObjectID gerado pelo MongoDB
	Type      string             `json:"type"       bson:"type"`           // Discriminador — sempre "wallet"
	Balance   float64            `json:"balance"    bson:"balance"`         // Saldo atual em reais
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`     // Timestamp da última atualização
}

// UpdateWalletInput é o DTO de entrada para atualizar o saldo da carteira.
// A tag binding:"required" garante que o campo balance seja enviado pelo cliente.
// Analogia .NET: record UpdateWalletRequest com [Required]
type UpdateWalletInput struct {
	Balance float64 `json:"balance" binding:"required"`
}
