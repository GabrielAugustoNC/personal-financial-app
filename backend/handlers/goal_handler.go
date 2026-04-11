package handlers

import (
	"net/http"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"github.com/gin-gonic/gin"
)

// GoalHandler gerencia as requisições HTTP para metas financeiras.
// Analogia .NET: [ApiController] GoalController : ControllerBase
type GoalHandler struct {
	service interfaces.GoalService
}

func NewGoalHandler(service interfaces.GoalService) *GoalHandler {
	return &GoalHandler{service: service}
}

// GetAll retorna todas as metas com o progresso do mês atual.
// GET /api/goals
func (h *GoalHandler) GetAll(c *gin.Context) {
	progress, err := h.service.GetAllWithProgress(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": progress})
}

// Upsert cria ou atualiza a meta de uma categoria.
// POST /api/goals
func (h *GoalHandler) Upsert(c *gin.Context) {
	var input models.UpsertGoalInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	goal, err := h.service.Upsert(c.Request.Context(), &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Meta salva com sucesso",
		"data":    goal,
	})
}

// Delete remove uma meta pelo ID.
// DELETE /api/goals/:id
func (h *GoalHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Meta removida"})
}
