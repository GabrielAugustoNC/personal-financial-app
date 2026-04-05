// Handler da carteira — recebe e processa as requisições HTTP de GET e PUT.
// Segue o mesmo padrão dos demais handlers: valida entrada, delega ao service,
// formata a resposta JSON padronizada.
// Analogia .NET: [ApiController] WalletController : ControllerBase
package handlers

import (
	"net/http"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"github.com/gin-gonic/gin"
)

// WalletHandler agrupa os handlers HTTP para o recurso de carteira.
// A carteira é um singleton — não há ID de rota, sempre opera no único documento.
type WalletHandler struct {
	service interfaces.WalletService
}

// NewWalletHandler cria uma nova instância do handler com injeção de dependência.
func NewWalletHandler(service interfaces.WalletService) *WalletHandler {
	return &WalletHandler{service: service}
}

// Get retorna o saldo atual da carteira do usuário.
// Nunca retorna 404 — se nenhum saldo foi configurado, retorna balance: 0.
// Analogia .NET: [HttpGet] IActionResult GetWallet()
func (h *WalletHandler) Get(c *gin.Context) {
	wallet, err := h.service.Get(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    wallet,
	})
}

// Update persiste um novo saldo para a carteira via upsert.
// Valida o campo balance com binding:"required" antes de prosseguir.
// Retorna o documento atualizado com o timestamp de modificação.
// Analogia .NET: [HttpPut] IActionResult UpdateWallet([FromBody] UpdateWalletInput input)
func (h *WalletHandler) Update(c *gin.Context) {
	var input models.UpdateWalletInput

	// Valida e desserializa o corpo JSON da requisição
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	wallet, err := h.service.Update(c.Request.Context(), input.Balance)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    wallet,
	})
}
