// ============================================================
// useTransactions — hook com paginação client-side.
// Carrega todas as transações do servidor (respeitando os filtros ativos)
// e expõe a fatia da página atual para o componente consumidor.
// A paginação client-side sobre dados já filtrados é ideal para
// volumes pessoais (~1k-5k transações) — evita requests extras por página.
// Analogia Angular: componente container com MatPaginator + dataSource local
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AsyncState,
  CreateTransactionInput,
  Transaction,
  TransactionFilter,
  TransactionSummary,
  UpdateTransactionInput,
} from '@/types';
import { transactionService } from '@/services/transactionService';

export const PAGE_SIZE = 20;

// Contrato de retorno do hook
interface UseTransactionsReturn {
  // Todos os dados brutos (para gráfico e filtro de período)
  allTransactions   : Transaction[];
  // Fatia da página atual (para a lista renderizada)
  paginatedItems    : Transaction[];
  // Estado de carregamento e erro
  status            : AsyncState<null>['status'];
  error             : string | null;
  // Resumo financeiro agregado (calculado sobre todas as transações)
  summary           : AsyncState<TransactionSummary>;
  // Controles de paginação
  currentPage       : number;
  totalPages        : number;
  totalItems        : number;
  setPage           : (page: number) => void;
  // Filtro ativo (aplicado no servidor)
  activeFilter      : TransactionFilter;
  setFilter         : (filter: TransactionFilter) => void;
  // Mutações
  createTransaction : (input: CreateTransactionInput) => Promise<void>;
  updateTransaction : (id: string, input: UpdateTransactionInput) => Promise<void>;
  deleteTransaction : (id: string) => Promise<void>;
  refetch           : () => Promise<void>;
}

function createInitialState<T>(): AsyncState<T> {
  return { data: null, status: 'idle', error: null };
}

export function useTransactions(): UseTransactionsReturn {
  // Estado raw — lista completa retornada pelo servidor
  const [txState, setTxState] = useState<AsyncState<Transaction[]>>(
    createInitialState<Transaction[]>()
  );
  const [summary, setSummary] = useState<AsyncState<TransactionSummary>>(
    createInitialState<TransactionSummary>()
  );
  const [activeFilter, setActiveFilter] = useState<TransactionFilter>({});
  const [currentPage, setCurrentPage]   = useState<number>(1);

  // Array de transações seguro (nunca undefined)
  const allTransactions = txState.data ?? [];

  // Calcula paginação sobre os dados já em memória
  const totalItems = allTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // Fatia da página atual — recalculada sem fetch extra
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return allTransactions.slice(start, start + PAGE_SIZE);
  }, [allTransactions, currentPage]);

  // Carrega todas as transações do servidor aplicando o filtro ativo
  const fetchTransactions = useCallback(async (filter: TransactionFilter) => {
    setTxState(prev => ({ ...prev, status: 'loading', error: null }));
    try {
      const data = await transactionService.getAll(filter);
      setTxState({ data, status: 'success', error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar transações';
      setTxState({ data: null, status: 'error', error: message });
    }
  }, []);

  // Busca o resumo financeiro agregado (endpoint dedicado no servidor)
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

  // Recarrega tudo mantendo filtro e página atuais
  const refetch = useCallback(async () => {
    await Promise.all([fetchTransactions(activeFilter), fetchSummary()]);
  }, [fetchTransactions, fetchSummary, activeFilter]);

  // Recarrega transações quando o filtro muda
  useEffect(() => {
    fetchTransactions(activeFilter);
  }, [fetchTransactions, activeFilter]);

  // Carrega o resumo uma vez na montagem
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // setFilter: aplica novo filtro e volta para a página 1
  const setFilter = useCallback((filter: TransactionFilter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  }, []);

  // setPage: navega para a página solicitada
  const setPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  // Mutações: sempre recarregam após persistir
  const createTransaction = useCallback(async (input: CreateTransactionInput) => {
    await transactionService.create(input);
    await refetch();
  }, [refetch]);

  const updateTransaction = useCallback(async (id: string, input: UpdateTransactionInput) => {
    await transactionService.update(id, input);
    await refetch();
  }, [refetch]);

  const deleteTransaction = useCallback(async (id: string) => {
    await transactionService.delete(id);
    // Ajusta a página se o item deletado era o único da página
    setCurrentPage(prev => {
      const newTotal = Math.max(1, Math.ceil((totalItems - 1) / PAGE_SIZE));
      return Math.min(prev, newTotal);
    });
    await refetch();
  }, [refetch, totalItems]);

  return {
    allTransactions,
    paginatedItems,
    status   : txState.status,
    error    : txState.error,
    summary,
    currentPage,
    totalPages,
    totalItems,
    setPage,
    activeFilter,
    setFilter,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refetch,
  };
}
