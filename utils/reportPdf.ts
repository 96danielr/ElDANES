import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LoanSummary, Transaction, Loan, Client } from '../types';
import { formatCurrency } from './finance';

// Colors
const BLUE = [20, 110, 180] as const;
const GREEN = [35, 134, 54] as const;
const RED = [248, 81, 73] as const;
const DARK = [30, 30, 30] as const;
const GRAY = [120, 120, 120] as const;
const LIGHT_BG = [245, 247, 250] as const;

export function generateMonthlyReport(
  summaries: LoanSummary[],
  transactions: Transaction[],
  loans: Loan[],
  clients: Client[]
) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 20;

  const now = new Date();
  const monthName = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  // ===== HEADER =====
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Danes Finance', margin, 16);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Informe Mensual', margin, 24);

  doc.setFontSize(9);
  doc.text(`Período: ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`, margin, 31);
  doc.text(`Generado: ${now.toLocaleDateString('es-ES')}`, pageWidth - margin, 31, { align: 'right' });

  y = 48;

  // ===== KPIs =====
  const activeLoans = loans.filter(l => l.isactive);
  const pendingCapital = activeLoans.reduce((sum, l) => sum + Number(l.currentcapital), 0);
  const monthlyRevenue = summaries.reduce((sum, s) => sum + Number(s.loan.currentcapital) * (Number(s.loan.monthlyrate) / 100), 0);
  const monthlyROI = pendingCapital > 0 ? (monthlyRevenue / pendingCapital) * 100 : 0;
  const totalInterestPaid = summaries.reduce((sum, s) => sum + s.totalInterestPaid, 0);
  const totalPendingInterest = summaries.reduce((sum, s) => sum + s.pendingInterest, 0);
  const overdueCount = summaries.filter(s => s.isOverdue).length;
  const moraRate = summaries.length > 0 ? (overdueCount / summaries.length) * 100 : 0;

  // Section title helper
  const sectionTitle = (title: string) => {
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(...BLUE);
    doc.rect(margin, y, 3, 7, 'F');
    doc.setTextColor(...DARK);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 6, y + 6);
    y += 14;
  };

  // KPI box helper
  const kpiBox = (x: number, w: number, label: string, value: string, color: readonly [number, number, number]) => {
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(x, y, w, 22, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(label.toUpperCase(), x + 5, y + 7);
    doc.setFontSize(13);
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + 5, y + 17);
  };

  sectionTitle('Resumen General');

  const boxW = (pageWidth - margin * 2 - 9) / 3;
  kpiBox(margin, boxW, 'Capital en Calle', formatCurrency(pendingCapital), BLUE);
  kpiBox(margin + boxW + 4.5, boxW, 'Rédito Mensual', formatCurrency(monthlyRevenue), GREEN);
  kpiBox(margin + (boxW + 4.5) * 2, boxW, 'ROI Mensual', `${monthlyROI.toFixed(1)}%`, BLUE);
  y += 27;

  kpiBox(margin, boxW, 'Interés Cobrado', formatCurrency(totalInterestPaid), GREEN);
  kpiBox(margin + boxW + 4.5, boxW, 'Interés Pendiente', formatCurrency(totalPendingInterest), RED);
  kpiBox(margin + (boxW + 4.5) * 2, boxW, 'Tasa de Mora', `${moraRate.toFixed(0)}% (${overdueCount}/${summaries.length})`, RED);
  y += 30;

  // ===== PRESTAMOS ACTIVOS =====
  sectionTitle(`Préstamos Activos (${summaries.length})`);

  const loanRows = summaries
    .sort((a, b) => b.pendingInterest - a.pendingInterest)
    .map(s => [
      s.client.name,
      s.loan.owner || 'Juntos',
      formatCurrency(s.loan.currentcapital),
      `${s.loan.monthlyrate}%`,
      formatCurrency(s.monthlyInterestAmount),
      formatCurrency(s.pendingInterest),
      s.isOverdue ? 'MORA' : 'Al día'
    ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Cliente', 'Owner', 'Capital', 'Tasa', 'Int. Mensual', 'Pendiente', 'Estado']],
    body: loanRows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [...BLUE], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 20, halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'center', cellWidth: 18 },
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 6) {
        if (data.cell.raw === 'MORA') {
          data.cell.styles.textColor = [...RED];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [...GREEN];
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ===== RESUMEN POR OWNER =====
  sectionTitle('Resumen por Etiqueta');

  const ownerGroups: Record<string, { capital: number; interest: number; count: number; pending: number }> = {};
  summaries.forEach(s => {
    const owner = s.loan.owner || 'Juntos';
    if (!ownerGroups[owner]) ownerGroups[owner] = { capital: 0, interest: 0, count: 0, pending: 0 };
    ownerGroups[owner].capital += Number(s.loan.currentcapital);
    ownerGroups[owner].interest += s.monthlyInterestAmount;
    ownerGroups[owner].count += 1;
    ownerGroups[owner].pending += s.pendingInterest;
  });

  const ownerRows = Object.entries(ownerGroups).map(([owner, data]) => [
    owner,
    data.count.toString(),
    formatCurrency(data.capital),
    formatCurrency(data.interest),
    formatCurrency(data.pending),
  ]);

  // Total row
  ownerRows.push([
    'TOTAL',
    summaries.length.toString(),
    formatCurrency(pendingCapital),
    formatCurrency(monthlyRevenue),
    formatCurrency(totalPendingInterest),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Etiqueta', 'Préstamos', 'Capital', 'Int. Mensual', 'Pendiente']],
    body: ownerRows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [...BLUE], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.index === ownerRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [230, 237, 243];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ===== MOVIMIENTOS DEL MES =====
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
  const monthTransactions = transactions
    .filter(t => Number(t.date) >= monthStart && Number(t.date) <= monthEnd && Number(t.amount) > 0)
    .sort((a, b) => Number(b.date) - Number(a.date));

  sectionTitle(`Movimientos del Mes (${monthTransactions.length})`);

  if (monthTransactions.length > 0) {
    const txRows = monthTransactions.map(t => {
      const loan = loans.find(l => l.id === t.loanid);
      const client = clients.find(c => loan && c.id === loan.clientid);
      return [
        new Date(Number(t.date)).toLocaleDateString('es-ES'),
        client?.name || 'N/A',
        formatCurrency(t.amount),
        t.description,
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Fecha', 'Cliente', 'Monto', 'Descripción']],
      body: txRows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [...GREEN], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { halign: 'right', cellWidth: 30 },
        3: { },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // Month total
    const monthTotal = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREEN);
    doc.text(`Total cobrado en el mes: ${formatCurrency(monthTotal)}`, pageWidth - margin, y, { align: 'right' });
    y += 12;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text('Sin movimientos registrados este mes.', margin, y);
    y += 12;
  }

  // ===== HISTORIAL ÚLTIMOS 6 MESES =====
  sectionTitle('Historial de Cobros (Últimos 6 Meses)');

  const historyRows = Array.from({ length: 6 }).map((_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const mStart = date.getTime();
    const mEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).getTime();
    const mTxs = transactions.filter(t => {
      const tDate = Number(t.date);
      return tDate >= mStart && tDate <= mEnd && Number(t.amount) > 0;
    });
    const mTotal = mTxs.reduce((sum, t) => sum + Number(t.amount), 0);
    const monthLabel = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return [
      monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      mTxs.length.toString(),
      formatCurrency(mTotal),
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Mes', 'Transacciones', 'Total Cobrado']],
    body: historyRows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [...BLUE], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'right' },
    },
  });

  // ===== FOOTER =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Danes Finance — Informe Confidencial', margin, pageH - 8);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageH - 8, { align: 'right' });
  }

  // Save
  const fileName = `Informe_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;
  doc.save(fileName);
}
