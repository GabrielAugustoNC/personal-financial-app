// ============================================================
// useGoals — hook para gerenciamento de metas financeiras.
// Carrega as metas com progresso e expõe ações de upsert e delete.
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import type { GoalProgress, UpsertGoalInput } from '@/types/goal';
import { goalService } from '@/services/goalService';

interface UseGoalsReturn {
  goals     : GoalProgress[];
  isLoading : boolean;
  upsert    : (input: UpsertGoalInput) => Promise<void>;
  remove    : (id: string) => Promise<void>;
  refetch   : () => Promise<void>;
}

export function useGoals(): UseGoalsReturn {
  const [goals, setGoals]       = useState<GoalProgress[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await goalService.getAll();
      setGoals(data);
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const upsert = useCallback(async (input: UpsertGoalInput) => {
    await goalService.upsert(input);
    await fetchGoals();
  }, [fetchGoals]);

  const remove = useCallback(async (id: string) => {
    await goalService.delete(id);
    await fetchGoals();
  }, [fetchGoals]);

  return { goals, isLoading, upsert, remove, refetch: fetchGoals };
}
