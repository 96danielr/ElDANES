
import React, { useMemo } from 'react';
import { LoanSummary, Transaction } from '../types';
import { formatCurrency } from '../utils/finance';
import { Receipt, Calendar, DollarSign, ArrowDownRight, History } from 'lucide-react';

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
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-6">
        <h1 className="text-xl font-black tracking-tight text-[rgb(51,65,85)]">
          Movimientos
        </h1>
        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">
          Últimas 20 transacciones
        </p>
      </div>

      <div className="glass-card p-6 sm:p-7 rounded-[2rem] border border-slate-200/50">
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((t, idx) => (
              <div
                key={t.id || idx}
                className="glass-card p-4 rounded-xl border border-slate-200/50 hover:border-slate-300/70 transition-all duration-300 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200/50 flex items-center justify-center flex-shrink-0">
                        <ArrowDownRight
                          size={18}
                          className="text-slate-700"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 truncate">
                          {t.client.name}
                        </p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase truncate">
                          {t.description || 'Pago registrado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-0 sm:ml-[52px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-600" />
                        <p className="text-[9px] font-bold text-slate-500 uppercase">
                          {new Date(Number(t.date)).toLocaleDateString(
                            'es-ES',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </p>
                      </div>
                      {t.loan && (
                        <div className="flex items-center gap-1.5">
                          <DollarSign size={12} className="text-slate-600" />
                          <p className="text-[9px] font-bold text-slate-500 uppercase">
                            {formatCurrency(Number(t.loan.currentcapital))}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg sm:text-xl font-black text-slate-900">
                        +{formatCurrency(Number(t.amount))}
                      </p>
                      <p className="text-[8px] font-bold text-slate-600 uppercase mt-0.5">
                        Abono
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <History
                size={48}
                className="text-slate-600 mx-auto mb-4 opacity-50"
              />
              <p className="text-sm font-bold text-slate-500 uppercase">
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

