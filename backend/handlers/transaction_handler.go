package handlers

import (
	"net/http"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"github.com/gin-gonic/gin"
)

// TransactionHandler gerencia as requisições HTTP para transações.
// Analogia .NET: [ApiController] TransactionController : ControllerBase
type TransactionHandler struct {
	service interfaces.TransactionService
}

// NewTransactionHandler é o construtor do handler.
// Analogia .NET: construtor com ITransactionService injetado
func NewTransactionHandler(service interfaces.TransactionService) *TransactionHandler {
	return &TransactionHandler{service: service}
}

// GetAll retorna todas as transações com filtros opcionais via query string.
// GET /api/transactions?type=income&category=Salário
// Analogia .NET: [HttpGet] IActionResult GetAll([FromQuery] TransactionFilter filter)
func (h *TransactionHandler) GetAll(c *gin.Context) {
	var filter models.TransactionFilter

	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	transactions, err := h.service.GetAll(c.Request.Context(), &filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    transactions,
	})
}

// GetSummary retorna o resumo financeiro agregado.
// GET /api/transactions/summary
// Analogia .NET: [HttpGet("summary")] IActionResult GetSummary()
func (h *TransactionHandler) GetSummary(c *gin.Context) {
	summary, err := h.service.GetSummary(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summary,
	})
}

// GetByID retorna uma transação pelo ID.
// GET /api/transactions/:id
// Analogia .NET: [HttpGet("{id}")] IActionResult GetById(string id)
func (h *TransactionHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	transaction, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    transaction,
	})
}

// Create cria uma nova transação.
// POST /api/transactions
// Analogia .NET: [HttpPost] IActionResult Create([FromBody] CreateTransactionInput input)
func (h *TransactionHandler) Create(c *gin.Context) {
	var input models.CreateTransactionInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	transaction, err := h.service.Create(c.Request.Context(), &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Transação criada com sucesso",
		"data":    transaction,
	})
}

// Update atualiza uma transação existente.
// PUT /api/transactions/:id
// Analogia .NET: [HttpPut("{id}")] IActionResult Update(string id, [FromBody] UpdateTransactionInput input)
func (h *TransactionHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var input models.UpdateTransactionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	transaction, err := h.service.Update(c.Request.Context(), id, &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Transação atualizada com sucesso",
		"data":    transaction,
	})
}

// Delete remove uma transação.
// DELETE /api/transactions/:id
// Analogia .NET: [HttpDelete("{id}")] IActionResult Delete(string id)
func (h *TransactionHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Transação removida com sucesso",
	})
}

// BulkImport recebe um array JSON de transações e insere em massa.
// POST /api/transactions/bulk-import
// Analogia .NET: [HttpPost("bulk-import")] IActionResult BulkImport([FromBody] List<ImportDto> items)
func (h *TransactionHandler) BulkImport(c *gin.Context) {
	var items []models.ImportTransactionItem

	if err := c.ShouldBindJSON(&items); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "JSON inválido: " + err.Error(),
		})
		return
	}

	if len(items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "O arquivo não contém transações",
		})
		return
	}

	imported, err := h.service.BulkImport(c.Request.Context(), items)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":  true,
		"message":  "Importação concluída",
		"imported": imported,
		"total":    len(items),
	})
}
