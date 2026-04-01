import { useState, useEffect } from 'react';
import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilter,
  TransactionType,
} from '@/types';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '@/types';
import { useTransactions }  from '@/hooks/useTransactions';
import { SummaryCards }     from '@/components/SummaryCard/SummaryCard';
import { TransactionList }  from '@/components/TransactionList/TransactionList';
import { TransactionForm }  from '@/components/TransactionForm/TransactionForm';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatDate } from '@/utils/format';
import styles from './Dashboard.module.scss';
import { Plus, SlidersHorizontal, X, RotateCcw } from 'lucide-react';

type ModalMode = 'create' | 'edit' | null;

interface DashboardProps {
  sidebarFilter: TransactionFilter;
}

// Estado local do painel de filtros (rascunho antes de aplicar)
interface FilterDraft {
  type       : TransactionType | '';
  category   : string;
  title      : string;
  start_date : string;
  end_date   : string;
}

const EMPTY_DRAFT: FilterDraft = {
  type       : '',
  category   : '',
  title      : '',
  start_date : '',
  end_date   : '',
};

// Converte o rascunho local para o TransactionFilter da API (omite campos vazios)
function draftToFilter(draft: FilterDraft): TransactionFilter {
  const filter: TransactionFilter = {};
  if (draft.type)       filter.type       = draft.type;
  if (draft.category)   filter.category   = draft.category;
  if (draft.title)      filter.title      = draft.title;
  if (draft.start_date) filter.start_date = draft.start_date;
  if (draft.end_date)   filter.end_date   = draft.end_date;
  return filter;
}

// Conta quantos filtros estão ativos para exibir o badge
function countActiveFilters(draft: FilterDraft): number {
  return [draft.type, draft.category, draft.title, draft.start_date, draft.end_date]
    .filter(Boolean).length;
}

export function Dashboard({ sidebarFilter }: DashboardProps) {
  const {
    transactions,
    summary,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    setFilter,
    refetch,
  } = useTransactions();

  const [modalMode, setModalMode]   = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [draft, setDraft]           = useState<FilterDraft>(EMPTY_DRAFT);

  // Sincroniza o filtro do Sidebar com o hook de transações.
  // Quando o usuário clica em "Receitas" ou "Despesas" na sidebar,
  // o Dashboard aplica automaticamente o filtro e limpa o painel local.
  useEffect(() => {
    setFilter(sidebarFilter);
    setDraft(EMPTY_DRAFT);
    setFilterOpen(false);
  }, [sidebarFilter, setFilter]);

  // Categorias disponíveis dependem do tipo selecionado no filtro
  const categoryOptions =
    draft.type === 'income'  ? INCOME_CATEGORIES  :
    draft.type === 'expense' ? EXPENSE_CATEGORIES :
    [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  const activeCount = countActiveFilters(draft);

  function handleDraftChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void {
    const { name, value } = e.target;
    if (name === 'type') {
      setDraft(prev => ({ ...prev, type: value as TransactionType | '', category: '' }));
    } else {
      setDraft(prev => ({ ...prev, [name]: value }));
    }
  }

  function applyFilters(): void {
    setFilter(draftToFilter(draft));
    setFilterOpen(false);
  }

  function clearFilters(): void {
    setDraft(EMPTY_DRAFT);
    setFilter({});
  }

  function openCreate(): void {
    setEditTarget(null);
    setModalMode('create');
  }

  function openEdit(transaction: Transaction): void {
    setEditTarget(transaction);
    setModalMode('edit');
  }

  function closeModal(): void {
    setModalMode(null);
    setEditTarget(null);
  }

  async function handleSubmit(
    input: CreateTransactionInput | UpdateTransactionInput
  ): Promise<void> {
    if (modalMode === 'edit' && editTarget) {
      await updateTransaction(editTarget.id, input as UpdateTransactionInput);
    } else {
      await createTransaction(input as CreateTransactionInput);
    }
  }

  const chartData = (transactions.data ?? [])
    .slice(0, 14)
    .reverse()
    .map((t) => ({
      date    : formatDate(t.date),
      receita : t.type === 'income'  ? t.amount : 0,
      despesa : t.type === 'expense' ? t.amount : 0,
    }));

  const isLoading = transactions.status === 'loading';

  return (
    <div className={styles.dashboard}>

      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>
            {summary.data
              ? `${summary.data.count} transações registradas`
              : 'Carregando...'}
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={`${styles.filterBtn} ${filterOpen ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterOpen(prev => !prev)}
          >
            <SlidersHorizontal size={15} />
            Filtros
            {activeCount > 0 && (
              <span className={styles.filterBadge}>{activeCount}</span>
            )}
          </button>

          <button className={styles.newBtn} onClick={openCreate}>
            <Plus size={16} />
            Nova Transação
          </button>
        </div>
      </header>

      {/* Painel de Filtros */}
      {filterOpen && (
        <div className={`${styles.filterPanel} fade-in`}>
          <div className={styles.filterGrid}>

            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Título</label>
              <input
                name="title"
                type="text"
                className={styles.filterInput}
                value={draft.title}
                onChange={handleDraftChange}
                placeholder="Buscar por título..."
              />
            </div>

            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Tipo</label>
              <select
                name="type"
                className={styles.filterSelect}
                value={draft.type}
                onChange={handleDraftChange}
              >
                <option value="">Todos</option>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>

            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Categoria</label>
              <select
                name="category"
                className={styles.filterSelect}
                value={draft.category}
                onChange={handleDraftChange}
              >
                <option value="">Todas</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Data início</label>
              <input
                name="start_date"
                type="date"
                className={styles.filterInput}
                value={draft.start_date}
                onChange={handleDraftChange}
              />
            </div>

            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Data fim</label>
              <input
                name="end_date"
                type="date"
                className={styles.filterInput}
                value={draft.end_date}
                onChange={handleDraftChange}
              />
            </div>
          </div>

          <div className={styles.filterActions}>
            <button className={styles.clearBtn} onClick={clearFilters}>
              <RotateCcw size={13} />
              Limpar filtros
            </button>
            <div className={styles.filterActionsRight}>
              <button
                className={styles.cancelFilterBtn}
                onClick={() => setFilterOpen(false)}
              >
                <X size={14} />
                Fechar
              </button>
              <button className={styles.applyBtn} onClick={applyFilters}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards de resumo */}
      <SummaryCards
        summary={summary.data}
        isLoading={summary.status === 'loading'}
      />

      {/* Gráfico */}
      {chartData.length > 0 && (
        <div className={styles.chartCard}>
          <h2 className={styles.sectionTitle}>Histórico recente</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00D9A3" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00D9A3" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FF5B7F" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FF5B7F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#8888AA', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatCurrency(v)}
                tick={{ fill: '#8888AA', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background   : '#111120',
                  border       : '1px solid rgba(255,255,255,0.1)',
                  borderRadius : 10,
                  color        : '#EEEEFF',
                  fontSize     : 12,
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Area type="monotone" dataKey="receita" stroke="#00D9A3" strokeWidth={2} fill="url(#gradIncome)"  />
              <Area type="monotone" dataKey="despesa" stroke="#FF5B7F" strokeWidth={2} fill="url(#gradExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lista */}
      <div className={styles.listCard}>
        <div className={styles.listHeader}>
          <h2 className={styles.sectionTitle}>Transações</h2>
          <span className={styles.count}>
            {transactions.data?.length ?? 0} itens
          </span>
        </div>

        <TransactionList
          transactions={transactions.data ?? []}
          isLoading={isLoading}
          onEdit={openEdit}
          onDelete={deleteTransaction}
        />
      </div>

      {/* Modal */}
      {modalMode && (
        <TransactionForm
          onSubmit={handleSubmit}
          onClose={closeModal}
          onRefetch={refetch}
          editData={editTarget}
        />
      )}
    </div>
  );
}
