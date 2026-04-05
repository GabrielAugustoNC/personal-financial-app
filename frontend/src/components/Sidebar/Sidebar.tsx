// ============================================================
// Sidebar — menu lateral de navegação principal da aplicação.
// Contém apenas dois destinos: Dashboard e Analytics.
// Os filtros de tipo (Receitas/Despesas) foram movidos para dentro do Dashboard.
// Inclui o WalletWidget na base para exibição permanente do saldo.
// ============================================================

import type { AppView } from '@/components/Sidebar/Sidebar';
import { WalletWidget } from '@/components/WalletWidget/WalletWidget';
import styles from './Sidebar.module.scss';
import { LayoutDashboard, BarChart2 } from 'lucide-react';

// AppView define as telas disponíveis na aplicação.
// Exportado daqui pois é o ponto central de navegação.
export type AppView = 'dashboard' | 'analytics';

// NavItem define a estrutura de cada item de navegação da sidebar.
interface NavItem {
  label : string;       // Texto exibido no botão
  view  : AppView;      // Tela para a qual o item navega
  icon  : React.ReactNode; // Ícone Lucide associado ao item
}

// Lista de itens de navegação — extensível para novas telas no futuro.
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', view: 'dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Analytics', view: 'analytics', icon: <BarChart2 size={16} /> },
];

// Props da Sidebar:
// - activeView: tela atualmente ativa (controlada pelo App)
// - onViewChange: callback para navegar entre telas
interface SidebarProps {
  activeView   : AppView;
  onViewChange : (view: AppView) => void;
}

// Sidebar é um componente controlado — não mantém estado de navegação interno.
// O App.tsx controla qual tela está ativa e passa via props.
// Analogia Angular: componente de navegação com [routerLink] e [routerLinkActive]
export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      {/* Logo da aplicação */}
      <div className={styles.logo}>
        <span className={styles.logoIcon}>₿</span>
        <span className={styles.logoText}>Finanças</span>
      </div>

      {/* Itens de navegação — ativo é destacado com estilo diferente */}
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

      {/* WalletWidget fixo na base — visível em todas as telas */}
      <div className={styles.walletArea}>
        <WalletWidget />
      </div>

      {/* Versão da aplicação exibida no rodapé */}
      <div className={styles.footer}>
        <span className={styles.version}>v1.0.0</span>
      </div>
    </aside>
  );
}
