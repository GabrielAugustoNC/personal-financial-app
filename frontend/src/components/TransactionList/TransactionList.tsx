// ============================================================
// TransactionList — lista de transações com edição inline de categoria
// e botão de detalhamento para faturas de Cartão de Crédito.
// ============================================================

import { useState } from 'react';
import type { Transaction } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import styles from './TransactionList.module.scss';
import { Trash2, Pencil, CreditCard, RefreshCw } from 'lucide-react';

interface TransactionListProps {
  transactions      : Transaction[];
  isLoading         : boolean;
  categories        : string[];
  onEdit            : (transaction: Transaction) => void;
  onDelete          : (id: string) => void;
  onCategoryChange  : (transaction: Transaction, newCategory: string) => Promise<void>;
  onOpenCardDetails : (transaction: Transaction) => void;
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

// CategoryCell — célula de categoria com edição inline ao clicar.
// Enter confirma, Escape cancela, blur confirma (UX fluído).
function CategoryCell({
  transaction,
  categories,
  onCategoryChange,
}: {
  transaction     : Transaction;
  categories      : string[];
  onCategoryChange: (t: Transaction, cat: string) => Promise<void>;
}) {
  const [editing, setEditing]   = useState(false);
  const [selected, setSelected] = useState(transaction.category);
  const [saving, setSaving]     = useState(false);

  async function confirm(value: string): Promise<void> {
    if (value === transaction.category) { setEditing(false); return; }
    setSaving(true);
    try {
      await onCategoryChange(transaction, value);
      setSelected(value);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <select
        className={styles.categorySelect}
        value={selected}
        autoFocus
        disabled={saving}
        onChange={e => setSelected(e.target.value)}
        onBlur={e => confirm(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter')  confirm(selected);
          if (e.key === 'Escape') setEditing(false);
        }}
      >
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    );
  }

  return (
    <button
      className={styles.categoryPill}
      onClick={() => setEditing(true)}
      title="Clique para alterar a categoria"
    >
      {saving ? '...' : selected}
    </button>
  );
}

export function TransactionList({
  transactions,
  isLoading,
  categories,
  onEdit,
  onDelete,
  onCategoryChange,
  onOpenCardDetails,
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
        <p className={styles.emptySubtitle}>
          Adicione sua primeira transação clicando em "Nova Transação"
        </p>
      </div>
    );
  }

  return (
    <div className={`${styles.container} scrollable`}>
      {transactions.map(transaction => (
        <div key={transaction.id} className={`${styles.row} ${styles[transaction.type]} fade-in`}>
          <div className={styles.dot} />

          <div className={styles.info}>
            <div className={styles.titleRow}>
              <span className={styles.title}>{transaction.title}</span>
              {transaction.recurring && (
                <span className={styles.recurringBadge} title="Transação recorrente">
                  <RefreshCw size={10} />
                  {transaction.frequency === 'weekly' ? 'Semanal'
                    : transaction.frequency === 'yearly' ? 'Anual'
                    : 'Mensal'}
                </span>
              )}
            </div>
            <div className={styles.meta}>
              {/* Categoria editável inline ao clicar */}
              <CategoryCell
                transaction={transaction}
                categories={categories}
                onCategoryChange={onCategoryChange}
              />
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
              {/* Botão exclusivo para faturas de Cartão de Crédito */}
              {transaction.category === 'Cartão de Crédito' && (
                <button
                  className={`${styles.actionBtn} ${styles.cardBtn}`}
                  onClick={() => onOpenCardDetails(transaction)}
                  title="Detalhar fatura"
                >
                  <CreditCard size={14} />
                </button>
              )}
              <button className={styles.actionBtn} onClick={() => onEdit(transaction)} title="Editar">
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
