package handlers

import (
	"net/http"
	"strconv"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"github.com/gin-gonic/gin"
)

// ---- CategoryHandler ----

// CategoryHandler gerencia as requisições HTTP para o recurso de categorias.
type CategoryHandler struct {
	service            interfaces.CategoryService
	transactionService interfaces.TransactionService
}

func NewCategoryHandler(service interfaces.CategoryService, txService interfaces.TransactionService) *CategoryHandler {
	return &CategoryHandler{service: service, transactionService: txService}
}

// GetAll retorna as categorias filtradas por tipo via query string ?type=income|expense.
// GET /api/categories?type=expense
func (h *CategoryHandler) GetAll(c *gin.Context) {
	categoryType := c.Query("type")
	categories, err := h.service.GetAll(c.Request.Context(), categoryType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": categories})
}

// Create adiciona uma nova categoria personalizada.
// POST /api/categories
func (h *CategoryHandler) Create(c *gin.Context) {
	var input models.CreateCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	category, err := h.service.Create(c.Request.Context(), &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": category})
}

// Delete remove uma categoria pelo ID.
// DELETE /api/categories/:id
func (h *CategoryHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Categoria removida"})
}

// UpdateCategoryBulk propaga uma nova categoria para todas as transações com título similar.
// POST /api/categories/bulk-update
// Body: { "reference_title": "Mercado", "new_category": "Alimentação" }
func (h *CategoryHandler) UpdateCategoryBulk(c *gin.Context) {
	var body struct {
		ReferenceTitle string `json:"reference_title" binding:"required"`
		NewCategory    string `json:"new_category"    binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	updated, err := h.transactionService.UpdateCategoryByTitleSimilarity(
		c.Request.Context(),
		body.ReferenceTitle,
		body.NewCategory,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"updated": updated,
		"message": strconv.FormatInt(updated, 10) + " transações atualizadas",
	})
}

// ---- CardDetailHandler ----

// CardDetailHandler gerencia os detalhes de subcategorização de faturas de cartão.
type CardDetailHandler struct {
	service            interfaces.CardDetailService
	transactionService interfaces.TransactionService
}

func NewCardDetailHandler(service interfaces.CardDetailService, txService interfaces.TransactionService) *CardDetailHandler {
	return &CardDetailHandler{service: service, transactionService: txService}
}

// GetByTransaction retorna os detalhes de uma fatura de cartão.
// GET /api/transactions/:id/card-details
func (h *CardDetailHandler) GetByTransaction(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.service.GetByTransactionID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": detail})
}

// Import recebe a lista de itens e persiste os detalhes de uma fatura.
// POST /api/transactions/:id/card-details
func (h *CardDetailHandler) Import(c *gin.Context) {
	id := c.Param("id")

	// Busca o valor original da fatura para validação
	transaction, err := h.transactionService.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Transação não encontrada"})
		return
	}

	var input models.ImportCardDetailInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	detail, err := h.service.Import(c.Request.Context(), id, transaction.Amount, &input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Detalhes importados com sucesso",
		"data":    detail,
	})
}
