import { Loan, Transaction, LoanSummary, Client } from '../types';

export const getGeneratedPeriods = (start: number): number => {
  const startDate = new Date(Number(start));
  const now = new Date();

  let months = (now.getFullYear() - startDate.getFullYear()) * 12;
  months += now.getMonth() - startDate.getMonth();

  if (now.getDate() < startDate.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
};

const addMonth = (d: Date): Date => {
  const next = new Date(d);
  next.setMonth(next.getMonth() + 1);
  return next;
};

export const calculateLoanSummary = (
  loan: Loan,
  client: Client,
  transactions: Transaction[]
): LoanSummary => {
  const rate = Number(loan.monthlyrate || 0) / 100;
  const startDate = new Date(Number(loan.startdate));
  const today = new Date();

  const txs = transactions
    .filter((t) => t.loanid === loan.id)
    .sort((a, b) => Number(a.date) - Number(b.date));

  let runningCapital = Number(loan.initialcapital || 0);
  let interestOwed = 0;
  let interestPaid = 0;
  let nextAnniversary = addMonth(startDate);

  const generateInterestUntil = (cutoff: Date) => {
    while (nextAnniversary <= cutoff) {
      interestOwed += runningCapital * rate;
      nextAnniversary = addMonth(nextAnniversary);
    }
  };

  for (const tx of txs) {
    const txDate = new Date(Number(tx.date));
    generateInterestUntil(txDate);

    const desc = (tx.description || '').trim();
    const amount = Number(tx.amount || 0);
    const descUpper = desc.toUpperCase();

    if (descUpper.includes('APERTURA')) continue;

    if (descUpper.includes('INYECCI')) {
      const match = desc.match(/\+(\d+)/);
      if (match) {
        runningCapital += Number(match[1]);
      }
      continue;
    }

    if (amount === 0) continue;

    if (desc === 'Pago Intereses') {
      interestPaid += amount;
    } else if (desc === 'Abono a Capital') {
      runningCapital -= amount;
    } else if (desc.includes('Mixto') || desc === 'Pago Intereses + capital') {
      const pending = Math.max(0, interestOwed - interestPaid);
      const toInterest = Math.min(amount, pending);
      const toCapital = amount - toInterest;
      interestPaid += toInterest;
      runningCapital -= toCapital;
    } else {
      console.warn(`[finance] descripción desconocida en tx ${tx.id}: "${desc}"`);
    }
  }

  // Anclar al currentcapital de BD: la BD es la verdad operativa
  const bdCapital = Number(loan.currentcapital || 0);
  if (Math.abs(bdCapital - runningCapital) > 0.01) {
    runningCapital = bdCapital;
  }

  // Generar intereses pendientes desde la última tx hasta hoy con el capital anclado
  generateInterestUntil(today);

  // last payment metadata (igual que la versión anterior)
  const paymentTxs = txs.filter((t) => Number(t.amount) > 0);
  const lastPayment = paymentTxs.length > 0 ? paymentTxs[paymentTxs.length - 1] : null;
  const lastPaymentDate = lastPayment ? Number(lastPayment.date) : null;
  let lastPaymentMonth: string | null = null;
  if (lastPaymentDate) {
    const d = new Date(lastPaymentDate);
    lastPaymentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  const pendingInterest = Math.max(0, interestOwed - interestPaid);
  const monthlyInterestAmount = runningCapital * rate;
  const debtMonths = monthlyInterestAmount > 0 ? pendingInterest / monthlyInterestAmount : 0;
  const isOverdue = debtMonths > 1.0;

  let statusColor: 'green' | 'yellow' | 'red' = 'green';
  if (debtMonths >= 2.0) statusColor = 'red';
  else if (debtMonths >= 1.0) statusColor = 'yellow';

  return {
    loan,
    client,
    totalInterestGenerated: interestOwed,
    totalInterestPaid: interestPaid,
    pendingInterest,
    isOverdue,
    monthsPassed: getGeneratedPeriods(loan.startdate),
    monthlyInterestAmount,
    statusColor,
    debtMonths,
    lastPaymentDate,
    lastPaymentMonth,
  };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
};
