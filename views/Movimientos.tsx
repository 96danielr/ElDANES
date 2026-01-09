
import React, { useMemo } from 'react';
import { LoanSummary, Transaction } from '../types';
import { formatCurrency } from '../utils/finance';
import { Calendar, DollarSign, ArrowDownRight, History, Receipt } from 'lucide-react';

interface Props {
  summaries: LoanSummary[];
  transactions: Transaction[];
}

const Movimientos: React.FC<Props> = ({ summaries, transactions }) => {
  const recentTransactions = useMemo(() => {
    return transactions
      .filter((t) => Number(t.amount) > 0)
      .sort((a, b) => Number(b.date) - Number(a.date))
      .slice(0, 20)
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
  }, [transactions, summaries]);

  return (
    <div className="space-y-6 pb-10 animate-fade-in-up">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#e6edf3] tracking-tight flex items-center justify-center gap-3">
          <Receipt size={24} className="text-[#3fb950]" />
          Movimientos
        </h1>
        <p className="text-[#8b949e] text-xs font-medium uppercase tracking-[0.2em] mt-2">
          Últimas 20 transacciones
        </p>
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((t, idx) => (
              <div
                key={t.id || idx}
                className="bg-[#161b22]/80 p-4 rounded-xl border border-[#21262d] hover:border-[#30363d] transition-all duration-300 group"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-[#3fb950]/20 border border-[#3fb950]/30 flex items-center justify-center flex-shrink-0">
                        <ArrowDownRight size={18} className="text-[#3fb950]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#e6edf3] truncate">
                          {t.client.name}
                        </p>
                        <p className="text-[10px] font-semibold text-[#8b949e] uppercase truncate">
                          {t.description || 'Pago registrado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-0 sm:ml-[52px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-[#6e7681]" />
                        <p className="text-[10px] font-semibold text-[#6e7681] uppercase">
                          {new Date(Number(t.date)).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      {t.loan && (
                        <div className="flex items-center gap-1.5">
                          <DollarSign size={12} className="text-[#6e7681]" />
                          <p className="text-[10px] font-semibold text-[#6e7681] uppercase font-mono">
                            {formatCurrency(Number(t.loan.currentcapital))}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg sm:text-xl font-bold text-[#3fb950] font-mono">
                        +{formatCurrency(Number(t.amount))}
                      </p>
                      <p className="text-[9px] font-semibold text-[#8b949e] uppercase mt-0.5">
                        Abono
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center">
                <History size={28} className="text-[#6e7681]" />
              </div>
              <p className="text-sm font-semibold text-[#8b949e]">
                No hay transacciones registradas
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Movimientos;
