package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Wallet representa o saldo manual da carteira do usuário.
// Armazenado como documento singleton na collection "settings".
type Wallet struct {
	ID        primitive.ObjectID `json:"id"         bson:"_id,omitempty"`
	Type      string             `json:"type"       bson:"type"`       // sempre "wallet"
	Balance   float64            `json:"balance"    bson:"balance"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// UpdateWalletInput é o DTO de entrada para atualizar o saldo.
type UpdateWalletInput struct {
	Balance float64 `json:"balance" binding:"required"`
}
