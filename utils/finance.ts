
import { Loan, Transaction, LoanSummary, Client } from '../types';

export const getGeneratedPeriods = (start: number): number => {
  const startDate = new Date(Number(start));
  const now = new Date();

  // FECHA DE CORTE: día 25 de cada mes
  // - Antes del día 25: solo se cobran meses vencidos (no el mes actual)
  // - A partir del día 25: se puede cobrar el mes actual
  const CUTOFF_DAY = 25;
  const currentDay = now.getDate();

  // Calcular diferencia de años y meses
  let months = (now.getFullYear() - startDate.getFullYear()) * 12;
  months += now.getMonth() - startDate.getMonth();

  // Si estamos en el mismo mes que empezó
  if (months === 0) {
    return 0;
  }

  // Si la fecha actual es antes del día 25, no contar el mes actual
  // Solo contar hasta el mes pasado (meses vencidos)
  if (currentDay < CUTOFF_DAY) {
    // Restar 1 porque no contamos el mes actual si aún no llegamos al día 25
    return Math.max(0, months - 1);
  }

  // Si ya pasamos el día 25, contar el mes actual también
  return months;
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

  // Lógica de colores considerando fecha de corte del día 25:
  // - Verde: Ya pagó el mes que se puede cobrar actualmente (considerando fecha de corte)
  // - Amarillo: Pagó el mes pasado pero no el mes que se puede cobrar actualmente
  // - Rojo: No pagó el mes pasado o está en mora

  const now = new Date();
  const CUTOFF_DAY = 25;
  const currentDay = now.getDate();

  // Determinar qué mes se puede cobrar actualmente según la fecha de corte
  let billableMonth: string;
  if (currentDay >= CUTOFF_DAY) {
    // Ya pasó el día 25, se puede cobrar el mes actual
    billableMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  } else {
    // Aún no llega el día 25, solo se puede cobrar hasta el mes pasado
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    billableMonth = `${lastMonth.getFullYear()}-${String(
      lastMonth.getMonth() + 1
    ).padStart(2, "0")}`;
  }

  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(
    lastMonth.getMonth() + 1
  ).padStart(2, "0")}`;

  let statusColor: "green" | "yellow" | "red" = "green";

  if (!lastPaymentMonth) {
    // Nunca ha pagado: rojo si debe más de 1 mes
    statusColor =
      debtMonths >= 2.0 ? "red" : debtMonths >= 1.0 ? "yellow" : "green";
  } else if (lastPaymentMonth === currentMonth) {
    // Si pagó en el mes actual → Verde (está al día, aunque aún no llegue el día 25)
    statusColor = "green";
  } else if (lastPaymentMonth === billableMonth) {
    // Último pago fue del mes que se puede cobrar actualmente → Verde (al día)
    statusColor = "green";
  } else if (lastPaymentMonth === lastMonthStr && currentDay >= CUTOFF_DAY) {
    // Último pago fue el mes pasado y ya pasó el día 25 → Amarillo (debe el mes actual)
    statusColor = "yellow";
  } else if (lastPaymentMonth === lastMonthStr && currentDay < CUTOFF_DAY) {
    // Último pago fue el mes pasado pero aún no llega el día 25 → Verde (aún no se debe el mes actual)
    statusColor = "green";
  } else {
    // Último pago fue hace 2+ meses → Rojo (en mora)
    statusColor = "red";
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
