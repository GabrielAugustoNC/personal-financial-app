// Interfaces da carteira — definem os contratos para gerenciamento do saldo manual.
// A carteira é armazenada como documento singleton na collection "settings".
// Analogia .NET: IWalletRepository e IWalletService com padrão upsert
package interfaces

import (
	"context"

	"github.com/user/financas-api/models"
)

// WalletRepository define o contrato de acesso a dados para a carteira do usuário.
// Usa upsert para garantir que sempre exista exatamente um documento de carteira.
// Analogia .NET: interface IWalletRepository com AddOrUpdate
type WalletRepository interface {
	// Get busca o saldo atual da carteira. Retorna zero se ainda não foi configurada.
	Get(ctx context.Context) (*models.Wallet, error)

	// Upsert cria ou atualiza o documento de carteira (padrão singleton no banco).
	Upsert(ctx context.Context, balance float64) (*models.Wallet, error)
}

// WalletService define o contrato da camada de negócio para a carteira.
// Encapsula a lógica de leitura e atualização do saldo manual do usuário.
// Analogia .NET: interface IWalletService
type WalletService interface {
	// Get retorna o saldo atual persistido da carteira
	Get(ctx context.Context) (*models.Wallet, error)

	// Update persiste um novo valor de saldo para a carteira
	Update(ctx context.Context, balance float64) (*models.Wallet, error)
}
