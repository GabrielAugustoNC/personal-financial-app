// Handler de recorrências — expõe endpoint manual para processar
// transações recorrentes vencidas sem precisar reiniciar o servidor.
// Útil para testes e para acionar manualmente em produção.
package handlers

import (
	"net/http"

	"github.com/user/financas-api/services"
	"github.com/gin-gonic/gin"
)

// RecurringHandler gerencia o endpoint de processamento de recorrências.
type RecurringHandler struct {
	service *services.RecurringService
}

func NewRecurringHandler(service *services.RecurringService) *RecurringHandler {
	return &RecurringHandler{service: service}
}

// ProcessDue processa todas as transações recorrentes com NextDueDate vencida.
// POST /api/recurring/process
// Retorna a quantidade de transações criadas automaticamente.
// Analogia .NET: endpoint de trigger de um IHostedService.
func (h *RecurringHandler) ProcessDue(c *gin.Context) {
	created, err := h.service.ProcessDue(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	message := "Nenhuma recorrência vencida encontrada"
	if created > 0 {
		message = "Recorrências processadas com sucesso"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"created": created,
		"message": message,
	})
}
