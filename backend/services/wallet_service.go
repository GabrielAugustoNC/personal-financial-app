package services

import (
	"context"

	"github.com/user/financas-api/interfaces"
	"github.com/user/financas-api/models"
)

type WalletService struct {
	repo interfaces.WalletRepository
}

func NewWalletService(repo interfaces.WalletRepository) interfaces.WalletService {
	return &WalletService{repo: repo}
}

func (s *WalletService) Get(ctx context.Context) (*models.Wallet, error) {
	return s.repo.Get(ctx)
}

func (s *WalletService) Update(ctx context.Context, balance float64) (*models.Wallet, error) {
	return s.repo.Upsert(ctx, balance)
}
