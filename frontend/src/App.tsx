import { useState }  from 'react';
import type { TransactionFilter } from '@/types';
import type { AppView } from '@/components/Sidebar/Sidebar';
import { Sidebar }          from '@/components/Sidebar/Sidebar';
import { Dashboard }        from '@/components/Dashboard/Dashboard';
import { AnalyticsDashboard } from '@/components/Analytics/AnalyticsDashboard';
import styles from './App.module.scss';

export default function App() {
  const [sidebarFilter, setSidebarFilter] = useState<TransactionFilter>({});
  const [activeView, setActiveView]       = useState<AppView>('dashboard');

  function handleViewChange(view: AppView): void {
    setActiveView(view);
    // Ao voltar para o dashboard, limpa o filtro ativo
    if (view === 'dashboard') setSidebarFilter({});
  }

  return (
    <div className={styles.layout}>
      <Sidebar
        activeFilter={sidebarFilter}
        onFilter={setSidebarFilter}
        activeView={activeView}
        onViewChange={handleViewChange}
      />
      <main className={styles.main}>
        {activeView === 'dashboard' && (
          <Dashboard sidebarFilter={sidebarFilter} />
        )}
        {activeView === 'analytics' && (
          <AnalyticsDashboard />
        )}
      </main>
    </div>
  );
}
