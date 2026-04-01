import { useState }  from 'react';
import type { TransactionFilter } from '@/types';
import { Sidebar }   from '@/components/Sidebar/Sidebar';
import { Dashboard } from '@/components/Dashboard/Dashboard';
import styles        from './App.module.scss';

export default function App() {
  const [sidebarFilter, setSidebarFilter] = useState<TransactionFilter>({});

  return (
    <div className={styles.layout}>
      <Sidebar activeFilter={sidebarFilter} onFilter={setSidebarFilter} />
      <main className={styles.main}>
        {/* Passa o filtro do sidebar para o Dashboard aplicar */}
        <Dashboard sidebarFilter={sidebarFilter} />
      </main>
    </div>
  );
}
