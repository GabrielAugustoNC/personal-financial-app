// Pacote handlers implementa os controllers HTTP da aplicação.
// Cada handler recebe a requisição HTTP, extrai e valida os dados de entrada,
// delega ao service e formata a resposta JSON padronizada.
// Analogia .NET: [ApiController] controllers herdando de ControllerBase
package handlers

import (
	"net/http"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"github.com/gin-gonic/gin"
)

// TransactionHandler agrupa os handlers HTTP para o recurso de transações.
// Depende da interface TransactionService — nunca da implementação concreta.
// Analogia .NET: [ApiController] TransactionController : ControllerBase
type TransactionHandler struct {
	service interfaces.TransactionService
}

// NewTransactionHandler cria uma nova instância do handler com injeção de dependência.
// Analogia .NET: construtor do controller com ITransactionService injetado
func NewTransactionHandler(service interfaces.TransactionService) *TransactionHandler {
	return &TransactionHandler{service: service}
}

// GetAll lista transações com filtros opcionais via query string.
// Aceita: ?type=income&category=Salário&title=conta&start_date=2026-01-01&end_date=2026-03-31
// Retorna array vazio (nunca null) quando não há resultados.
// Analogia .NET: [HttpGet] IActionResult GetAll([FromQuery] TransactionFilter filter)
func (h *TransactionHandler) GetAll(c *gin.Context) {
	var filter models.TransactionFilter

	// Vincula os parâmetros da query string ao struct de filtro
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

// GetSummary retorna o resumo financeiro agregado (totais e contagem).
// Calculado via aggregation pipeline no MongoDB — sem carregar todos os documentos.
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

// GetByID busca uma única transação pelo seu ID.
// Retorna 404 se a transação não existir ou se o ID for inválido.
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

// Create cria uma nova transação a partir do corpo JSON da requisição.
// O Gin valida automaticamente os campos com `binding:"required"` antes de prosseguir.
// Analogia .NET: [HttpPost] IActionResult Create([FromBody] CreateTransactionInput input)
func (h *TransactionHandler) Create(c *gin.Context) {
	var input models.CreateTransactionInput

	// ShouldBindJSON lê o body, desserializa e executa as validações de binding
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

// Update atualiza campos específicos de uma transação existente (PATCH semantics).
// Apenas os campos enviados no corpo são atualizados — os demais são preservados.
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

// Delete remove uma transação pelo ID.
// Retorna 200 com mensagem de confirmação em caso de sucesso.
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

// BulkImport recebe um array JSON de transações e as insere em massa no banco.
// Valida se o array não está vazio antes de prosseguir.
// Retorna o total enviado e o total efetivamente importado.
// Analogia .NET: [HttpPost("bulk-import")] IActionResult BulkImport([FromBody] List<ImportTransactionItem> items)
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
