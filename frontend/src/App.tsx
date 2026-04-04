import { useState }  from 'react';
import type { AppView } from '@/components/Sidebar/Sidebar';
import { Sidebar }          from '@/components/Sidebar/Sidebar';
import { Dashboard }        from '@/components/Dashboard/Dashboard';
import { AnalyticsDashboard } from '@/components/Analytics/AnalyticsDashboard';
import styles from './App.module.scss';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('dashboard');

  return (
    <div className={styles.layout}>
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <main className={styles.main}>
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'analytics' && <AnalyticsDashboard />}
      </main>
    </div>
  );
}
