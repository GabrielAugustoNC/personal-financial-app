import type { AppView } from '@/components/Sidebar/Sidebar';
import { WalletWidget } from '@/components/WalletWidget/WalletWidget';
import styles from './Sidebar.module.scss';
import { LayoutDashboard, BarChart2 } from 'lucide-react';

export type { AppView };

interface NavItem {
  label : string;
  view  : AppView;
  icon  : React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', view: 'dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Analytics', view: 'analytics', icon: <BarChart2 size={16} /> },
];

interface SidebarProps {
  activeView   : AppView;
  onViewChange : (view: AppView) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
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
            key={item.view}
            className={`${styles.navItem} ${activeView === item.view ? styles.active : ''}`}
            onClick={() => onViewChange(item.view)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className={styles.walletArea}>
        <WalletWidget />
      </div>

      <div className={styles.footer}>
        <span className={styles.version}>v1.0.0</span>
      </div>
    </aside>
  );
}
