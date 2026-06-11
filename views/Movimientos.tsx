
import React, { useMemo, useState } from 'react';
import { Loan, Client, Transaction } from '../types';
import { formatCurrency } from '../utils/finance';
import { Calendar, ArrowDownLeft, ArrowUpRight, History, Receipt, Scale } from 'lucide-react';

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function getLastSixMonths(): { year: number; month: number; label: string }[] {
  const now = new Date();
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const cap = MESES_ES[m].charAt(0).toUpperCase() + MESES_ES[m].slice(1, 3);
    months.push({ year: y, month: m, label: `${cap} ${y}` });
  }
  return months;
}

type MovementKind = 'interes' | 'capital' | 'mixto' | 'liquidacion' | 'apertura' | 'inyeccion' | 'pago';

interface Movement {
  id: string;
  date: number;
  clientName: string;
  kind: MovementKind;
  direction: 'in' | 'out';
  amount: number;
  description: string;
}

const KIND_LABEL: Record<MovementKind, string> = {
  interes: 'Interés',
  capital: 'Abono Capital',
  mixto: 'Mixto',
  liquidacion: 'Liquidación',
  apertura: 'Préstamo Nuevo',
  inyeccion: 'Inyección Capital',
  pago: 'Pago',
};

interface Props {
  transactions: Transaction[];
  loans: Loan[];
  clients: Client[];
}

const Movimientos: React.FC<Props> = ({ transactions, loans, clients }) => {
  const monthOptions = useMemo(() => getLastSixMonths(), []);
  const [selectedMonth, setSelectedMonth] = useState(0);

  // Flujo de caja: entradas (pagos) y salidas (préstamos otorgados, inyecciones)
  const allMovements = useMemo<Movement[]>(() => {
    const loanById = new Map(loans.map((l) => [l.id, l]));
    const clientById = new Map(clients.map((c) => [c.id, c]));

    const movements: Movement[] = [];

    for (const t of transactions) {
      const loan = loanById.get(t.loanid);
      const client = loan ? clientById.get(loan.clientid) : undefined;
      const clientName = (client?.name || 'Desconocido').trim();
      const desc = (t.description || '').trim();
      const descUpper = desc.toUpperCase();
      const amount = Number(t.amount || 0);
      const id = t.id || `${t.loanid}-${t.date}`;
      const date = Number(t.date);

      if (descUpper.includes('APERTURA')) {
        movements.push({
          id, date, clientName, kind: 'apertura', direction: 'out',
          // Capital original del préstamo. En préstamos viejos con inyecciones
          // antiguas (semántica histórica mixta) puede salir sobreestimado.
          amount: Number(loan?.initialcapital || 0),
          description: desc,
        });
        continue;
      }

      if (descUpper.includes('INYECCI')) {
        const match = desc.match(/\+(\d+)/);
        movements.push({
          id, date, clientName, kind: 'inyeccion', direction: 'out',
          amount: match ? Number(match[1]) : 0,
          description: desc,
        });
        continue;
      }

      if (amount <= 0) continue;

      let kind: MovementKind = 'pago';
      if (descUpper.includes('LIQUIDACI')) kind = 'liquidacion';
      else if (desc === 'Pago Intereses') kind = 'interes';
      else if (desc === 'Abono a Capital') kind = 'capital';
      else if (desc.includes('Mixto') || desc === 'Pago Intereses + capital') kind = 'mixto';

      movements.push({
        id, date, clientName, kind, direction: 'in', amount,
        description: desc,
      });
    }

    return movements.sort((a, b) => b.date - a.date);
  }, [transactions, loans, clients]);

  const filtered = useMemo(() => {
    const { year, month } = monthOptions[selectedMonth];
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();
    return allMovements.filter((m) => m.date >= start && m.date < end);
  }, [allMovements, selectedMonth, monthOptions]);

  const totals = useMemo(() => {
    const inflow = filtered.filter((m) => m.direction === 'in').reduce((s, m) => s + m.amount, 0);
    const outflow = filtered.filter((m) => m.direction === 'out').reduce((s, m) => s + m.amount, 0);
    return { inflow, outflow, net: inflow - outflow };
  }, [filtered]);

  const sel = monthOptions[selectedMonth];
  const monthFullName =
    MESES_ES[sel.month].charAt(0).toUpperCase() + MESES_ES[sel.month].slice(1);

  return (
    <div className="space-y-4 sm:space-y-6 pb-10 animate-fade-in-up">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center justify-center gap-2 sm:gap-3">
          <Receipt size={20} className="text-accent sm:w-6 sm:h-6" />
          Flujo de Caja
        </h1>
        <p className="text-[var(--text-secondary)] text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] mt-1.5 sm:mt-2">
          {monthFullName} {sel.year}
        </p>
      </div>

      {/* Month selector */}
      <div className="bg-white/8 rounded-2xl p-2 sm:p-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {monthOptions.map((opt, idx) => (
            <button
              key={`${opt.year}-${opt.month}`}
              onClick={() => setSelectedMonth(idx)}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap border ${
                idx === selectedMonth
                  ? 'bg-accent/15 text-accent border-accent/30'
                  : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-white/5 hover:text-[var(--text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen del mes: Entró / Salió / Neto */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="metric-card p-3 sm:p-5">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <ArrowDownLeft size={14} className="text-success" />
            <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Entró</p>
          </div>
          <p className="text-sm sm:text-xl font-bold text-success font-mono">{formatCurrency(totals.inflow)}</p>
        </div>
        <div className="metric-card p-3 sm:p-5">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <ArrowUpRight size={14} className="text-danger" />
            <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Salió</p>
          </div>
          <p className="text-sm sm:text-xl font-bold text-danger font-mono">{formatCurrency(totals.outflow)}</p>
        </div>
        <div className="metric-card p-3 sm:p-5">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <Scale size={14} className="text-accent" />
            <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Neto</p>
          </div>
          <p className={`text-sm sm:text-xl font-bold font-mono ${totals.net >= 0 ? 'text-success' : 'text-danger'}`}>
            {totals.net >= 0 ? '+' : ''}{formatCurrency(totals.net)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
          {filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="glass-card p-4 sm:p-6 rounded-2xl">
        <div className="space-y-2.5 sm:space-y-3 max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2">
          {filtered.length > 0 ? (
            filtered.map((m) => {
              const isIn = m.direction === 'in';
              return (
                <div
                  key={m.id}
                  className="bg-white/6 p-3 sm:p-4 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all duration-300"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                        isIn
                          ? 'bg-success/20 border-success/30'
                          : 'bg-danger/20 border-danger/30'
                      }`}>
                        {isIn
                          ? <ArrowDownLeft size={16} className="text-success sm:w-[18px] sm:h-[18px]" />
                          : <ArrowUpRight size={16} className="text-danger sm:w-[18px] sm:h-[18px]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {m.clientName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={`badge ${
                            m.kind === 'liquidacion' ? 'badge-info'
                            : m.kind === 'apertura' || m.kind === 'inyeccion' ? 'badge-danger'
                            : m.kind === 'capital' ? 'badge-warning'
                            : 'badge-success'
                          } !text-[9px] sm:!text-[10px] !px-2 !py-0.5`}>
                            {KIND_LABEL[m.kind]}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">
                            <Calendar size={11} />
                            {new Date(m.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-base sm:text-xl font-bold font-mono ${isIn ? 'text-success' : 'text-danger'}`}>
                        {isIn ? '+' : '−'}{formatCurrency(m.amount)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface border border-[var(--border-hover)] flex items-center justify-center">
                <History size={28} className="text-[var(--text-tertiary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-secondary)]">
                No hay movimientos en {monthFullName.toLowerCase()} {sel.year}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Movimientos;
