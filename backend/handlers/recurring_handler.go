// Handler de recorrências — expõe endpoint manual para processar
// transações recorrentes vencidas sem precisar reiniciar o servidor.
// Útil para testes e para acionar manualmente em produção.
// Analogia .NET: endpoint de trigger de um IHostedService.
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"context"
)

// RecurringProcessor é a interface que o handler depende.
// Desacopla o handler da implementação concreta do RecurringService.
// Analogia .NET: interface IRecurringService injetada no controller.
type RecurringProcessor interface {
	ProcessDue(ctx context.Context) (int, error)
}

// RecurringHandler gerencia o endpoint de processamento de recorrências.
type RecurringHandler struct {
	service RecurringProcessor
}

// NewRecurringHandler cria o handler recebendo qualquer implementação de RecurringProcessor.
func NewRecurringHandler(service RecurringProcessor) *RecurringHandler {
	return &RecurringHandler{service: service}
}

// ProcessDue processa todas as transações recorrentes com NextDueDate vencida.
// POST /api/recurring/process
// Retorna a quantidade de transações criadas automaticamente.
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
