import type { Wallet, UpdateWalletInput } from '@/types/wallet';
import type { ApiResponse } from '@/types';
import apiClient from './api';

class WalletService {
  private readonly endpoint = '/wallet';

  async get(): Promise<Wallet> {
    const response = await apiClient.get<ApiResponse<Wallet>>(this.endpoint);
    return response.data.data ?? { balance: 0 };
  }

  async update(input: UpdateWalletInput): Promise<Wallet> {
    const response = await apiClient.put<ApiResponse<Wallet>>(this.endpoint, input);
    if (!response.data.data) throw new Error('Erro ao atualizar carteira');
    return response.data.data;
  }
}

export const walletService = new WalletService();
