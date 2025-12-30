
import { Loan, Transaction, LoanSummary, Client } from '../types';

export const getGeneratedPeriods = (start: number): number => {
  const startDate = new Date(Number(start));
  const now = new Date();
  
  // El interés se cobra por mes VENCIDO:
  // - En diciembre se cobra noviembre (mes vencido)
  // - En enero se cobra diciembre (mes vencido)
  // 
  // Ejemplos (estando en diciembre):
  // - Si empezó en diciembre → 0 meses (aún no se debe nada)
  // - Si empezó en noviembre → 1 mes (se debe noviembre)
  // - Si empezó en octubre → 2 meses (se deben octubre y noviembre)
  
  // Calcular diferencia de años y meses
  let months = (now.getFullYear() - startDate.getFullYear()) * 12;
  months += now.getMonth() - startDate.getMonth();
  
  // Si estamos en el mismo mes que empezó, aún no se debe nada (0 meses)
  if (months === 0) {
    return 0;
  }
  
  // Si pasó al menos 1 mes, contar los meses vencidos
  // El mes actual NO se cuenta porque se cobra mes vencido
  // Ejemplo: Si empezó en noviembre y estamos en diciembre → 1 mes (noviembre)
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
    .filter(t => t.loanid === loan.id && Number(t.amount) > 0)
    .sort((a, b) => Number(b.date) - Number(a.date)); // Ordenar por fecha descendente
  
  // Obtener fecha del último pago
  const lastPayment = loanTransactions.length > 0 ? loanTransactions[0] : null;
  const lastPaymentDate = lastPayment ? Number(lastPayment.date) : null;
  
  // Obtener mes del último pago en formato "YYYY-MM"
  let lastPaymentMonth: string | null = null;
  if (lastPaymentDate) {
    const lastPaymentDateObj = new Date(lastPaymentDate);
    const year = lastPaymentDateObj.getFullYear();
    const month = String(lastPaymentDateObj.getMonth() + 1).padStart(2, '0');
    lastPaymentMonth = `${year}-${month}`;
  }
  
  // IMPORTANTE: Number() es vital aquí porque Supabase devuelve numeric como string
  const totalPaid = loanTransactions
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const currentCap = Number(loan.currentcapital || 0);
  const rate = Number(loan.monthlyrate || 0);

  const monthlyInterestAmount = currentCap * (rate / 100);
  const totalInterestGenerated = monthsPassed * monthlyInterestAmount;
  
  const pendingInterest = Math.max(0, totalInterestGenerated - totalPaid);
  const totalInterestPaid = Math.min(totalInterestGenerated, totalPaid);

  const debtMonths = monthlyInterestAmount > 0 ? pendingInterest / monthlyInterestAmount : 0;
  const isOverdue = debtMonths > 1.0;

  // Lógica de colores basada en el mes del último pago (mes vencido):
  // - Verde: Ya pagó el mes actual (último pago fue este mes)
  // - Amarillo: Pagó el mes pasado pero no el actual (último pago fue el mes pasado)
  // - Rojo: No pagó el mes pasado (último pago fue hace 2+ meses)
  
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  
  let statusColor: 'green' | 'yellow' | 'red' = 'green';
  
  if (!lastPaymentMonth) {
    // Nunca ha pagado: rojo si debe más de 1 mes
    statusColor = debtMonths >= 2.0 ? 'red' : debtMonths >= 1.0 ? 'yellow' : 'green';
  } else if (lastPaymentMonth === currentMonth) {
    // Último pago fue este mes → Verde (al día)
    statusColor = 'green';
  } else if (lastPaymentMonth === lastMonthStr) {
    // Último pago fue el mes pasado → Amarillo (debe el mes actual)
    statusColor = 'yellow';
  } else {
    // Último pago fue hace 2+ meses → Rojo (en mora)
    statusColor = 'red';
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
    lastPaymentMonth
  };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
};
