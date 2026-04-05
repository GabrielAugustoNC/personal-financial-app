// Handler de analytics — recebe a requisição HTTP, extrai o parâmetro de período
// e delega ao serviço para calcular e retornar o overview completo.
// Analogia .NET: [ApiController] AnalyticsController : ControllerBase
package handlers

import (
	"net/http"
	"strconv"

	"github.com/user/financas-api/interfaces"
	"github.com/gin-gonic/gin"
)

// AnalyticsHandler agrupa os handlers HTTP para o recurso de analytics.
// Depende da interface AnalyticsService — nunca da implementação concreta.
type AnalyticsHandler struct {
	service interfaces.AnalyticsService
}

// NewAnalyticsHandler cria uma nova instância do handler com injeção de dependência.
func NewAnalyticsHandler(service interfaces.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{service: service}
}

// GetOverview retorna todos os dados analíticos em uma única chamada.
// Aceita o parâmetro opcional ?months=N (padrão 4, mínimo 1, máximo 12)
// para controlar o horizonte temporal dos gráficos de evolução.
// Analogia .NET: [HttpGet("overview")] IActionResult GetOverview([FromQuery] int months = 4)
func (h *AnalyticsHandler) GetOverview(c *gin.Context) {
	// Lê o parâmetro months da query string, com 4 como valor padrão
	months := 4
	if m := c.Query("months"); m != "" {
		if parsed, err := strconv.Atoi(m); err == nil && parsed >= 1 && parsed <= 12 {
			months = parsed
		}
	}

	overview, err := h.service.GetOverview(c.Request.Context(), months)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    overview,
	})
}
