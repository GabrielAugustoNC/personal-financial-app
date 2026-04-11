// ============================================================
// App — componente raiz da aplicação.
// Envolve tudo com AuthProvider e exibe o LoginPage quando não autenticado.
// Quando autenticado, exibe a layout com Sidebar e as telas principais.
// ============================================================

import { useState }  from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import type { AppView } from '@/components/Sidebar/Sidebar';
import { Sidebar }           from '@/components/Sidebar/Sidebar';
import { Dashboard }         from '@/components/Dashboard/Dashboard';
import { AnalyticsDashboard } from '@/components/Analytics/AnalyticsDashboard';
import { LoginPage }         from '@/pages/LoginPage';
import styles from './App.module.scss';

// AppContent é o conteúdo real — separado do App para poder usar o hook useAuth
// (que requer estar dentro do AuthProvider).
function AppContent() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [activeView, setActiveView] = useState<AppView>('dashboard');

  // Exibe um loading mínimo enquanto restaura a sessão do localStorage
  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadingIcon}>₿</span>
      </div>
    );
  }

  // Usuário não autenticado → exibe tela de login/registro
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Usuário autenticado → exibe a aplicação completa
  return (
    <div className={styles.layout}>
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        userName={user?.name ?? ''}
        onLogout={logout}
      />
      <main className={styles.main}>
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'analytics' && <AnalyticsDashboard />}
      </main>
    </div>
  );
}

// App envolve tudo com AuthProvider — disponibiliza o contexto de auth
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
