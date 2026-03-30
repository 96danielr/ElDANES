
import React, { useMemo, useState } from 'react';
import { LoanSummary, Transaction } from '../types';
import { formatCurrency } from '../utils/finance';
import { Calendar, DollarSign, ArrowDownRight, History, Receipt } from 'lucide-react';

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

interface Props {
  summaries: LoanSummary[];
  transactions: Transaction[];
}

const Movimientos: React.FC<Props> = ({ summaries, transactions }) => {
  const monthOptions = useMemo(() => getLastSixMonths(), []);
  const [selectedMonth, setSelectedMonth] = useState(0); // index into monthOptions

  const filteredTransactions = useMemo(() => {
    const { year, month } = monthOptions[selectedMonth];
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();

    return transactions
      .filter((t) => {
        const ts = Number(t.date);
        return Number(t.amount) > 0 && ts >= start && ts < end;
      })
      .sort((a, b) => Number(b.date) - Number(a.date))
      .map((t) => {
        const loan = summaries.find((s) => s.loan.id === t.loanid);
        return {
          ...t,
          client: loan?.client || {
            id: '',
            name: 'Desconocido',
            phone: '',
            createdat: 0,
          },
          loan: loan?.loan || null,
        };
      });
  }, [transactions, summaries, selectedMonth, monthOptions]);

  const totalCollected = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + Number(t.amount), 0),
    [filteredTransactions]
  );

  const sel = monthOptions[selectedMonth];
  const monthFullName =
    MESES_ES[sel.month].charAt(0).toUpperCase() + MESES_ES[sel.month].slice(1);

  return (
    <div className="space-y-4 sm:space-y-6 pb-10 animate-fade-in-up">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center justify-center gap-2 sm:gap-3">
          <Receipt size={20} className="text-success sm:w-6 sm:h-6" />
          Movimientos
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

      {/* Summary */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
          {filteredTransactions.length} transaccion{filteredTransactions.length !== 1 ? 'es' : ''}
        </p>
        <p className="text-xs sm:text-sm font-bold text-success font-mono">
          Total: {formatCurrency(totalCollected)}
        </p>
      </div>

      <div className="glass-card p-4 sm:p-6 rounded-2xl">
        <div className="space-y-2.5 sm:space-y-3 max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((t, idx) => (
              <div
                key={t.id || idx}
                className="bg-white/6 p-3 sm:p-4 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all duration-300 group"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 sm:gap-3 mb-1.5 sm:mb-2">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-success/20 border border-success/30 flex items-center justify-center flex-shrink-0">
                        <ArrowDownRight size={16} className="text-success sm:w-[18px] sm:h-[18px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {t.client.name}
                        </p>
                        <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase truncate">
                          {t.description || 'Pago registrado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-0 sm:ml-[52px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-[var(--text-tertiary)]" />
                        <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">
                          {new Date(Number(t.date)).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      {t.loan && (
                        <div className="flex items-center gap-1.5">
                          <DollarSign size={12} className="text-[var(--text-tertiary)]" />
                          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase font-mono">
                            {formatCurrency(Number(t.loan.currentcapital))}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg sm:text-xl font-bold text-success font-mono">
                        +{formatCurrency(Number(t.amount))}
                      </p>
                      <p className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase mt-0.5">
                        Abono
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface border border-[var(--border-hover)] flex items-center justify-center">
                <History size={28} className="text-[var(--text-tertiary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-secondary)]">
                No hay transacciones en {monthFullName.toLowerCase()} {sel.year}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Movimientos;
