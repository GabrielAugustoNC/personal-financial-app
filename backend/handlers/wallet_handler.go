package handlers

import (
	"net/http"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
	"github.com/gin-gonic/gin"
)

type WalletHandler struct {
	service interfaces.WalletService
}

func NewWalletHandler(service interfaces.WalletService) *WalletHandler {
	return &WalletHandler{service: service}
}

// Get retorna o saldo atual da carteira.
// GET /api/wallet
func (h *WalletHandler) Get(c *gin.Context) {
	wallet, err := h.service.Get(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": wallet})
}

// Update atualiza o saldo da carteira.
// PUT /api/wallet
func (h *WalletHandler) Update(c *gin.Context) {
	var input models.UpdateWalletInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	wallet, err := h.service.Update(c.Request.Context(), input.Balance)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": wallet})
}
