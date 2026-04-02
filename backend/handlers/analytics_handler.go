package handlers

import (
	"net/http"

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
// GET /api/analytics/overview
func (h *AnalyticsHandler) GetOverview(c *gin.Context) {
	overview, err := h.service.GetOverview(c.Request.Context())
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
