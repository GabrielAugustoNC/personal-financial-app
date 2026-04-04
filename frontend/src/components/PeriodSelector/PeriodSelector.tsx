import type { Period } from '@/types/wallet';
import { PERIOD_OPTIONS } from '@/types/wallet';
import styles from './PeriodSelector.module.scss';

interface PeriodSelectorProps {
  value    : Period;
  onChange : (period: Period) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className={styles.selector}>
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`${styles.btn} ${value === opt.value ? styles.active : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
