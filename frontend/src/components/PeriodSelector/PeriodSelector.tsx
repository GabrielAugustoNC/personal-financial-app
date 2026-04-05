// ============================================================
// PeriodSelector — seletor de período reutilizável para os gráficos.
// Exibe três botões (1 Sem / 1 Mês / 1 Ano) e notifica o pai via callback.
// Usado no Dashboard (filtro client-side) e no Analytics (parâmetro de API).
// ============================================================

import type { Period } from '@/types/wallet';
import { PERIOD_OPTIONS } from '@/types/wallet';
import styles from './PeriodSelector.module.scss';

// Props do PeriodSelector:
// - value: período atualmente selecionado (controlado pelo componente pai)
// - onChange: callback chamado quando o usuário seleciona um novo período
interface PeriodSelectorProps {
  value    : Period;
  onChange : (period: Period) => void;
}

// PeriodSelector é um componente puramente controlado (controlled component).
// Não mantém estado interno — delega todo o controle ao componente pai via props.
// Analogia Angular: componente de apresentação com @Input e @Output EventEmitter
export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className={styles.selector}>
      {/* Renderiza um botão para cada opção definida em PERIOD_OPTIONS */}
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`${styles.btn} ${value === opt.value ? styles.active : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
