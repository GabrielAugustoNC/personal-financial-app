import { useState, useMemo } from 'react';
import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilter,
  TransactionType,
  TransactionSummary,
} from '@/types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types';
import type { Period }          from '@/types/wallet';
import { PERIOD_DAYS }          from '@/types/wallet';
import { useTransactions }      from '@/hooks/useTransactions';
import { useCategories }        from '@/hooks/useCategories';
import { categoryService }      from '@/services/categoryService';
import { transactionService }   from '@/services/transactionService';
import { CardDetailModal }      from '@/components/CardDetailModal/CardDetailModal';
import { SummaryCards }         from '@/components/SummaryCard/SummaryCard';
import { TransactionList }      from '@/components/TransactionList/TransactionList';
import { TransactionForm }      from '@/components/TransactionForm/TransactionForm';
import { PeriodSelector }       from '@/components/PeriodSelector/PeriodSelector';
import { NotificationBanner }   from '@/components/NotificationBanner/NotificationBanner';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatDate } from '@/utils/format';
import styles from './Dashboard.module.scss';
import {
  Plus, SlidersHorizontal, X, RotateCcw,
  ArrowDownCircle, ArrowUpCircle, List,
} from 'lucide-react';

type ModalMode = 'create' | 'edit' | null;

interface QuickFilter {
  label  : string;
  filter : TransactionFilter;
  icon   : React.ReactNode;
  accent : 'default' | 'income' | 'expense';
}

const QUICK_FILTERS: QuickFilter[] = [
  { label: 'Todas',    filter: {},                               icon: <List size={14} />,           accent: 'default' },
  { label: 'Receitas', filter: { type: 'income'  as TransactionType }, icon: <ArrowDownCircle size={14} />, accent: 'income'  },
  { label: 'Despesas', filter: { type: 'expense' as TransactionType }, icon: <ArrowUpCircle size={14} />,  accent: 'expense' },
];

interface FilterDraft {
  type: TransactionType | ''; category: string;
  title: string; start_date: string; end_date: string;
}
const EMPTY_DRAFT: FilterDraft = { type: '', category: '', title: '', start_date: '', end_date: '' };

function draftToFilter(d: FilterDraft): TransactionFilter {
  const f: TransactionFilter = {};
  if (d.type)       f.type       = d.type;
  if (d.category)   f.category   = d.category;
  if (d.title)      f.title      = d.title;
  if (d.start_date) f.start_date = d.start_date;
  if (d.end_date)   f.end_date   = d.end_date;
  return f;
}

function countActiveFilters(d: FilterDraft): number {
  return [d.type, d.category, d.title, d.start_date, d.end_date].filter(Boolean).length;
}

// Retorna o timestamp de corte para o período selecionado.
// Usa PERIOD_DAYS para garantir dias exatos (não meses calendário).
// Exemplo: '1w' → Date de 7 dias atrás às 00:00:00.
function getPeriodCutoff(period: Period): Date {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period]);
  return cutoff;
}

// Filtra o array de transações para incluir apenas as dentro do período selecionado.
// A comparação usa o campo date da transação vs o timestamp de corte calculado.
function filterByPeriod(transactions: Transaction[], period: Period): Transaction[] {
  const cutoff = getPeriodCutoff(period);
  return transactions.filter(t => new Date(t.date) >= cutoff);
}

// Calcula o resumo financeiro (totais e contagem) a partir de um array de transações.
// Usado para recomputar os cards quando o período ou filtro mudar — sem nova chamada à API.
function computeSummary(transactions: Transaction[]): TransactionSummary {
  let totalIncome   = 0;
  let totalExpenses = 0;

  for (const t of transactions) {
    if (t.type === 'income')  totalIncome   += t.amount;
    else                       totalExpenses += t.amount;
  }

  return {
    total_income   : Math.round(totalIncome   * 100) / 100,
    total_expenses : Math.round(totalExpenses * 100) / 100,
    balance        : Math.round((totalIncome - totalExpenses) * 100) / 100,
    count          : transactions.length,
  };
}

export function Dashboard() {
  const {
    transactions, summary,
    createTransaction, updateTransaction, deleteTransaction,
    setFilter, refetch,
  } = useTransactions();

  const [modalMode, setModalMode]     = useState<ModalMode>(null);
  const [editTarget, setEditTarget]   = useState<Transaction | null>(null);
  const [filterOpen, setFilterOpen]   = useState<boolean>(false);
  const [draft, setDraft]             = useState<FilterDraft>(EMPTY_DRAFT);
  const [quickFilter, setQuickFilter] = useState<TransactionFilter>({});
  const [chartPeriod, setChartPeriod]     = useState<Period>('1m');
  const [cardDetailTarget, setCardDetailTarget] = useState<Transaction | null>(null);
  const { categories, expenseCategories, incomeCategories } = useCategories();

  const activeCount = countActiveFilters(draft);

  const categoryOptions =
    draft.type === 'income'  ? INCOME_CATEGORIES  :
    draft.type === 'expense' ? EXPENSE_CATEGORIES :
    [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  // Transações filtradas pelo período selecionado.
  // Recalculado via useMemo para evitar iterações desnecessárias a cada render.
  const periodFiltered = useMemo(
    () => filterByPeriod(transactions.data ?? [], chartPeriod),
    [transactions.data, chartPeriod]
  );

  // Resumo financeiro calculado localmente a partir das transações do período.
  // Substitui o summary da API para que os cards reflitam o filtro de período.
  const periodSummary = useMemo(
    () => computeSummary(periodFiltered),
    [periodFiltered]
  );

  // Dados do gráfico de área preparados a partir das transações filtradas pelo período.
  // Ordenados cronologicamente e limitados a 30 pontos para legibilidade.
  const chartData = useMemo(() => {
    return periodFiltered
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30)
      .map(t => ({
        date    : formatDate(t.date),
        income  : t.type === 'income'  ? t.amount : 0,
        expense : t.type === 'expense' ? t.amount : 0,
      }));
  }, [periodFiltered]);

  // Altera a categoria de uma transação e propaga para transações com título similar (≥50%).
  // Chamado pelo CategoryCell ao confirmar a seleção inline.
  async function handleCategoryChange(transaction: Transaction, newCategory: string): Promise<void> {
    // 1. Atualiza a transação específica via PUT
    await transactionService.update(transaction.id, { category: newCategory });
    // 2. Propaga para transações com título similar no backend
    await categoryService.bulkUpdate({
      reference_title : transaction.title,
      new_category    : newCategory,
    });
    // 3. Recarrega a lista para refletir todas as alterações
    await refetch();
  }

  // Abre o modal de detalhes do cartão para a transação selecionada.
  function handleOpenCardDetails(transaction: Transaction): void {
    setCardDetailTarget(transaction);
  }

  // Ao mudar o período, mantém o filtro de tipo/categoria já aplicado.
  // Os cards e o gráfico atualizam automaticamente via useMemo.
  function handlePeriodChange(period: Period): void {
    setChartPeriod(period);
  }

  function handleQuickFilter(filter: TransactionFilter): void {
    setQuickFilter(filter);
    setDraft(EMPTY_DRAFT);
    setFilterOpen(false);
    setFilter(filter);
  }

  function isQuickActive(filter: TransactionFilter): boolean {
    return JSON.stringify(filter) === JSON.stringify(quickFilter);
  }

  function handleDraftChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void {
    const { name, value } = e.target;
    if (name === 'type') setDraft(prev => ({ ...prev, type: value as TransactionType | '', category: '' }));
    else setDraft(prev => ({ ...prev, [name]: value }));
  }

  function applyFilters(): void {
    setQuickFilter({});
    setFilter(draftToFilter(draft));
    setFilterOpen(false);
  }

  function clearFilters(): void {
    setDraft(EMPTY_DRAFT);
    setQuickFilter({});
    setFilter({});
  }

  function openCreate(): void { setEditTarget(null); setModalMode('create'); }
  function openEdit(t: Transaction): void { setEditTarget(t); setModalMode('edit'); }
  function closeModal(): void { setModalMode(null); setEditTarget(null); }

  async function handleSubmit(input: CreateTransactionInput | UpdateTransactionInput): Promise<void> {
    if (modalMode === 'edit' && editTarget) await updateTransaction(editTarget.id, input as UpdateTransactionInput);
    else await createTransaction(input as CreateTransactionInput);
  }

  // Carregando se o estado de transações ainda não resolveu
  const isLoading = transactions.status === 'loading' || transactions.status === 'idle';

  // Lista unificada de categorias para o select inline da lista de transações
  const allCategoryNames = categories.map(c => c.name);

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>
            {isLoading
              ? 'Carregando...'
              : `${periodSummary.count} transações no período`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.quickFilters}>
            {QUICK_FILTERS.map((q) => (
              <button
                key={q.label}
                className={`${styles.quickBtn} ${styles[`quick-${q.accent}`]} ${isQuickActive(q.filter) ? styles.quickActive : ''}`}
                onClick={() => handleQuickFilter(q.filter)}
              >
                {q.icon}{q.label}
              </button>
            ))}
          </div>
          <div className={styles.divider} />
          <button
            className={`${styles.filterBtn} ${filterOpen ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterOpen(prev => !prev)}
          >
            <SlidersHorizontal size={15} />
            Filtros
            {activeCount > 0 && <span className={styles.filterBadge}>{activeCount}</span>}
          </button>
          <button className={styles.newBtn} onClick={openCreate}>
            <Plus size={16} />Nova Transação
          </button>
        </div>
      </header>

      {/* Alertas de metas e saldo projetado */}
      <NotificationBanner />

      {filterOpen && (
        <div className={`${styles.filterPanel} fade-in`}>
          <div className={styles.filterGrid}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Título</label>
              <input name="title" type="text" className={styles.filterInput} value={draft.title} onChange={handleDraftChange} placeholder="Buscar por título..." />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Tipo</label>
              <select name="type" className={styles.filterSelect} value={draft.type} onChange={handleDraftChange}>
                <option value="">Todos</option>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Categoria</label>
              <select name="category" className={styles.filterSelect} value={draft.category} onChange={handleDraftChange}>
                <option value="">Todas</option>
                {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Data início</label>
              <input name="start_date" type="date" className={styles.filterInput} value={draft.start_date} onChange={handleDraftChange} />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Data fim</label>
              <input name="end_date" type="date" className={styles.filterInput} value={draft.end_date} onChange={handleDraftChange} />
            </div>
          </div>
          <div className={styles.filterActions}>
            <button className={styles.clearBtn} onClick={clearFilters}><RotateCcw size={13} />Limpar filtros</button>
            <div className={styles.filterActionsRight}>
              <button className={styles.cancelFilterBtn} onClick={() => setFilterOpen(false)}><X size={14} />Fechar</button>
              <button className={styles.applyBtn} onClick={applyFilters}>Aplicar</button>
            </div>
          </div>
        </div>
      )}

      {/* Cards com resumo do período selecionado — não o total global */}
      <SummaryCards
        summary={isLoading ? null : periodSummary}
        isLoading={isLoading}
      />

      {/* Gráfico com seletor de período */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h2 className={styles.sectionTitle}>Histórico do período</h2>
          <PeriodSelector value={chartPeriod} onChange={handlePeriodChange} />
        </div>
        {chartData.length > 0 ? (
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
              <XAxis dataKey="date" tick={{ fill: '#8888AA', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fill: '#8888AA', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: '#111120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#EEEEFF', fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="income"  name="Receita" stroke="#00D9A3" strokeWidth={2} fill="url(#gradIncome)" />
              <Area type="monotone" dataKey="expense" name="Despesa" stroke="#FF5B7F" strokeWidth={2} fill="url(#gradExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className={styles.emptyChart}>Sem transações nos últimos {PERIOD_DAYS[chartPeriod]} dias.</p>
        )}
      </div>

      <div className={styles.listCard}>
        <div className={styles.listHeader}>
          <h2 className={styles.sectionTitle}>Transações</h2>
          <span className={styles.count}>{periodFiltered.length} itens</span>
        </div>
        <TransactionList
          transactions={periodFiltered}
          isLoading={isLoading}
          categories={allCategoryNames}
          onEdit={openEdit}
          onDelete={deleteTransaction}
          onCategoryChange={handleCategoryChange}
          onOpenCardDetails={handleOpenCardDetails}
        />
      </div>

      {modalMode && (
        <TransactionForm
          onSubmit={handleSubmit}
          onClose={closeModal}
          onRefetch={refetch}
          editData={editTarget}
        />
      )}

      {/* Modal de detalhes do cartão de crédito */}
      {cardDetailTarget && (
        <CardDetailModal
          transaction={cardDetailTarget}
          onClose={() => setCardDetailTarget(null)}
        />
      )}
    </div>
  );
}
