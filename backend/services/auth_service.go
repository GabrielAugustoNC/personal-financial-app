package services

import (
	"context"
	"errors"
	"os"
	"time"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// AuthService implementa interfaces.AuthService.
// Gerencia registro, login e validação de tokens JWT.
// Usa bcrypt para hash de senha (custo 12) e HS256 para assinatura JWT.
// Analogia .NET: classe combinando UserManager<T> + JwtSecurityTokenHandler.
type AuthService struct {
	repo interfaces.UserRepository
}

// NewAuthService cria o serviço com injeção de dependência.
func NewAuthService(repo interfaces.UserRepository) interfaces.AuthService {
	return &AuthService{repo: repo}
}

// jwtSecret retorna o segredo JWT da variável de ambiente.
// Em produção deve ser uma string longa e aleatória (mínimo 32 chars).
func jwtSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "financas-app-dev-secret-change-in-production"
	}
	return []byte(secret)
}

// Register valida unicidade do email, faz hash da senha com bcrypt
// e persiste o novo usuário. Retorna token JWT imediatamente após o registro
// para evitar que o usuário precise fazer login em seguida.
func (s *AuthService) Register(ctx context.Context, input *models.RegisterInput) (*models.AuthResponse, error) {
	// Verifica se o email já está em uso
	existing, err := s.repo.FindByEmail(ctx, input.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("e-mail já está em uso")
	}

	// Hash da senha com custo 12 — seguro e razoavelmente rápido (~300ms)
	// Analogia .NET: PasswordHasher<T>.HashPassword()
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), 12)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Name:         input.Name,
		Email:        input.Email,
		PasswordHash: string(hash),
	}

	created, err := s.repo.Create(ctx, user)
	if err != nil {
		return nil, err
	}

	token, err := s.generateToken(created.ID.Hex())
	if err != nil {
		return nil, err
	}

	return buildAuthResponse(token, created), nil
}

// Login verifica as credenciais e retorna um token JWT válido por 7 dias.
// O erro é genérico ("credenciais inválidas") para não revelar se o email existe.
// Analogia .NET: SignInManager<T>.CheckPasswordSignInAsync()
func (s *AuthService) Login(ctx context.Context, input *models.LoginInput) (*models.AuthResponse, error) {
	user, err := s.repo.FindByEmail(ctx, input.Email)
	if err != nil {
		return nil, err
	}

	// Mensagem genérica — não revela se o email existe ou não
	if user == nil {
		return nil, errors.New("credenciais inválidas")
	}

	// Compara a senha enviada com o hash armazenado
	// bcrypt.CompareHashAndPassword é resistente a timing attacks
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, errors.New("credenciais inválidas")
	}

	token, err := s.generateToken(user.ID.Hex())
	if err != nil {
		return nil, err
	}

	return buildAuthResponse(token, user), nil
}

// ValidateToken verifica a assinatura e a validade de um token JWT.
// Retorna o user_id do payload se válido, erro caso contrário.
// Chamado pelo middleware em cada requisição autenticada.
func (s *AuthService) ValidateToken(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		// Garante que o algoritmo é HS256 — rejeita tokens com "alg: none"
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("algoritmo de assinatura inválido")
		}
		return jwtSecret(), nil
	})

	if err != nil || !token.Valid {
		return "", errors.New("token inválido ou expirado")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("claims inválidas")
	}

	userID, ok := claims["user_id"].(string)
	if !ok || userID == "" {
		return "", errors.New("user_id ausente no token")
	}

	return userID, nil
}

// generateToken cria um JWT assinado com HS256 válido por 7 dias.
// O payload contém apenas o user_id — dados sensíveis não vão no token.
func (s *AuthService) generateToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret())
}

// buildAuthResponse monta a resposta padronizada de autenticação.
func buildAuthResponse(token string, user *models.User) *models.AuthResponse {
	return &models.AuthResponse{
		Token: token,
		User: models.UserInfo{
			ID:    user.ID.Hex(),
			Name:  user.Name,
			Email: user.Email,
		},
	}
}
