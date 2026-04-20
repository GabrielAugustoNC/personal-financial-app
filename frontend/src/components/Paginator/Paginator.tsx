// ============================================================
// Paginator — componente de navegação entre páginas.
// Exibe botões Anterior/Próximo, números de página e resumo de itens.
// Mostra no máximo 5 páginas visíveis com reticências nas extremidades.
// ============================================================

import styles from './Paginator.module.scss';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginatorProps {
  page       : number;   // página atual (1-based)
  totalPages : number;   // total de páginas
  total      : number;   // total de registros
  limit      : number;   // itens por página
  onChange   : (page: number) => void;
}

// Gera o array de páginas visíveis com reticências (null = separador)
function buildPageRange(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | null)[] = [1];

  if (current > 3) pages.push(null);

  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push(null);
  pages.push(total);

  return pages;
}

export function Paginator({ page, totalPages, total, limit, onChange }: PaginatorProps) {
  if (totalPages <= 1) return null;

  const from  = (page - 1) * limit + 1;
  const to    = Math.min(page * limit, total);
  const pages = buildPageRange(page, totalPages);

  return (
    <div className={styles.wrapper}>
      {/* Resumo de registros */}
      <span className={styles.summary}>
        {from}–{to} de {total} itens
      </span>

      {/* Navegação */}
      <div className={styles.nav}>
        <button
          className={styles.btn}
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          title="Página anterior"
        >
          <ChevronLeft size={15} />
        </button>

        {pages.map((p, i) =>
          p === null ? (
            <span key={`sep-${i}`} className={styles.ellipsis}>…</span>
          ) : (
            <button
              key={p}
              className={`${styles.btn} ${p === page ? styles.active : ''}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          className={styles.btn}
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          title="Próxima página"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
