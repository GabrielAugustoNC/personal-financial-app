package interfaces

import (
	"context"

	"github.com/user/financas-api/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserRepository define o contrato de acesso à collection "users".
type UserRepository interface {
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*models.User, error)
	Create(ctx context.Context, user *models.User) (*models.User, error)
}

// AuthService define o contrato da camada de negócio para autenticação.
type AuthService interface {
	// Register valida, faz hash da senha e persiste o novo usuário. Retorna token JWT.
	Register(ctx context.Context, input *models.RegisterInput) (*models.AuthResponse, error)

	// Login valida credenciais e retorna token JWT se correto.
	Login(ctx context.Context, input *models.LoginInput) (*models.AuthResponse, error)

	// ValidateToken valida um JWT e retorna o user_id do payload.
	ValidateToken(tokenString string) (string, error)
}
