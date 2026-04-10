// ============================================================
// useCategories — hook para carregar e cachear a lista de categorias.
// Usado pelo TransactionList (edição inline) e pelo TransactionForm (dropdowns).
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import type { Category } from '@/types/category';
import { categoryService } from '@/services/categoryService';

interface UseCategoriesReturn {
  categories     : Category[];      // lista completa de categorias
  incomeCategories : string[];      // nomes das categorias de receita
  expenseCategories: string[];      // nomes das categorias de despesa
  isLoading      : boolean;
  refetch        : () => Promise<void>;
}

// useCategories carrega as categorias do backend uma vez e as mantém em cache local.
// As listas derivadas (incomeCategories, expenseCategories) são computadas por filtro.
export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading]   = useState<boolean>(true);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await categoryService.getAll();
      setCategories(data);
    } catch {
      // Silencia — componentes exibem lista vazia como fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const incomeCategories  = categories.filter(c => c.type === 'income').map(c => c.name);
  const expenseCategories = categories.filter(c => c.type === 'expense').map(c => c.name);

  return { categories, incomeCategories, expenseCategories, isLoading, refetch: fetchCategories };
}
