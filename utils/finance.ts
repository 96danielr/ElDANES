import { Loan, Transaction, LoanSummary, Client } from '../types';
import {
  computeInterestState,
  getGeneratedPeriodsUTC,
} from '../supabase/functions/_shared/finance';

export const getGeneratedPeriods = (start: number): number =>
  getGeneratedPeriodsUTC(Number(start), Date.now());

export const calculateLoanSummary = (
  loan: Loan,
  client: Client,
  transactions: Transaction[]
): LoanSummary => {
  const now = Date.now();
  const txs = transactions
    .filter((t) => t.loanid === loan.id)
    .sort((a, b) => Number(a.date) - Number(b.date));

  const { interestOwed, interestPaid, pendingInterest, runningCapital } =
    computeInterestState(loan, txs, now);

  const paymentTxs = txs.filter((t) => Number(t.amount) > 0);
  const lastPayment = paymentTxs.length > 0 ? paymentTxs[paymentTxs.length - 1] : null;
  const lastPaymentDate = lastPayment ? Number(lastPayment.date) : null;
  let lastPaymentMonth: string | null = null;
  if (lastPaymentDate) {
    const d = new Date(lastPaymentDate);
    lastPaymentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  const monthlyInterestAmount = runningCapital * Number(loan.monthlyrate || 0) / 100;
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
