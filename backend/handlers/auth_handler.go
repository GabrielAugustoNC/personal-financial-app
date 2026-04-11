package handlers

import (
	"net/http"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"github.com/gin-gonic/gin"
)

// AuthHandler gerencia as requisições HTTP de autenticação.
// Rotas públicas — não passam pelo middleware JWT.
// Analogia .NET: [AllowAnonymous] AccountController : ControllerBase
type AuthHandler struct {
	service interfaces.AuthService
}

func NewAuthHandler(service interfaces.AuthService) *AuthHandler {
	return &AuthHandler{service: service}
}

// Register cria uma nova conta de usuário e retorna o token JWT.
// POST /api/auth/register
// Body: { "name": "...", "email": "...", "password": "..." }
func (h *AuthHandler) Register(c *gin.Context) {
	var input models.RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	response, err := h.service.Register(c.Request.Context(), &input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": response})
}

// Login autentica um usuário existente e retorna o token JWT.
// POST /api/auth/login
// Body: { "email": "...", "password": "..." }
func (h *AuthHandler) Login(c *gin.Context) {
	var input models.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	response, err := h.service.Login(c.Request.Context(), &input)
	if err != nil {
		// 401 para credenciais inválidas — não revela se o email existe
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": response})
}

// Me retorna os dados do usuário autenticado — útil para validar o token no frontend.
// GET /api/auth/me  (rota protegida — requer Bearer token)
func (h *AuthHandler) Me(c *gin.Context) {
	// O middleware Auth já injetou o user_id no contexto
	userID, _ := c.Get("user_id")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{"user_id": userID},
	})
}
