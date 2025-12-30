
import React, { useState } from 'react';
import { LoanSummary, Transaction } from '../types';
import { formatCurrency } from '../utils/finance';
import { Search, AlertCircle, CheckCircle2, X, ArrowUpRight, LayoutGrid, List, Trash2, Plus, Minus, History, Calendar, Info, Edit2, Save } from 'lucide-react';
import { DNFusionLogo } from '../App';

interface Props {
  summaries: LoanSummary[];
  transactions: Transaction[];
  onPayment: (loanId: string, amount: number) => void;
  onSettle: (loanId: string) => void;
  onDeleteLoan: (loanId: string) => void;
  onUpdateLoan: (loanId: string, monthlyrate?: number, currentcapital?: number, initialcapital?: number) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'warning' | 'info', confirmText?: string, cancelText?: string) => void;
}

const StatusDot = ({ color, size = "md" }: { color: 'green' | 'yellow' | 'red', size?: 'sm' | 'md' | 'lg' }) => {
  const colors = {
    green: 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]',
    yellow: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]',
    red: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
  };
  const sizes = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3.5 h-3.5' };
  return <div className={`${sizes[size]} rounded-full ${colors[color]} animate-pulse`} />;
};

const Dashboard: React.FC<Props> = ({ summaries, transactions, onPayment, onSettle, onDeleteLoan, onUpdateLoan, showConfirm }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'overdue'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedLoan, setSelectedLoan] = useState<LoanSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editRate, setEditRate] = useState('');
  const [editCapital, setEditCapital] = useState('');

  const filtered = summaries
    .filter(s => {
      const matchesSearch = s.client.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' || s.isOverdue;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      // Ordenar del más atrasado al más al día
      // 1. Por color: rojo > amarillo > verde
      const colorOrder = { red: 0, yellow: 1, green: 2 };
      const colorDiff = colorOrder[a.statusColor] - colorOrder[b.statusColor];
      if (colorDiff !== 0) return colorDiff;
      
      // 2. Si mismo color, ordenar por meses de deuda (más deuda primero)
      const debtDiff = b.debtMonths - a.debtMonths;
      if (Math.abs(debtDiff) > 0.1) return debtDiff;
      
      // 3. Si misma deuda, ordenar por fecha del último pago (más antiguo primero)
      const aLastPayment = a.lastPaymentDate || 0;
      const bLastPayment = b.lastPaymentDate || 0;
      if (aLastPayment !== bLastPayment) return aLastPayment - bLastPayment;
      
      // 4. Si todo igual, ordenar alfabéticamente por nombre
      return a.client.name.localeCompare(b.client.name);
    });

  const handleQuickPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLoan && paymentAmount && Number(paymentAmount) > 0) {
      onPayment(selectedLoan.loan.id, Number(paymentAmount));
      setSelectedLoan(null);
      setPaymentAmount('');
    }
  };

  const adjustPayment = (delta: number) => {
    const current = Number(paymentAmount) || 0;
    setPaymentAmount(String(Math.max(0, current + delta)));
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-gradient">Cartera Activa</h1>
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-1">Control de capital operativo</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-600'}`}><LayoutGrid size={16} /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-600'}`}><List size={16} /></button>
          </div>
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Todos</button>
            <button onClick={() => setFilter('overdue')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'overdue' ? 'bg-rose-600 text-white' : 'text-slate-600'}`}>Mora</button>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
        <input type="text" placeholder="Buscar titular..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-6 py-3.5 rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl text-xs font-semibold placeholder:text-slate-700" />
      </div>

      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.loan.id} onClick={() => setSelectedLoan(s)} className="glass-card bg-slate-900/80 rounded-[1.5rem] p-5 cursor-pointer relative overflow-hidden group border border-white/10 hover:border-indigo-500/40">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1"><StatusDot color={s.statusColor} /></div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm tracking-tight truncate group-hover:text-indigo-300">{s.client.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5 opacity-40">
                      <Calendar size={10}/><span className="text-[8px] font-bold uppercase tracking-widest">{new Date(s.loan.startdate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className={`p-1.5 rounded-xl border ${s.isOverdue ? 'bg-rose-500/15 border-rose-500/30 text-rose-500' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'}`}>
                  {s.isOverdue ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                  <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1">Capital Base</p>
                  <p className="text-[11px] font-black text-slate-300">{formatCurrency(s.loan.currentcapital)}</p>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                  <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1">Rédito Mes</p>
                  <p className="text-[11px] font-black text-indigo-400">{formatCurrency(s.monthlyInterestAmount)}</p>
                </div>
              </div>
              <div className={`p-3.5 rounded-xl flex justify-between items-center ${s.pendingInterest > 0 ? (s.isOverdue ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/20') : 'bg-white/5 text-slate-500 border border-white/10'}`}>
                <div className="flex flex-col">
                  <span className="text-[7px] uppercase font-black tracking-widest opacity-60">PENDIENTE</span>
                  <span className="font-black text-lg tracking-tighter">{formatCurrency(s.pendingInterest)}</span>
                </div>
                <ArrowUpRight size={18} className="opacity-40" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border border-white/10 bg-slate-900/80">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-5 py-3 text-[8px] font-black uppercase text-slate-500 tracking-widest">Titular</th>
                <th className="px-5 py-3 text-[8px] font-black uppercase text-slate-500 tracking-widest text-right">Pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((s) => (
                <tr key={s.loan.id} onClick={() => setSelectedLoan(s)} className="hover:bg-white/[0.05] cursor-pointer">
                  <td className="px-5 py-4 flex items-center gap-3"><StatusDot color={s.statusColor} size="sm" /><span className="font-bold text-[11px]">{s.client.name}</span></td>
                  <td className="px-5 py-4 text-right"><span className={`font-black text-xs ${s.isOverdue ? 'text-rose-500' : 'text-indigo-400'}`}>{formatCurrency(s.pendingInterest)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedLoan && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-4xl rounded-[1.75rem] overflow-hidden border-white/20">
            <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
               <div className="flex items-center gap-3 pl-3"><DNFusionLogo size={20} /><h2 className="font-black text-[9px] uppercase tracking-[0.4em] text-slate-400">Control Operativo</h2></div>
               <button onClick={() => { setSelectedLoan(null); setIsEditing(false); setEditRate(''); setEditCapital(''); }} className="p-2.5 hover:bg-white/10 rounded-xl text-slate-500"><X size={20}/></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 max-h-[85vh] overflow-y-auto">
              <div className="md:col-span-5 p-6 space-y-6 border-r border-white/10 bg-white/5">
                <div className="bg-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden">
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex-1">
                      <p className="text-[9px] font-black opacity-70 mb-1.5 uppercase tracking-widest">Titular</p>
                      <p className="text-xl font-black tracking-tight truncate">{selectedLoan.client.name}</p>
                    </div>
                    {!isEditing && (
                      <button 
                        onClick={() => {
                          setIsEditing(true);
                          setEditRate(selectedLoan.loan.monthlyrate.toString());
                          setEditCapital(selectedLoan.loan.currentcapital.toString());
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-all"
                        title="Editar préstamo"
                      >
                        <Edit2 size={16} className="opacity-70" />
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-4 mt-6 border-t border-white/20 pt-5">
                      <div>
                        <p className="text-[8px] font-black opacity-70 uppercase mb-1">Base</p>
                        <input
                          type="number"
                          value={editCapital}
                          onChange={(e) => setEditCapital(e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-base font-black focus:outline-none focus:border-white/40"
                          placeholder="Capital"
                        />
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black opacity-70 uppercase mb-1">Tasa %</p>
                        <input
                          type="number"
                          step="0.1"
                          value={editRate}
                          onChange={(e) => setEditRate(e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-base font-black text-right focus:outline-none focus:border-white/40"
                          placeholder="Tasa"
                        />
                      </div>
                      <div className="col-span-2 flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            onUpdateLoan(
                              selectedLoan.loan.id,
                              Number(editRate),
                              Number(editCapital)
                            );
                            setIsEditing(false);
                            setSelectedLoan(null);
                          }}
                          className="flex-1 py-2.5 bg-white/20 hover:bg-white/30 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <Save size={14} /> Guardar
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditRate('');
                            setEditCapital('');
                          }}
                          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 mt-6 border-t border-white/20 pt-5">
                      <div><p className="text-[8px] font-black opacity-70 uppercase mb-1">Base</p><p className="font-black text-base">{formatCurrency(selectedLoan.loan.currentcapital)}</p></div>
                      <div className="text-right"><p className="text-[8px] font-black opacity-70 uppercase mb-1">Tasa</p><p className="font-black text-base">{selectedLoan.loan.monthlyrate}%</p></div>
                    </div>
                  )}
                </div>
                <form onSubmit={handleQuickPayment} className="space-y-4">
                  <div className="flex items-center bg-slate-950/80 rounded-[1rem] border border-white/10 p-1.5">
                    <button type="button" onClick={() => adjustPayment(-10000)} className="p-2.5 text-slate-600 hover:text-indigo-400"><Minus size={18}/></button>
                    <input type="number" required value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full py-3 bg-transparent text-2xl font-black text-center text-white focus:outline-none" placeholder="0" />
                    <button type="button" onClick={() => adjustPayment(10000)} className="p-2.5 text-slate-600 hover:text-indigo-400"><Plus size={18}/></button>
                  </div>
                  <button type="submit" className="w-full py-4 rounded-xl font-black bg-indigo-600 hover:bg-indigo-500 text-[10px] uppercase tracking-widest transition-all">Registrar Abono</button>
                  <button 
                    type="button" 
                    onClick={() => {
                      showConfirm(
                        'Liquidar Operación',
                        '¿Estás seguro de que deseas liquidar esta operación? El préstamo será marcado como inactivo.',
                        () => {
                          onSettle(selectedLoan.loan.id);
                          setSelectedLoan(null);
                        },
                        'warning',
                        'Liquidar',
                        'Cancelar'
                      );
                    }} 
                    className="w-full py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400 border border-emerald-400/20 rounded-xl"
                  >
                    Liquidar Base
                  </button>
                </form>
              </div>
              <div className="md:col-span-7 p-6 space-y-6 bg-slate-950/50 flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2"><History size={16} className="text-indigo-400" /> Movimientos</h3>
                  <button onClick={() => { onDeleteLoan(selectedLoan.loan.id); setSelectedLoan(null); }} className="text-[9px] font-bold text-rose-500/40 hover:text-rose-500 uppercase flex items-center gap-1.5 transition-colors"><Trash2 size={14}/> Purgar</button>
                </div>
                <div className="flex-1 space-y-2.5 overflow-y-auto pr-1.5 custom-scrollbar min-h-[250px]">
                  {transactions.filter(t => t.loanid === selectedLoan.loan.id).map((t, idx) => (
                    <div key={idx} className="bg-white/5 p-3.5 rounded-xl border border-white/5 flex justify-between items-center border-l-2 border-l-indigo-600/40">
                      <div><p className="text-[10px] font-black uppercase text-slate-200">{t.description}</p><p className="text-[8px] font-bold text-slate-600 uppercase mt-0.5">{new Date(t.date).toLocaleDateString()}</p></div>
                      <p className={`text-xs font-black ${t.amount === 0 ? 'text-blue-400' : 'text-emerald-400'}`}>{t.amount > 0 ? `+${formatCurrency(t.amount)}` : 'SISTEMA'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
