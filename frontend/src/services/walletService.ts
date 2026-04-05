// ============================================================
// WalletService — camada de acesso à API da carteira do usuário.
// Encapsula as chamadas GET e PUT ao endpoint /wallet.
// A carteira é um documento singleton — sempre existe exatamente um registro.
// Analogia Angular: @Injectable({ providedIn: 'root' }) WalletService
// ============================================================

import type { Wallet, UpdateWalletInput } from '@/types/wallet';
import type { ApiResponse } from '@/types';
import apiClient from './api';

class WalletService {
  // Prefixo base da rota de carteira
  private readonly endpoint = '/wallet';

  // Busca o saldo atual da carteira persistido no banco.
  // Retorna { balance: 0 } como fallback seguro se a API não retornar dados.
  // Isso ocorre na primeira execução, antes de o usuário configurar o saldo.
  async get(): Promise<Wallet> {
    const response = await apiClient.get<ApiResponse<Wallet>>(this.endpoint);
    return response.data.data ?? { balance: 0 };
  }

  // Persiste um novo saldo para a carteira via upsert no backend.
  // Cria o documento na primeira chamada, atualiza nas seguintes.
  // Lança erro se o backend não retornar o documento atualizado.
  async update(input: UpdateWalletInput): Promise<Wallet> {
    const response = await apiClient.put<ApiResponse<Wallet>>(this.endpoint, input);
    if (!response.data.data) throw new Error('Erro ao atualizar carteira');
    return response.data.data;
  }
}

// Exporta instância singleton — padrão equivalente ao providedIn: 'root' do Angular
export const walletService = new WalletService();
