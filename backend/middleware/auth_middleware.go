// Middleware de autenticação JWT para o Gin.
// Intercepta todas as requisições protegidas, valida o Bearer token
// e injeta o user_id no contexto para uso nos handlers.
// Analogia .NET: [Authorize] attribute + JwtBearerAuthentication middleware.
package middleware

import (
	"net/http"
	"strings"

	"github.com/user/financas-api/interfaces"
	"github.com/gin-gonic/gin"
)

// ContextKeyUserID é a chave usada para armazenar o user_id no contexto Gin.
// Definida como constante para evitar colisões de chave em contextos compostos.
const ContextKeyUserID = "user_id"

// Auth retorna um middleware Gin que valida o token JWT no header Authorization.
// Se válido, injeta o user_id no contexto e passa para o próximo handler.
// Se inválido ou ausente, retorna 401 e interrompe a cadeia.
//
// Uso esperado: Authorization: Bearer <token>
// Analogia .NET: app.UseAuthentication() + app.UseAuthorization()
func Auth(authService interfaces.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Lê o header Authorization
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Token de autenticação não informado",
			})
			c.Abort()
			return
		}

		// Extrai o token do formato "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Formato de token inválido. Use: Bearer <token>",
			})
			c.Abort()
			return
		}

		// Valida a assinatura e expiração do token
		userID, err := authService.ValidateToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Token inválido ou expirado",
			})
			c.Abort()
			return
		}

		// Injeta o user_id no contexto para uso nos handlers downstream
		c.Set(ContextKeyUserID, userID)
		c.Next()
	}
}
