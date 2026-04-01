import type { TransactionSummary } from '@/types';
import { formatCurrency } from '@/utils/format';
import styles from './SummaryCard.module.scss';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface SummaryCardProps {
  summary   : TransactionSummary | null;
  isLoading : boolean;
}

interface CardConfig {
  key    : keyof Pick<TransactionSummary, 'total_income' | 'total_expenses' | 'balance'>;
  label  : string;
  icon   : React.ReactNode;
  accent : 'income' | 'expense' | 'balance';
}

const CARD_CONFIGS: CardConfig[] = [
  {
    key    : 'total_income',
    label  : 'Receitas',
    icon   : <TrendingUp size={18} />,
    accent : 'income',
  },
  {
    key    : 'total_expenses',
    label  : 'Despesas',
    icon   : <TrendingDown size={18} />,
    accent : 'expense',
  },
  {
    key    : 'balance',
    label  : 'Saldo',
    icon   : <Wallet size={18} />,
    accent : 'balance',
  },
];

function SkeletonCard() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`}>
      <div className={`skeleton ${styles.skeletonIcon}`} />
      <div className={`skeleton ${styles.skeletonLabel}`} />
      <div className={`skeleton ${styles.skeletonValue}`} />
    </div>
  );
}

export function SummaryCards({ summary, isLoading }: SummaryCardProps) {
  if (isLoading) {
    return (
      <div className={styles.grid}>
        {CARD_CONFIGS.map((c) => <SkeletonCard key={c.key} />)}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {CARD_CONFIGS.map((config) => {
        const value = summary?.[config.key] ?? 0;

        return (
          <div
            key={config.key}
            className={`${styles.card} ${styles[config.accent]} fade-in`}
          >
            <div className={styles.header}>
              <span className={styles.label}>{config.label}</span>
              <span className={styles.icon}>{config.icon}</span>
            </div>
            <span className={`${styles.value} mono`}>
              {formatCurrency(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
