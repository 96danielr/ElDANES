// Núcleo de cálculo financiero — única fuente de verdad.
// Consumido por las Edge Functions (Deno) y por el frontend vía utils/finance.ts.
// Toda la aritmética de fechas usa métodos UTC para que cliente y servidor
// coincidan siempre, independiente de la zona horaria del runtime.

export interface FinLoan {
  id: string;
  initialcapital: number | string;
  currentcapital: number | string;
  monthlyrate: number | string;
  startdate: number | string;
}

export interface FinTransaction {
  id?: string;
  loanid: string;
  amount: number | string;
  date: number | string;
  description: string | null;
}

export interface InterestState {
  interestOwed: number;
  interestPaid: number;
  pendingInterest: number;
  runningCapital: number;
}

// n-ésimo aniversario mensual desde start (ms epoch), con el día ajustado al
// último día válido del mes destino (préstamos iniciados a fin de mes).
export const anniversaryFromStartUTC = (startMs: number, n: number): number => {
  const s = new Date(startMs);
  const year = s.getUTCFullYear();
  const month = s.getUTCMonth() + n;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(s.getUTCDate(), lastDay);
  return Date.UTC(year, month, day, s.getUTCHours(), s.getUTCMinutes(), s.getUTCSeconds(), s.getUTCMilliseconds());
};

export const getGeneratedPeriodsUTC = (startMs: number, nowMs: number): number => {
  const start = new Date(Number(startMs));
  const now = new Date(nowMs);
  let months = (now.getUTCFullYear() - start.getUTCFullYear()) * 12;
  months += now.getUTCMonth() - start.getUTCMonth();
  if (now.getUTCDate() < start.getUTCDate()) months -= 1;
  return Math.max(0, months);
};

// Simulación cronológica: genera interés en cada aniversario y aplica las
// transacciones en orden. Ancla el capital al currentcapital de BD al final
// (la BD es la verdad operativa) antes de generar el interés restante.
export const computeInterestState = (
  loan: FinLoan,
  transactions: FinTransaction[],
  nowMs: number
): InterestState => {
  const rate = Number(loan.monthlyrate || 0) / 100;
  const startMs = Number(loan.startdate);

  const txs = transactions
    .filter((t) => t.loanid === loan.id)
    .sort((a, b) => Number(a.date) - Number(b.date));

  let runningCapital = Number(loan.initialcapital || 0);
  let interestOwed = 0;
  let interestPaid = 0;
  let anniversaryIndex = 1;
  let nextAnniversary = anniversaryFromStartUTC(startMs, anniversaryIndex);

  const generateInterestUntil = (cutoffMs: number) => {
    while (nextAnniversary <= cutoffMs) {
      interestOwed += runningCapital * rate;
      anniversaryIndex += 1;
      nextAnniversary = anniversaryFromStartUTC(startMs, anniversaryIndex);
    }
  };

  for (const tx of txs) {
    generateInterestUntil(Number(tx.date));

    const desc = (tx.description || '').trim();
    const amount = Number(tx.amount || 0);
    const descUpper = desc.toUpperCase();

    if (descUpper.includes('APERTURA')) continue;

    if (descUpper.includes('INYECCI')) {
      const match = desc.match(/\+(\d+)/);
      if (match) runningCapital += Number(match[1]);
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
    }
    // Liquidaciones y descripciones desconocidas no alteran la simulación.
  }

  const bdCapital = Number(loan.currentcapital || 0);
  if (Math.abs(bdCapital - runningCapital) > 0.01) {
    runningCapital = bdCapital;
  }

  generateInterestUntil(nowMs);

  return {
    interestOwed,
    interestPaid,
    pendingInterest: Math.max(0, interestOwed - interestPaid),
    runningCapital,
  };
};

export const calculatePendingInterest = (
  loan: FinLoan,
  transactions: FinTransaction[],
  nowMs: number
): number => computeInterestState(loan, transactions, nowMs).pendingInterest;

// ── Desglose de pagos ────────────────────────────────────────────────────────

export type MovementKind =
  | 'apertura'
  | 'inyeccion'
  | 'interes'
  | 'capital'
  | 'mixto'
  | 'liquidacion'
  | 'otro';

export interface PaymentSplit {
  txId?: string;
  date: number;
  amount: number;
  toInterest: number;
  toCapital: number;
  kind: MovementKind;
  injectedAmount?: number;
}

// Descompone cada transacción del préstamo en parte interés / parte capital,
// usando la misma simulación cronológica que computeInterestState. A diferencia
// de aquella, las liquidaciones SÍ se descomponen (interés pendiente al momento
// de liquidar, resto a capital) — esto es solo para reporting; el cálculo de
// saldos no cambia.
export const computePaymentBreakdown = (
  loan: FinLoan,
  transactions: FinTransaction[]
): PaymentSplit[] => {
  const rate = Number(loan.monthlyrate || 0) / 100;
  const startMs = Number(loan.startdate);

  const txs = transactions
    .filter((t) => t.loanid === loan.id)
    .sort((a, b) => Number(a.date) - Number(b.date));

  let runningCapital = Number(loan.initialcapital || 0);
  let interestOwed = 0;
  let interestPaid = 0;
  let anniversaryIndex = 1;
  let nextAnniversary = anniversaryFromStartUTC(startMs, anniversaryIndex);

  const generateInterestUntil = (cutoffMs: number) => {
    while (nextAnniversary <= cutoffMs) {
      interestOwed += runningCapital * rate;
      anniversaryIndex += 1;
      nextAnniversary = anniversaryFromStartUTC(startMs, anniversaryIndex);
    }
  };

  const result: PaymentSplit[] = [];

  for (const tx of txs) {
    const dateMs = Number(tx.date);
    generateInterestUntil(dateMs);

    const desc = (tx.description || '').trim();
    const amount = Number(tx.amount || 0);
    const descUpper = desc.toUpperCase();
    const base = { txId: tx.id, date: dateMs, amount, toInterest: 0, toCapital: 0 };

    if (descUpper.includes('APERTURA')) {
      result.push({ ...base, kind: 'apertura' });
      continue;
    }

    if (descUpper.includes('INYECCI')) {
      const match = desc.match(/\+(\d+)/);
      const injected = match ? Number(match[1]) : 0;
      runningCapital += injected;
      result.push({ ...base, kind: 'inyeccion', injectedAmount: injected });
      continue;
    }

    if (amount === 0) {
      result.push({ ...base, kind: 'otro' });
      continue;
    }

    if (desc === 'Pago Intereses') {
      interestPaid += amount;
      result.push({ ...base, kind: 'interes', toInterest: amount });
    } else if (desc === 'Abono a Capital') {
      runningCapital -= amount;
      result.push({ ...base, kind: 'capital', toCapital: amount });
    } else if (desc.includes('Mixto') || desc === 'Pago Intereses + capital') {
      const pending = Math.max(0, interestOwed - interestPaid);
      const toInterest = Math.min(amount, pending);
      const toCapital = amount - toInterest;
      interestPaid += toInterest;
      runningCapital -= toCapital;
      result.push({ ...base, kind: 'mixto', toInterest, toCapital });
    } else if (descUpper.includes('LIQUIDACI')) {
      const pending = Math.max(0, interestOwed - interestPaid);
      const toInterest = Math.min(amount, pending);
      const toCapital = amount - toInterest;
      interestPaid += toInterest;
      runningCapital -= toCapital;
      result.push({ ...base, kind: 'liquidacion', toInterest, toCapital });
    } else {
      result.push({ ...base, kind: 'otro' });
    }
  }

  return result;
};
