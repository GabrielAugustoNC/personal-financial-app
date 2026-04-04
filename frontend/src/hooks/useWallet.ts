// ============================================================
// useWallet — hook customizado para gerenciamento do saldo da carteira.
// Carrega o saldo persistido do backend ao montar e expõe a função de atualização.
// O saldo é mantido em estado local e sincronizado com o MongoDB via API.
// Analogia Angular: WalletFacadeService com BehaviorSubject<Wallet>
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import type { Wallet } from '@/types/wallet';
import { walletService } from '@/services/walletService';

// Define o contrato de retorno do hook para os componentes consumidores
interface UseWalletReturn {
  wallet      : Wallet;        // Saldo atual da carteira
  isLoading   : boolean;       // Indica se o carregamento inicial está em progresso
  updateWallet: (balance: number) => Promise<void>; // Persiste um novo saldo
}

// useWallet encapsula todo o estado e lógica de acesso à carteira do usuário.
// Inicializa com saldo zero e substitui pelo valor persistido assim que a API responde.
// Erros de carregamento são silenciados — exibe R$ 0,00 como fallback seguro.
export function useWallet(): UseWalletReturn {
  const [wallet, setWallet]     = useState<Wallet>({ balance: 0 });
  const [isLoading, setLoading] = useState<boolean>(true);

  // Carrega o saldo persistido do backend na montagem do componente.
  // Usa try/catch silencioso para não bloquear a UI se a API estiver indisponível.
  const fetchWallet = useCallback(async () => {
    try {
      const data = await walletService.get();
      setWallet(data);
    } catch {
      // Silencia o erro — exibe zero como fallback para não quebrar a UI
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  // updateWallet persiste o novo saldo no MongoDB via upsert e atualiza o estado local.
  // Chamado pelo WalletWidget quando o usuário confirma a edição inline.
  const updateWallet = useCallback(async (balance: number) => {
    const updated = await walletService.update({ balance });
    setWallet(updated);
  }, []);

  return { wallet, isLoading, updateWallet };
}
