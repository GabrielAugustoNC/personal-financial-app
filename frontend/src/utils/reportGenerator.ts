// ============================================================
// reportGenerator — utilitário para geração de relatórios PDF.
// Usa jsPDF + jspdf-autotable para montar o relatório financeiro.
// Exporta uma função assíncrona que recebe os dados do Analytics
// e gera o download direto no navegador.
// ============================================================

import type { AnalyticsOverview } from '@/types/analytics';

// Formata número como moeda BRL sem usar Intl (compatível com jsPDF)
function fmt(value: number): string {
  const abs = Math.abs(value).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-' : ''}R$ ${abs}`;
}

// Formata percentual com sinal
function fmtPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}%`;
}

// Status visual para a projeção
function projTrendLabel(trend: string): string {
  return trend === 'positive' ? '✓ Positiva' : trend === 'negative' ? '✗ Negativa' : '— Neutra';
}

export async function generatePDFReport(
  data: AnalyticsOverview,
  periodLabel: string
): Promise<void> {
  // Importação dinâmica para não impactar o bundle principal
  const { jsPDF }    = await import('jspdf');
  const autoTable    = (await import('jspdf-autotable')).default;

  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // ---- Paleta de cores ----
  const PURPLE  = [124, 106, 247] as [number, number, number];
  const GREEN   = [0,   180, 130] as [number, number, number];
  const RED     = [220,  60, 100] as [number, number, number];
  const BLUE    = [60,  130, 220] as [number, number, number];
  const GRAY    = [140, 140, 160] as [number, number, number];
  const DARK    = [26,   26,  46] as [number, number, number];
  const LIGHT   = [245, 245, 252] as [number, number, number];

  // ---- Cabeçalho ----
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, W, 32, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('Finanças App', margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 195, 255);
  doc.text(`Relatório Financeiro  ·  Período: ${periodLabel}  ·  Gerado em ${new Date().toLocaleDateString('pt-BR')}`, margin, 22);

  y = 42;

  // ---- Seção: Projeção ----
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Projeção — Próximo Mês', margin, y);
  y += 6;

  const proj = data.projection;
  const projColor = proj.trend === 'positive' ? GREEN : proj.trend === 'negative' ? RED : GRAY;

  autoTable(doc, {
    startY          : y,
    margin          : { left: margin, right: margin },
    styles          : { fontSize: 9, cellPadding: 3, textColor: DARK },
    headStyles      : { fillColor: LIGHT, textColor: GRAY, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 255] as [number, number, number] },
    columns: [
      { header: 'Indicador',      dataKey: 'label' },
      { header: 'Valor',          dataKey: 'value' },
    ],
    body: [
      { label: 'Receita estimada',   value: fmt(proj.estimated_income) },
      { label: 'Despesa estimada',   value: fmt(proj.estimated_expenses) },
      { label: 'Saldo estimado',     value: fmt(proj.estimated_balance) },
      { label: 'Variação projetada', value: fmtPct(proj.trend_pct) },
      { label: 'Tendência',          value: projTrendLabel(proj.trend) },
    ],
    didDrawCell: (hookData: { section: string; column: { dataKey: string }; row: { index: number }; cell: { text: string[]; styles: { textColor: number[] } } }) => {
      // Coloriza a linha de saldo estimado
      if (hookData.section === 'body' && hookData.row.index === 2 && hookData.column.dataKey === 'value') {
        hookData.cell.styles.textColor = projColor;
      }
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // ---- Seção: Evolução Mensal ----
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Evolução Mensal', margin, y);
  y += 6;

  autoTable(doc, {
    startY  : y,
    margin  : { left: margin, right: margin },
    styles  : { fontSize: 9, cellPadding: 3, textColor: DARK },
    headStyles: { fillColor: PURPLE, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 255] as [number, number, number] },
    columns : [
      { header: 'Mês',      dataKey: 'month'    },
      { header: 'Receitas', dataKey: 'income'   },
      { header: 'Despesas', dataKey: 'expenses' },
      { header: 'Saldo',    dataKey: 'balance'  },
    ],
    body: data.monthly_evolution.map(m => ({
      month   : `${m.month}/${m.year}`,
      income  : fmt(m.income),
      expenses: fmt(m.expenses),
      balance : fmt(m.balance),
    })),
    didDrawCell: (hookData: { section: string; column: { dataKey: string }; row: { raw: { balance: string } }; cell: { styles: { textColor: number[] } } }) => {
      if (hookData.section === 'body' && hookData.column.dataKey === 'balance') {
        const raw = hookData.row.raw.balance;
        hookData.cell.styles.textColor = raw.startsWith('-') ? RED : GREEN;
      }
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Nova página se necessário
  if (y > 220) { doc.addPage(); y = 20; }

  // ---- Seção: Gastos por Categoria ----
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Gastos por Categoria — Mês Atual', margin, y);
  y += 6;

  autoTable(doc, {
    startY  : y,
    margin  : { left: margin, right: margin },
    styles  : { fontSize: 9, cellPadding: 3, textColor: DARK },
    headStyles: { fillColor: DARK, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 255] as [number, number, number] },
    columns : [
      { header: 'Categoria',  dataKey: 'category'   },
      { header: 'Qtd',        dataKey: 'count'      },
      { header: 'Total',      dataKey: 'amount'     },
      { header: '% do Total', dataKey: 'percentage' },
    ],
    body: data.category_breakdown.map(c => ({
      category  : c.category,
      count     : c.count,
      amount    : fmt(c.amount),
      percentage: `${c.percentage}%`,
    })),
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Nova página se necessário
  if (y > 220) { doc.addPage(); y = 20; }

  // ---- Seção: Pontos de Atenção ----
  if (data.attention_points.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Pontos de Atenção', margin, y);
    y += 6;

    autoTable(doc, {
      startY  : y,
      margin  : { left: margin, right: margin },
      styles  : { fontSize: 9, cellPadding: 3, textColor: DARK },
      headStyles: { fillColor: RED, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 248, 250] as [number, number, number] },
      columns : [
        { header: 'Despesa',   dataKey: 'title'    },
        { header: 'Categoria', dataKey: 'category' },
        { header: 'Valor',     dataKey: 'amount'   },
        { header: 'Variação',  dataKey: 'change'   },
        { header: 'Nível',     dataKey: 'level'    },
      ],
      body: data.attention_points.map(p => ({
        title   : p.title,
        category: p.category,
        amount  : fmt(p.amount),
        change  : p.change !== 0 ? fmtPct(p.change) : '—',
        level   : p.level === 'critical' ? 'Crítico' : p.level === 'high' ? 'Alto' : 'Médio',
      })),
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ---- Seção: Comparativo vs Mês Anterior ----
  if (data.month_comparison.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Comparativo vs Mês Anterior', margin, y);
    y += 6;

    autoTable(doc, {
      startY  : y,
      margin  : { left: margin, right: margin },
      styles  : { fontSize: 8, cellPadding: 2.5, textColor: DARK },
      headStyles: { fillColor: BLUE, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 255] as [number, number, number] },
      columns : [
        { header: 'Título',          dataKey: 'title'     },
        { header: 'Tipo',            dataKey: 'type'      },
        { header: 'Mês Anterior',    dataKey: 'last'      },
        { header: 'Mês Atual',       dataKey: 'current'   },
        { header: 'Variação',        dataKey: 'diff_pct'  },
      ],
      body: data.month_comparison.map(c => ({
        title  : c.title,
        type   : c.type === 'income' ? 'Receita' : 'Despesa',
        last   : c.last_month > 0   ? fmt(c.last_month)    : '—',
        current: c.current_month > 0 ? fmt(c.current_month) : '—',
        diff_pct: c.diff_pct !== 0   ? fmtPct(c.diff_pct)  : 'Estável',
      })),
    });
  }

  // ---- Rodapé em todas as páginas ----
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(
      `Finanças App  ·  Relatório gerado em ${new Date().toLocaleString('pt-BR')}  ·  Página ${i} de ${pageCount}`,
      margin,
      doc.internal.pageSize.getHeight() - 8
    );
  }

  // ---- Download ----
  const filename = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
