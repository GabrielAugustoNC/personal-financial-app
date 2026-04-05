// Serviço da carteira — camada de negócio para gerenciamento do saldo manual.
// Implementação simples que delega diretamente ao repositório,
// pois não há regras de negócio além das operações básicas de leitura e escrita.
// Analogia .NET: class WalletService : IWalletService com repositório injetado
package services

import (
	"context"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
)

// WalletService implementa interfaces.WalletService.
// Encapsula o acesso ao repositório da carteira através da interface.
type WalletService struct {
	repo interfaces.WalletRepository
}

// NewWalletService cria uma instância do serviço com injeção de dependência.
// Retorna a interface para manter baixo acoplamento entre camadas.
func NewWalletService(repo interfaces.WalletRepository) interfaces.WalletService {
	return &WalletService{repo: repo}
}

// Get retorna o saldo atual da carteira persistido no banco.
// Delega ao repositório que retorna zero-value se nenhum saldo foi configurado ainda.
func (s *WalletService) Get(ctx context.Context) (*models.Wallet, error) {
	return s.repo.Get(ctx)
}

// Update persiste um novo saldo para a carteira.
// Usa upsert no banco — cria na primeira chamada, atualiza nas seguintes.
func (s *WalletService) Update(ctx context.Context, balance float64) (*models.Wallet, error) {
	return s.repo.Upsert(ctx, balance)
}
