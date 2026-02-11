
export interface Client {
  id: string;
  name: string;
  phone: string;
  createdat: number;
}

export interface Loan {
  id: string;
  clientid: string;
  initialcapital: number;
  currentcapital: number;
  monthlyrate: number;
  startdate: number;
  isactive: boolean;
  owner: string;
}

export interface Transaction {
  id: string;
  loanid: string;
  amount: number;
  date: number;
  description: string;
}

export interface LoanSummary {
  loan: Loan;
  client: Client;
  totalInterestGenerated: number;
  totalInterestPaid: number;
  pendingInterest: number;
  isOverdue: boolean;
  monthsPassed: number;
  monthlyInterestAmount: number;
  statusColor: 'green' | 'yellow' | 'red';
  debtMonths: number;
  lastPaymentDate: number | null; // Fecha del último pago (timestamp) o null si no ha pagado
  lastPaymentMonth: string | null; // Mes del último pago en formato "YYYY-MM" o null
}
