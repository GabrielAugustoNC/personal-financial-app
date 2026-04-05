// ============================================================
// TransactionList — lista de transações com skeleton, estado vazio e ações.
// Cada linha exibe título, categoria, data, valor formatado e botões de editar/excluir.
// Os botões de ação ficam ocultos e aparecem apenas no hover da linha.
// ============================================================

import type { Transaction } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import styles from './TransactionList.module.scss';
import { Trash2, Pencil } from 'lucide-react';

// Props da lista de transações:
// - transactions: array de transações a exibir
// - isLoading: ativa o skeleton durante carregamento
// - onEdit: callback chamado ao clicar em editar (abre modal com dados pré-preenchidos)
// - onDelete: callback chamado ao clicar em excluir (remove via API e recarrega)
interface TransactionListProps {
  transactions : Transaction[];
  isLoading    : boolean;
  onEdit       : (transaction: Transaction) => void;
  onDelete     : (id: string) => void;
}

// SkeletonRow exibe uma linha placeholder animada durante o carregamento.
// Mantém a proporção da linha real para evitar layout shift.
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

// TransactionList renderiza o estado correto para cada situação:
// 1. Carregando → 5 linhas skeleton
// 2. Lista vazia → mensagem orientativa
// 3. Com dados → linhas interativas com ações de editar e excluir
export function TransactionList({ transactions, isLoading, onEdit, onDelete }: TransactionListProps) {
  // Estado de carregamento: exibe 5 skeletons
  if (isLoading) {
    return (
      <div className={styles.container}>
        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  // Estado vazio: orienta o usuário a criar a primeira transação
  if (transactions.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📭</span>
        <p className={styles.emptyTitle}>Nenhuma transação encontrada</p>
        <p className={styles.emptySubtitle}>Adicione sua primeira transação clicando em "Nova Transação"</p>
      </div>
    );
  }

  // Estado com dados: lista com scroll limitado e ações por linha
  return (
    <div className={`${styles.container} scrollable`}>
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className={`${styles.row} ${styles[transaction.type]} fade-in`}
        >
          {/* Indicador colorido: verde para receita, vermelho para despesa */}
          <div className={styles.dot} />

          {/* Informações principais da transação */}
          <div className={styles.info}>
            <span className={styles.title}>{transaction.title}</span>
            <div className={styles.meta}>
              <span className={styles.category}>{transaction.category}</span>
              <span className={styles.sep}>·</span>
              <span className={styles.date}>{formatDate(transaction.date)}</span>
              {/* Descrição opcional — exibida apenas quando preenchida */}
              {transaction.description && (
                <>
                  <span className={styles.sep}>·</span>
                  <span className={styles.description}>{transaction.description}</span>
                </>
              )}
            </div>
          </div>

          {/* Valor e botões de ação — ações visíveis apenas no hover */}
          <div className={styles.right}>
            <span className={`${styles.amount} mono`}>
              {/* Prefixo − para despesas e + para receitas */}
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
