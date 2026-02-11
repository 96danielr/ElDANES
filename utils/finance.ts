
import { Loan, Transaction, LoanSummary, Client } from '../types';

export const getGeneratedPeriods = (start: number): number => {
  const startDate = new Date(Number(start));
  const now = new Date();

  // Calcular meses completos usando la FECHA ANIVERSARIO del préstamo.
  // Si el préstamo empezó el día 15, cada mes se cumple el día 15.
  // Ejemplo: préstamo del 15 de enero → primer mes el 15 de febrero.

  let months = (now.getFullYear() - startDate.getFullYear()) * 12;
  months += now.getMonth() - startDate.getMonth();

  // Si aún no hemos llegado al día aniversario en el mes actual, restar 1
  if (now.getDate() < startDate.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
};

export const calculateLoanSummary = (
  loan: Loan,
  client: Client,
  transactions: Transaction[]
): LoanSummary => {
  const monthsPassed = getGeneratedPeriods(loan.startdate);

  // Filtrar transacciones de este préstamo y que sean pagos (amount > 0)
  const loanTransactions = transactions
    .filter((t) => t.loanid === loan.id && Number(t.amount) > 0)
    .sort((a, b) => Number(b.date) - Number(a.date)); // Ordenar por fecha descendente

  // Obtener fecha del último pago
  const lastPayment = loanTransactions.length > 0 ? loanTransactions[0] : null;
  const lastPaymentDate = lastPayment ? Number(lastPayment.date) : null;

  // Obtener mes del último pago en formato "YYYY-MM"
  let lastPaymentMonth: string | null = null;
  if (lastPaymentDate) {
    const lastPaymentDateObj = new Date(lastPaymentDate);
    const year = lastPaymentDateObj.getFullYear();
    const month = String(lastPaymentDateObj.getMonth() + 1).padStart(2, "0");
    lastPaymentMonth = `${year}-${month}`;
  }

  // IMPORTANTE: Number() es vital aquí porque Supabase devuelve numeric como string
  const totalPaid = loanTransactions.reduce(
    (sum, t) => sum + Number(t.amount || 0),
    0
  );

  const currentCap = Number(loan.currentcapital || 0);
  const rate = Number(loan.monthlyrate || 0);

  const monthlyInterestAmount = currentCap * (rate / 100);
  const totalInterestGenerated = monthsPassed * monthlyInterestAmount;

  const pendingInterest = Math.max(0, totalInterestGenerated - totalPaid);
  const totalInterestPaid = Math.min(totalInterestGenerated, totalPaid);

  const debtMonths =
    monthlyInterestAmount > 0 ? pendingInterest / monthlyInterestAmount : 0;
  const isOverdue = debtMonths > 1.0;

  // Colores basados en meses de deuda:
  // - Verde: debe menos de 1 mes (al día)
  // - Amarillo: debe entre 1 y 2 meses (atrasado)
  // - Rojo: debe 2+ meses (en mora)
  let statusColor: "green" | "yellow" | "red" = "green";

  if (debtMonths >= 2.0) {
    statusColor = "red";
  } else if (debtMonths >= 1.0) {
    statusColor = "yellow";
  } else {
    statusColor = "green";
  }

  return {
    loan,
    client,
    totalInterestGenerated,
    totalInterestPaid,
    pendingInterest,
    isOverdue,
    monthsPassed,
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
