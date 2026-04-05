import { useAnalytics } from '@/hooks/useAnalytics';
import type {
  AttentionPoint,
  BalanceProjection,
  CategoryBreakdown,
  MonthlyEvolution,
  TransactionComparison,
} from '@/types/analytics';
import { formatCurrency } from '@/utils/format';
import styles from './AnalyticsDashboard.module.scss';
import { PeriodSelector } from '@/components/PeriodSelector/PeriodSelector';
import { PERIOD_OPTIONS } from '@/types/wallet';
import {
  BarChart, Bar, Cell,
  PieChart, Pie, Tooltip as PieTooltip,
  ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend,
  RadialBarChart, RadialBar,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus,
  AlertTriangle, AlertCircle, Info,
  ArrowUpRight, ArrowDownRight,
  Sparkles,
} from 'lucide-react';

// ---- Paleta de cores para gráficos ----
const CATEGORY_COLORS = [
  '#7C6AF7', '#00D9A3', '#FF5B7F', '#60A5FA',
  '#F59E0B', '#EC4899', '#10B981', '#8B5CF6',
  '#F97316', '#06B6D4',
];

// ---- Helpers ----
function trendIcon(trend: TransactionComparison['trend'], type: string) {
  if (trend === 'stable') return <Minus size={14} />;
  // Para receitas: up é bom; para despesas: up é ruim
  const isGood = (type === 'income' && trend === 'up') || (type === 'expense' && trend === 'down');
  return isGood
    ? <ArrowDownRight size={14} />
    : <ArrowUpRight size={14} />;
}

function trendClass(trend: TransactionComparison['trend'], type: string): string {
  if (trend === 'stable') return styles.trendStable;
  const isGood = (type === 'income' && trend === 'up') || (type === 'expense' && trend === 'down');
  return isGood ? styles.trendGood : styles.trendBad;
}

function levelIcon(level: AttentionPoint['level']) {
  switch (level) {
    case 'critical': return <AlertCircle size={15} />;
    case 'high':     return <AlertTriangle size={15} />;
    default:         return <Info size={15} />;
  }
}

// ---- Subcomponentes ----

function ProjectionCard({ proj }: { proj: BalanceProjection }) {
  const isPositive = proj.trend === 'positive';
  const isNegative = proj.trend === 'negative';

  return (
    <div className={`${styles.projCard} ${isNegative ? styles.projNegative : isPositive ? styles.projPositive : ''}`}>
      <div className={styles.projHeader}>
        <div>
          <span className={styles.sectionLabel}>Projeção — próximo mês</span>
          <p className={styles.projSubtitle}>Baseada na média dos últimos 3 meses</p>
        </div>
        <Sparkles size={18} className={styles.projIcon} />
      </div>

      <div className={styles.projBalance}>
        <span className={`${styles.projValue} mono ${isNegative ? styles.valueNegative : styles.valuePositive}`}>
          {formatCurrency(proj.estimated_balance)}
        </span>
        {proj.trend_pct !== 0 && (
          <span className={`${styles.projTrendBadge} ${isNegative ? styles.badgeNegative : styles.badgePositive}`}>
            {isNegative ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
            {Math.abs(proj.trend_pct)}%
          </span>
        )}
      </div>

      <div className={styles.projBreakdown}>
        <div className={styles.projItem}>
          <span className={styles.projItemLabel}>Receita estimada</span>
          <span className={`${styles.projItemValue} mono ${styles.incomeText}`}>
            {formatCurrency(proj.estimated_income)}
          </span>
        </div>
        <div className={styles.projDivider} />
        <div className={styles.projItem}>
          <span className={styles.projItemLabel}>Despesa estimada</span>
          <span className={`${styles.projItemValue} mono ${styles.expenseText}`}>
            {formatCurrency(proj.estimated_expenses)}
          </span>
        </div>
      </div>
    </div>
  );
}

function AttentionList({ points }: { points: AttentionPoint[] }) {
  if (points.length === 0) return null;
  return (
    <div className={styles.attentionCard}>
      <span className={styles.sectionLabel}>Pontos de atenção</span>
      <div className={styles.attentionList}>
        {points.map((p, i) => (
          <div key={i} className={`${styles.attentionItem} ${styles[`level-${p.level}`]}`}>
            <span className={`${styles.attentionIcon} ${styles[`icon-${p.level}`]}`}>
              {levelIcon(p.level)}
            </span>
            <div className={styles.attentionInfo}>
              <span className={styles.attentionTitle}>{p.title}</span>
              <span className={styles.attentionCategory}>{p.category}</span>
            </div>
            <div className={styles.attentionRight}>
              <span className={`${styles.attentionAmount} mono`}>
                {formatCurrency(p.amount)}
              </span>
              {p.change !== 0 && (
                <span className={`${styles.attentionChange} ${p.change > 0 ? styles.changeUp : styles.changeDown}`}>
                  {p.change > 0 ? '+' : ''}{p.change}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonTable({ items }: { items: TransactionComparison[] }) {
  const expenses = items.filter(i => i.type === 'expense');
  const incomes  = items.filter(i => i.type === 'income');

  function renderGroup(list: TransactionComparison[], label: string) {
    if (list.length === 0) return null;
    return (
      <div className={styles.compareGroup}>
        <span className={styles.compareGroupLabel}>{label}</span>
        {list.map((item, i) => (
          <div key={i} className={styles.compareRow}>
            <div className={styles.compareInfo}>
              <span className={styles.compareTitle}>{item.title}</span>
              <span className={styles.compareCategory}>{item.category}</span>
            </div>
            <div className={styles.compareValues}>
              <span className={styles.compareMonth}>
                <span className={styles.compareMonthLabel}>Mês ant.</span>
                <span className={`mono ${styles.comparePrev}`}>
                  {item.last_month > 0 ? formatCurrency(item.last_month) : '—'}
                </span>
              </span>
              <span className={styles.compareArrow}>→</span>
              <span className={styles.compareMonth}>
                <span className={styles.compareMonthLabel}>Este mês</span>
                <span className={`mono ${styles.compareCurrent}`}>
                  {item.current_month > 0 ? formatCurrency(item.current_month) : '—'}
                </span>
              </span>
              <span className={`${styles.compareBadge} ${trendClass(item.trend, item.type)}`}>
                {trendIcon(item.trend, item.type)}
                {item.diff_pct !== 0 ? `${item.diff_pct > 0 ? '+' : ''}${item.diff_pct}%` : 'Estável'}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.compareCard}>
      <span className={styles.sectionLabel}>Comparativo vs mês anterior</span>
      <div className={`${styles.compareList} scrollable`}>
        {renderGroup(expenses, 'Despesas')}
        {renderGroup(incomes, 'Receitas')}
        {items.length === 0 && (
          <p className={styles.emptyMsg}>Sem dados comparativos ainda — são necessários dados de pelo menos 2 meses.</p>
        )}
      </div>
    </div>
  );
}

// ---- Componente principal ----

export function AnalyticsDashboard() {
  const { overview, period, setPeriod } = useAnalytics();
  const data = overview.data;
  const isLoading = overview.status === 'loading' || overview.status === 'idle';

  if (isLoading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loadingGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.skeletonBlock}`} style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (overview.status === 'error') {
    return (
      <div className={styles.dashboard}>
        <div className={styles.errorState}>
          <AlertCircle size={28} />
          <p>{overview.error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Filtra meses sem dados (segunda linha de defesa — o backend já filtra,
  // mas garantimos aqui caso algum mês zerado passe pela aggregation)
  const activeEvolution = data.monthly_evolution.filter(
    m => m.income > 0 || m.expenses > 0
  );

  // Rótulo legível do período atual para exibir no subtítulo
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label ?? period;

  // Prepara dados do donut (top 6 categorias + "Outros")
  const donutData = (() => {
    const top = data.category_breakdown.slice(0, 6);
    const rest = data.category_breakdown.slice(6);
    if (rest.length === 0) return top;
    const othersAmount = rest.reduce((s, c) => s + c.amount, 0);
    const othersCount  = rest.reduce((s, c) => s + c.count, 0);
    return [...top, { category: 'Outros', amount: othersAmount, percentage: 0, count: othersCount }];
  })();

  // Radial bar — savings rate por mês
  const radialData = activeEvolution.map(m => ({
    name     : m.month,
    rate     : m.income > 0 ? Math.round(Math.max(0, ((m.income - m.expenses) / m.income) * 100)) : 0,
  }));

  // Tooltip para gráficos monetários (barras e linha).
  // Formata todos os valores como moeda — usado no BarChart e LineChart.
  const customTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className={styles.tooltip}>
        {payload.map((p, i) => (
          <div key={i} className={styles.tooltipRow}>
            <span>{p.name}</span>
            <span className="mono">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  // Tooltip para o gráfico radial de taxa de poupança.
  // Formata o valor como percentual — dataKey="rate" sempre é 0-100%.
  const radialTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className={styles.tooltip}>
        {payload.map((p, i) => (
          <div key={i} className={styles.tooltipRow}>
            <span>{p.name}</span>
            <span className="mono">{p.value}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Analytics</h1>
          <p className={styles.pageSubtitle}>Exibindo dados dos últimos {periodLabel} · meses sem dados são ignorados</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </header>

      {/* Grid principal */}
      <div className={styles.grid}>

        {/* Projeção — destaque */}
        <div className={styles.spanFull}>
          <ProjectionCard proj={data.projection} />
        </div>

        {/* Gráfico de barras — evolução mensal */}
        <div className={`${styles.card} ${styles.span2}`}>
          <span className={styles.sectionLabel}>Evolução mensal</span>
          {activeEvolution.length === 0 && <p className={styles.emptyMsg}>Sem dados no período selecionado.</p>}
          {activeEvolution.length > 0 && <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activeEvolution} barGap={4} barCategoryGap="28%">
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#8888AA', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: '#8888AA', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={customTooltip as React.FC} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#8888AA', paddingTop: 8 }} />
              <Bar dataKey="income"   name="Receitas" fill="#00D9A3" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Despesas" fill="#FF5B7F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>}
        </div>

        {/* Donut — categorias de despesa */}
        <div className={`${styles.card} ${styles.span1}`}>
          <span className={styles.sectionLabel}>Despesas por categoria</span>
          {donutData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%" cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <PieTooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    contentStyle={{ background: '#111120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.donutLegend}>
                {donutData.map((c, i) => (
                  <div key={i} className={styles.donutLegendItem}>
                    <span className={styles.donutDot} style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className={styles.donutLabel}>{c.category}</span>
                    <span className={`${styles.donutPct} mono`}>{c.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className={styles.emptyMsg}>Sem despesas neste mês.</p>
          )}
        </div>

        {/* Linha — saldo mensal */}
        <div className={`${styles.card} ${styles.span2}`}>
          <span className={styles.sectionLabel}>Saldo mês a mês</span>
          {activeEvolution.length === 0 && <p className={styles.emptyMsg}>Sem dados no período selecionado.</p>}
          {activeEvolution.length > 0 && <ResponsiveContainer width="100%" height={180}>
            <LineChart data={activeEvolution}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#8888AA', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: '#8888AA', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={customTooltip as React.FC} />
              <Line
                type="monotone" dataKey="balance" name="Saldo"
                stroke="#7C6AF7" strokeWidth={2.5}
                dot={{ fill: '#7C6AF7', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>}
        </div>

        {/* Radial — savings rate */}
        <div className={`${styles.card} ${styles.span1}`}>
          <span className={styles.sectionLabel}>Taxa de poupança (%)</span>
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart
              cx="50%" cy="50%"
              innerRadius={20} outerRadius={80}
              data={radialData}
              startAngle={90} endAngle={-270}
            >
              <RadialBar
                dataKey="rate"
                cornerRadius={6}
                background={{ fill: 'rgba(255,255,255,0.04)' }}
                label={{ position: 'insideStart', fill: '#8888AA', fontSize: 10 }}
              >
                {radialData.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </RadialBar>
              <PieTooltip content={radialTooltip as React.FC} />
              <Legend
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: '#8888AA' }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        {/* Pontos de atenção */}
        <div className={styles.span2}>
          <AttentionList points={data.attention_points} />
        </div>

        {/* Comparativo vs mês anterior */}
        <div className={styles.spanFull}>
          <ComparisonTable items={data.month_comparison} />
        </div>

      </div>
    </div>
  );
}
