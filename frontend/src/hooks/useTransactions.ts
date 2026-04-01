// ============================================================
// useTransactions — hook de estado e lógica de negócio
// Analogia Angular: componente SmartComponent / Container
// Em React, hooks customizados substituem services com estado
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

interface UseTransactionsReturn {
  transactions  : AsyncState<Transaction[]>;
  summary       : AsyncState<TransactionSummary>;
  activeFilter  : TransactionFilter;
  setFilter     : (filter: TransactionFilter) => void;
  createTransaction : (input: CreateTransactionInput) => Promise<void>;
  updateTransaction : (id: string, input: UpdateTransactionInput) => Promise<void>;
  deleteTransaction : (id: string) => Promise<void>;
  refetch           : () => Promise<void>;
}

function createInitialState<T>(): AsyncState<T> {
  return { data: null, status: 'idle', error: null };
}

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<AsyncState<Transaction[]>>(
    createInitialState<Transaction[]>()
  );
  const [summary, setSummary] = useState<AsyncState<TransactionSummary>>(
    createInitialState<TransactionSummary>()
  );
  const [activeFilter, setActiveFilter] = useState<TransactionFilter>({});

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

  const refetch = useCallback(async () => {
    await Promise.all([fetchTransactions(activeFilter), fetchSummary()]);
  }, [fetchTransactions, fetchSummary, activeFilter]);

  useEffect(() => {
    fetchTransactions(activeFilter);
  }, [fetchTransactions, activeFilter]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const setFilter = useCallback((filter: TransactionFilter) => {
    setActiveFilter(filter);
  }, []);

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
