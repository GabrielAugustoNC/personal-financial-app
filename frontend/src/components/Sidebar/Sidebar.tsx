import type { TransactionFilter, TransactionType } from '@/types';
import styles from './Sidebar.module.scss';
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, List, BarChart2 } from 'lucide-react';

export type AppView = 'dashboard' | 'analytics';

interface SidebarProps {
  activeFilter  : TransactionFilter;
  onFilter      : (filter: TransactionFilter) => void;
  activeView    : AppView;
  onViewChange  : (view: AppView) => void;
}

interface NavItem {
  label  : string;
  filter : TransactionFilter;
  icon   : React.ReactNode;
  accent : 'default' | 'income' | 'expense';
}

const NAV_ITEMS: NavItem[] = [
  {
    label  : 'Visão Geral',
    filter : {},
    icon   : <LayoutDashboard size={16} />,
    accent : 'default',
  },
  {
    label  : 'Receitas',
    filter : { type: 'income' as TransactionType },
    icon   : <ArrowDownCircle size={16} />,
    accent : 'income',
  },
  {
    label  : 'Despesas',
    filter : { type: 'expense' as TransactionType },
    icon   : <ArrowUpCircle size={16} />,
    accent : 'expense',
  },
  {
    label  : 'Todas',
    filter : {},
    icon   : <List size={16} />,
    accent : 'default',
  },
];

export function Sidebar({ activeFilter, onFilter, activeView, onViewChange }: SidebarProps) {
  const isActive = (filter: TransactionFilter): boolean =>
    JSON.stringify(filter) === JSON.stringify(activeFilter);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>₿</span>
        <span className={styles.logoText}>Finanças</span>
      </div>

      <nav className={styles.nav}>
        <span className={styles.navLabel}>Menu</span>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            className={`${styles.navItem} ${styles[`accent-${item.accent}`]} ${isActive(item.filter) ? styles.active : ''}`}
            onClick={() => onFilter(item.filter)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className={styles.viewSection}>
        <span className={styles.navLabel}>Análises</span>
        <button
          className={`${styles.navItem} ${activeView === 'analytics' ? styles.active : ''}`}
          onClick={() => onViewChange('analytics')}
        >
          <span className={styles.navIcon}><BarChart2 size={16} /></span>
          Analytics
        </button>
      </div>

      <div className={styles.footer}>
        <span className={styles.version}>v1.0.0</span>
      </div>
    </aside>
  );
}
