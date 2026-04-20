// ============================================================
// Sidebar — menu lateral de navegação principal da aplicação.
// Contém Dashboard, Analytics e Configurações.
// Inclui o WalletWidget, toggle de tema e rodapé com logout.
// ============================================================

import { WalletWidget } from '@/components/WalletWidget/WalletWidget';
import { useTheme }     from '@/hooks/useTheme';
import styles from './Sidebar.module.scss';
import { LayoutDashboard, BarChart2, Settings, LogOut, Moon, Sun } from 'lucide-react';

// AppView define as telas disponíveis na aplicação.
// Exportado daqui pois é o ponto central de navegação.
export type AppView = 'dashboard' | 'analytics' | 'settings';

// NavItem define a estrutura de cada item de navegação da sidebar.
interface NavItem {
  label : string;
  view  : AppView;
  icon  : React.ReactNode;
}

// Lista de itens de navegação — extensível para novas telas.
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     view: 'dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Analytics',     view: 'analytics', icon: <BarChart2 size={16} /> },
  { label: 'Configurações', view: 'settings',  icon: <Settings size={16} /> },
];

// ThemeToggle — botão de alternância entre tema dark e light.
// Usa o hook useTheme para ler o tema atual e aplicar a troca.
function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      className={styles.themeToggle}
      onClick={toggle}
      title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
    >
      {isDark
        ? <><Sun  size={14} /><span>Tema claro</span></>
        : <><Moon size={14} /><span>Tema escuro</span></>}
    </button>
  );
}

// Props da Sidebar
interface SidebarProps {
  activeView   : AppView;
  onViewChange : (view: AppView) => void;
  userName     : string;
  onLogout     : () => void;
}

// Sidebar é um componente controlado — o App.tsx gerencia qual tela está ativa.
// Analogia Angular: componente de navegação com [routerLink] e [routerLinkActive].
export function Sidebar({ activeView, onViewChange, userName, onLogout }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <span className={styles.logoIcon}>₿</span>
        <span className={styles.logoText}>Finanças</span>
      </div>

      {/* Navegação principal */}
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

      {/* WalletWidget — saldo manual sempre visível */}
      <div className={styles.walletArea}>
        <WalletWidget />
      </div>

      {/* Toggle de tema */}
      <ThemeToggle />

      {/* Rodapé com usuário e logout */}
      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.version}>v1.0.0</span>
        </div>
        <button className={styles.logoutBtn} onClick={onLogout} title="Sair">
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
