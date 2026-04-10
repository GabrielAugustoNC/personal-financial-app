import type { CategoryBreakdown } from '@/types/analytics';
import { formatCurrency } from '@/utils/format';
import styles from './CategoryOverview.module.scss';

interface CategoryOverviewProps {
  breakdown : CategoryBreakdown[];
  isLoading : boolean;
}

const PALETTE = [
  '#7C6AF7','#00D9A3','#FF5B7F','#60A5FA',
  '#F59E0B','#EC4899','#10B981','#8B5CF6',
  '#F97316','#06B6D4',
];

// CategoryOverview exibe uma visão geral de gastos por categoria do mês atual.
// Usa barras horizontais proporcionais ao percentual de cada categoria.
// Complementa o donut chart — aqui são exibidos valores e percentuais explícitos.
export function CategoryOverview({ breakdown, isLoading }: CategoryOverviewProps) {
  if (isLoading) {
    return (
      <div className={styles.container}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`skeleton ${styles.skeleton}`}
            style={{ animationDelay: `${i * 0.07}s` }} />
        ))}
      </div>
    );
  }

  if (breakdown.length === 0) {
    return <p className={styles.empty}>Sem despesas registradas neste período.</p>;
  }

  const maxAmount = breakdown[0]?.amount ?? 1; // já ordenado decrescente pelo backend

  return (
    <div className={styles.container}>
      {breakdown.map((cat, i) => {
        const color      = PALETTE[i % PALETTE.length];
        const barWidth   = (cat.amount / maxAmount) * 100;

        return (
          <div key={cat.category} className={styles.row}>
            {/* Nome e percentual */}
            <div className={styles.meta}>
              <span className={styles.dot} style={{ background: color }} />
              <span className={styles.name}>{cat.category}</span>
              <span className={styles.count}>{cat.count}x</span>
            </div>

            {/* Barra proporcional */}
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${barWidth}%`, background: color }}
              />
            </div>

            {/* Valores */}
            <div className={styles.values}>
              <span className={`${styles.amount} mono`}>{formatCurrency(cat.amount)}</span>
              <span className={styles.pct}>{cat.percentage}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
