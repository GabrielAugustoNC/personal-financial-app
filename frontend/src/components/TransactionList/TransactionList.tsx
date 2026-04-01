import type { Transaction } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import styles from './TransactionList.module.scss';
import { Trash2, Pencil } from 'lucide-react';

interface TransactionListProps {
  transactions : Transaction[];
  isLoading    : boolean;
  onEdit       : (transaction: Transaction) => void;
  onDelete     : (id: string) => void;
}

function SkeletonRow() {
  return (
    <div className={styles.skeletonRow}>
      <div className={`skeleton ${styles.skeletonDot}`} />
      <div className={styles.skeletonContent}>
        <div className={`skeleton ${styles.skeletonTitle}`} />
        <div className={`skeleton ${styles.skeletonMeta}`} />
      </div>
      <div className={`skeleton ${styles.skeletonAmount}`} />
    </div>
  );
}

export function TransactionList({
  transactions,
  isLoading,
  onEdit,
  onDelete,
}: TransactionListProps) {
  if (isLoading) {
    return (
      <div className={styles.container}>
        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📭</span>
        <p className={styles.emptyTitle}>Nenhuma transação encontrada</p>
        <p className={styles.emptySubtitle}>Adicione sua primeira transação clicando em "Nova Transação"</p>
      </div>
    );
  }

  return (
    <div className={`${styles.container} scrollable`}>
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className={`${styles.row} ${styles[transaction.type]} fade-in`}
        >
          <div className={styles.dot} />

          <div className={styles.info}>
            <span className={styles.title}>{transaction.title}</span>
            <div className={styles.meta}>
              <span className={styles.category}>{transaction.category}</span>
              <span className={styles.sep}>·</span>
              <span className={styles.date}>{formatDate(transaction.date)}</span>
              {transaction.description && (
                <>
                  <span className={styles.sep}>·</span>
                  <span className={styles.description}>{transaction.description}</span>
                </>
              )}
            </div>
          </div>

          <div className={styles.right}>
            <span className={`${styles.amount} mono`}>
              {transaction.type === 'expense' ? '−' : '+'}
              {formatCurrency(transaction.amount)}
            </span>

            <div className={styles.actions}>
              <button
                className={styles.actionBtn}
                onClick={() => onEdit(transaction)}
                title="Editar"
              >
                <Pencil size={14} />
              </button>
              <button
                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                onClick={() => onDelete(transaction.id)}
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
