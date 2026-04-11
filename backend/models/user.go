// Modelo de usuário para autenticação JWT.
// Senha armazenada como hash bcrypt — nunca em texto puro.
// Analogia .NET: entidade ApplicationUser do ASP.NET Core Identity.
package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

// User representa um usuário autenticado da aplicação.
type User struct {
	ID           primitive.ObjectID `json:"id"         bson:"_id,omitempty"`
	Name         string             `json:"name"       bson:"name"`
	Email        string             `json:"email"      bson:"email"`
	PasswordHash string             `json:"-"          bson:"password_hash"` // excluído do JSON
	CreatedAt    time.Time          `json:"created_at" bson:"created_at"`
}

// RegisterInput é o DTO de entrada para criação de conta.
type RegisterInput struct {
	Name     string `json:"name"     binding:"required,min=2,max=80"`
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginInput é o DTO de entrada para autenticação.
type LoginInput struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse é retornado após login/registro bem-sucedido.
// Contém o token JWT e os dados públicos do usuário.
type AuthResponse struct {
	Token string   `json:"token"`
	User  UserInfo `json:"user"`
}

// UserInfo são os dados públicos do usuário (sem senha).
type UserInfo struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}
