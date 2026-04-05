// ============================================================
// SummaryCards — exibe os três cards de resumo financeiro (Receitas, Despesas, Saldo).
// Suporta estado de carregamento com skeleton animado.
// Cada card tem identidade visual própria via variante de cor (income/expense/balance).
// ============================================================

import type { TransactionSummary } from '@/types';
import { formatCurrency } from '@/utils/format';
import styles from './SummaryCard.module.scss';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

// Props do componente de cards de resumo:
// - summary: dados agregados retornados pelo backend (null durante carregamento)
// - isLoading: controla exibição do skeleton em vez dos dados reais
interface SummaryCardProps {
  summary   : TransactionSummary | null;
  isLoading : boolean;
}

// CardConfig define a configuração de cada card individual.
// Usa keyof Pick para garantir que apenas campos numéricos do summary sejam referenciados.
interface CardConfig {
  key    : keyof Pick<TransactionSummary, 'total_income' | 'total_expenses' | 'balance'>;
  label  : string;
  icon   : React.ReactNode;
  accent : 'income' | 'expense' | 'balance'; // Controla a variante de cor via CSS module
}

// Configurações dos três cards — centralizadas para facilitar adição de novos cards
const CARD_CONFIGS: CardConfig[] = [
  { key: 'total_income',   label: 'Receitas', icon: <TrendingUp size={18} />,   accent: 'income'  },
  { key: 'total_expenses', label: 'Despesas', icon: <TrendingDown size={18} />, accent: 'expense' },
  { key: 'balance',        label: 'Saldo',    icon: <Wallet size={18} />,       accent: 'balance' },
];

// SkeletonCard exibe um placeholder animado enquanto os dados são carregados.
// Estrutura idêntica ao card real para evitar layout shift ao carregar.
function SkeletonCard() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`}>
      <div className={`skeleton ${styles.skeletonIcon}`} />
      <div className={`skeleton ${styles.skeletonLabel}`} />
      <div className={`skeleton ${styles.skeletonValue}`} />
    </div>
  );
}

// SummaryCards renderiza os três cards financeiros em grid.
// Alterna automaticamente entre skeleton e dados reais conforme isLoading.
export function SummaryCards({ summary, isLoading }: SummaryCardProps) {
  // Exibe skeletons enquanto os dados estão sendo carregados
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
        // Usa zero como fallback seguro quando summary ainda não foi carregado
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
            {/* Valor formatado como moeda com fonte monoespaçada para alinhamento */}
            <span className={`${styles.value} mono`}>
              {formatCurrency(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
