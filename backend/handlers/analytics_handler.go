package handlers

import (
	"net/http"
	"strconv"

	"github.com/user/financas-api/interfaces"
	"github.com/gin-gonic/gin"
)

// AnalyticsHandler gerencia as requisições HTTP para analytics.
// Analogia .NET: [ApiController] AnalyticsController : ControllerBase
type AnalyticsHandler struct {
	service interfaces.AnalyticsService
}

// NewAnalyticsHandler é o construtor do handler.
func NewAnalyticsHandler(service interfaces.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{service: service}
}

// GetOverview retorna todos os dados analíticos em uma única chamada.
// GET /api/analytics/overview?months=4
// months: número de meses a considerar (padrão 4, máximo 12)
func (h *AnalyticsHandler) GetOverview(c *gin.Context) {
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
