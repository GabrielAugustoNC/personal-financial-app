import { useState } from 'react';
import { useGoals }      from '@/hooks/useGoals';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency } from '@/utils/format';
import styles from './GoalProgress.module.scss';
import { Target, Plus, Trash2, Check, X } from 'lucide-react';

// GoalProgress exibe as metas financeiras com barras de progresso coloridas
// e um formulário inline para criar ou editar metas por categoria.
export function GoalProgressPanel() {
  const { goals, isLoading, upsert, remove } = useGoals();
  const { expenseCategories }                = useCategories();

  const [formOpen, setFormOpen]     = useState<boolean>(false);
  const [category, setCategory]     = useState<string>('');
  const [limitVal, setLimitVal]     = useState<string>('');
  const [saving, setSaving]         = useState<boolean>(false);
  const [formError, setFormError]   = useState<string | null>(null);

  // Cores mapeadas por status de progresso
  const statusColor: Record<string, string> = {
    ok      : '#00D9A3',
    warning : '#F59E0B',
    exceeded: '#FF5B7F',
  };

  async function handleSave(): Promise<void> {
    const parsed = parseFloat(limitVal.replace(',', '.'));
    if (!category)           { setFormError('Selecione uma categoria.'); return; }
    if (isNaN(parsed) || parsed <= 0) { setFormError('Informe um valor maior que zero.'); return; }

    setSaving(true);
    setFormError(null);
    try {
      await upsert({ category, limit_amount: parsed });
      setFormOpen(false);
      setCategory('');
      setLimitVal('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  // Categorias ainda sem meta — evita duplicatas
  const categoriesWithoutGoal = expenseCategories.filter(
    c => !goals.some(g => g.category === c)
  );

  if (isLoading) {
    return (
      <div className={styles.container}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`skeleton ${styles.skeleton}`}
            style={{ animationDelay: `${i * 0.07}s` }} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Lista de metas com barra de progresso */}
      {goals.length === 0 && !formOpen && (
        <p className={styles.empty}>
          Nenhuma meta definida. Clique em "+ Nova meta" para começar.
        </p>
      )}

      {goals.map(goal => {
        const color    = statusColor[goal.status];
        const barWidth = Math.min(100, goal.percentage);

        return (
          <div key={goal.id} className={`${styles.row} ${styles[goal.status]}`}>
            {/* Cabeçalho: categoria + valores */}
            <div className={styles.rowHeader}>
              <div className={styles.rowLeft}>
                <Target size={13} className={styles.targetIcon} style={{ color }} />
                <span className={styles.categoryName}>{goal.category}</span>
                {goal.status === 'exceeded' && (
                  <span className={styles.badge}>Limite excedido</span>
                )}
                {goal.status === 'warning' && (
                  <span className={`${styles.badge} ${styles.badgeWarning}`}>Atenção</span>
                )}
              </div>
              <div className={styles.rowRight}>
                <span className={`${styles.spent} mono`}>{formatCurrency(goal.spent_amount)}</span>
                <span className={styles.separator}>/</span>
                <span className={`${styles.limit} mono`}>{formatCurrency(goal.limit_amount)}</span>
                <button
                  className={styles.removeBtn}
                  onClick={() => remove(goal.id)}
                  title="Remover meta"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${barWidth}%`, background: color }}
              />
            </div>

            {/* Legenda */}
            <div className={styles.rowFooter}>
              <span className={styles.pct} style={{ color }}>{goal.percentage}%</span>
              <span className={styles.remaining}>
                {goal.remaining >= 0
                  ? `${formatCurrency(goal.remaining)} restante`
                  : `${formatCurrency(Math.abs(goal.remaining))} acima do limite`}
              </span>
            </div>
          </div>
        );
      })}

      {/* Formulário inline para nova meta */}
      {formOpen ? (
        <div className={styles.form}>
          <select
            className={styles.formSelect}
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">Selecione a categoria...</option>
            {categoriesWithoutGoal.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className={styles.formAmountRow}>
            <span className={styles.formPrefix}>R$</span>
            <input
              type="number"
              className={`${styles.formInput} mono`}
              placeholder="Limite mensal"
              value={limitVal}
              onChange={e => setLimitVal(e.target.value)}
              min="0.01" step="0.01"
            />
          </div>

          {formError && <p className={styles.formError}>{formError}</p>}

          <div className={styles.formActions}>
            <button className={styles.cancelBtn} onClick={() => { setFormOpen(false); setFormError(null); }}>
              <X size={13} /> Cancelar
            </button>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              <Check size={13} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.addBtn} onClick={() => setFormOpen(true)}>
          <Plus size={14} /> Nova meta
        </button>
      )}
    </div>
  );
}
