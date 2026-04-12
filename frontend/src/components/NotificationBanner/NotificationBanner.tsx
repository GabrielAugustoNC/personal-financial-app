// ============================================================
// NotificationBanner — exibe alertas contextuais no topo do Dashboard.
// Monitora metas próximas do limite e saldo projetado negativo.
// Fechável individualmente — estado persiste na sessão via useState.
// ============================================================

import { useEffect, useState } from 'react';
import { useGoals }     from '@/hooks/useGoals';
import { analyticsService } from '@/services/analyticsService';
import { formatCurrency } from '@/utils/format';
import styles from './NotificationBanner.module.scss';
import { AlertTriangle, AlertCircle, TrendingDown, X, Bell } from 'lucide-react';

type NotifLevel = 'critical' | 'warning' | 'info';

interface Notification {
  id     : string;
  level  : NotifLevel;
  title  : string;
  message: string;
  icon   : React.ReactNode;
}

export function NotificationBanner() {
  const { goals } = useGoals();
  const [dismissed, setDismissed]   = useState<Set<string>>(new Set());
  const [projBalance, setProjBalance] = useState<number | null>(null);
  const [collapsed, setCollapsed]   = useState<boolean>(false);

  // Busca a projeção de saldo para notificar se for negativa
  useEffect(() => {
    analyticsService.getOverview(3)
      .then(data => setProjBalance(data.projection.estimated_balance))
      .catch(() => {});
  }, []);

  // Constrói a lista de notificações a partir de metas e projeção
  const notifications: Notification[] = [];

  // Metas excedidas
  goals.filter(g => g.status === 'exceeded').forEach(g => {
    notifications.push({
      id     : `exceeded-${g.id}`,
      level  : 'critical',
      title  : `Limite excedido: ${g.category}`,
      message: `Você gastou ${formatCurrency(g.spent_amount)} de ${formatCurrency(g.limit_amount)} (${g.percentage}%)`,
      icon   : <AlertCircle size={16} />,
    });
  });

  // Metas em alerta (80–99%)
  goals.filter(g => g.status === 'warning').forEach(g => {
    notifications.push({
      id     : `warning-${g.id}`,
      level  : 'warning',
      title  : `Atenção: ${g.category} em ${g.percentage}%`,
      message: `Restam apenas ${formatCurrency(g.remaining)} do limite de ${formatCurrency(g.limit_amount)}`,
      icon   : <AlertTriangle size={16} />,
    });
  });

  // Saldo projetado negativo
  if (projBalance !== null && projBalance < 0) {
    notifications.push({
      id     : 'negative-projection',
      level  : 'critical',
      title  : 'Saldo projetado negativo',
      message: `Com base nos últimos meses, o saldo estimado para o próximo mês é ${formatCurrency(projBalance)}`,
      icon   : <TrendingDown size={16} />,
    });
  }

  // Filtra as já dispensadas
  const visible = notifications.filter(n => !dismissed.has(n.id));

  if (visible.length === 0) return null;

  function dismiss(id: string): void {
    setDismissed(prev => new Set([...prev, id]));
  }

  return (
    <div className={styles.wrapper}>
      {/* Header colapsável */}
      <button className={styles.header} onClick={() => setCollapsed(v => !v)}>
        <Bell size={14} className={styles.bellIcon} />
        <span className={styles.headerText}>
          {visible.length} alerta{visible.length > 1 ? 's' : ''} ativo{visible.length > 1 ? 's' : ''}
        </span>
        <span className={styles.chevron}>{collapsed ? '▶' : '▼'}</span>
      </button>

      {/* Lista de notificações */}
      {!collapsed && (
        <div className={styles.list}>
          {visible.map(notif => (
            <div key={notif.id} className={`${styles.item} ${styles[notif.level]}`}>
              <span className={styles.icon}>{notif.icon}</span>
              <div className={styles.content}>
                <strong className={styles.title}>{notif.title}</strong>
                <p className={styles.message}>{notif.message}</p>
              </div>
              <button
                className={styles.dismiss}
                onClick={() => dismiss(notif.id)}
                title="Dispensar"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
