// ============================================================
// useTransactions — hook customizado para gerenciamento de estado de transações.
// Centraliza toda a lógica de carregamento, filtragem e mutações de transações.
// Substitui o padrão de Smart Components do Angular — o hook contém a lógica,
// o componente contém apenas a apresentação.
// Analogia Angular: componente container com injeção de TransactionService + estado local
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import type {
  AsyncState,
  CreateTransactionInput,
  Transaction,
  TransactionFilter,
  TransactionSummary,
  UpdateTransactionInput,
} from '@/types';
import { transactionService } from '@/services/transactionService';

// Define o contrato de retorno do hook — o que os componentes consumidores recebem
interface UseTransactionsReturn {
  transactions      : AsyncState<Transaction[]>;
  summary           : AsyncState<TransactionSummary>;
  activeFilter      : TransactionFilter;
  setFilter         : (filter: TransactionFilter) => void;
  createTransaction : (input: CreateTransactionInput) => Promise<void>;
  updateTransaction : (id: string, input: UpdateTransactionInput) => Promise<void>;
  deleteTransaction : (id: string) => Promise<void>;
  refetch           : () => Promise<void>;
}

// Fábrica de estado inicial para evitar objetos literais repetidos
function createInitialState<T>(): AsyncState<T> {
  return { data: null, status: 'idle', error: null };
}

// useTransactions expõe o estado e as ações de transações para os componentes.
// Gerencia dois estados paralelos: a lista de transações e o resumo financeiro.
// O filtro ativo é mantido no estado e aplicado a cada recarregamento.
export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<AsyncState<Transaction[]>>(
    createInitialState<Transaction[]>()
  );
  const [summary, setSummary] = useState<AsyncState<TransactionSummary>>(
    createInitialState<TransactionSummary>()
  );
  const [activeFilter, setActiveFilter] = useState<TransactionFilter>({});

  // Carrega a lista de transações aplicando o filtro atual.
  // Atualiza o estado de loading antes da chamada e o estado final após.
  const fetchTransactions = useCallback(async (filter: TransactionFilter) => {
    setTransactions(prev => ({ ...prev, status: 'loading', error: null }));
    try {
      const data = await transactionService.getAll(filter);
      setTransactions({ data, status: 'success', error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar transações';
      setTransactions({ data: null, status: 'error', error: message });
    }
  }, []);

  // Carrega o resumo financeiro (totais de receitas, despesas e saldo).
  // Executado em paralelo com fetchTransactions para minimizar tempo de espera.
  const fetchSummary = useCallback(async () => {
    setSummary(prev => ({ ...prev, status: 'loading', error: null }));
    try {
      const data = await transactionService.getSummary();
      setSummary({ data, status: 'success', error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar resumo';
      setSummary({ data: null, status: 'error', error: message });
    }
  }, []);

  // refetch recarrega tanto a lista quanto o resumo simultaneamente.
  // Chamado após mutações (criar, atualizar, deletar) para sincronizar a UI.
  const refetch = useCallback(async () => {
    await Promise.all([fetchTransactions(activeFilter), fetchSummary()]);
  }, [fetchTransactions, fetchSummary, activeFilter]);

  // Recarrega as transações sempre que o filtro ativo mudar
  useEffect(() => {
    fetchTransactions(activeFilter);
  }, [fetchTransactions, activeFilter]);

  // Carrega o resumo uma vez na montagem do componente (não depende do filtro)
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // setFilter atualiza o filtro ativo, disparando automaticamente um novo carregamento
  const setFilter = useCallback((filter: TransactionFilter) => {
    setActiveFilter(filter);
  }, []);

  // createTransaction persiste uma nova transação e recarrega o estado
  const createTransaction = useCallback(async (input: CreateTransactionInput) => {
    await transactionService.create(input);
    await refetch();
  }, [refetch]);

  // updateTransaction aplica uma atualização parcial e recarrega o estado
  const updateTransaction = useCallback(async (id: string, input: UpdateTransactionInput) => {
    await transactionService.update(id, input);
    await refetch();
  }, [refetch]);

  // deleteTransaction remove a transação e recarrega o estado
  const deleteTransaction = useCallback(async (id: string) => {
    await transactionService.delete(id);
    await refetch();
  }, [refetch]);

  return {
    transactions,
    summary,
    activeFilter,
    setFilter,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refetch,
  };
}
