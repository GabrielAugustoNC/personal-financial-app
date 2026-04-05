// ============================================================
// App — componente raiz da aplicação.
// Gerencia o estado de navegação entre as duas telas disponíveis:
// Dashboard (padrão) e Analytics.
// Renderiza a Sidebar permanente e a tela ativa no conteúdo principal.
// Analogia Angular: AppComponent com RouterOutlet e navegação via serviço
// ============================================================

import { useState }  from 'react';
import type { AppView } from '@/components/Sidebar/Sidebar';
import { Sidebar }          from '@/components/Sidebar/Sidebar';
import { Dashboard }        from '@/components/Dashboard/Dashboard';
import { AnalyticsDashboard } from '@/components/Analytics/AnalyticsDashboard';
import styles from './App.module.scss';

// App é o componente de nível mais alto (root component).
// Mantém apenas o estado de navegação — toda lógica de negócio vive nos hooks.
export default function App() {
  // activeView controla qual tela está sendo exibida no conteúdo principal
  const [activeView, setActiveView] = useState<AppView>('dashboard');

  return (
    <div className={styles.layout}>
      {/* Sidebar permanente — visível em todas as telas */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Conteúdo principal — renderiza condicionalmente a tela ativa */}
      <main className={styles.main}>
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'analytics' && <AnalyticsDashboard />}
      </main>
    </div>
  );
}
