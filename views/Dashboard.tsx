
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { LoanSummary, Transaction } from '../types';
import { formatCurrency } from '../utils/finance';
import { Search, AlertCircle, CheckCircle2, X, ArrowUpRight, LayoutGrid, List, Trash2, Plus, Minus, History, Calendar, Edit2, Save, Banknote, Percent, DollarSign, TrendingUp, Zap } from 'lucide-react';
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
    green: 'bg-[#3fb950]',
    yellow: 'bg-[#d29922]',
    red: 'bg-[#f85149]'
  };
  const sizes = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' };
  return (
    <div className="relative">
      <div className={`${sizes[size]} rounded-full ${colors[color]}`} />
      <div className={`absolute inset-0 ${sizes[size]} rounded-full ${colors[color]} animate-ping opacity-75`} />
    </div>
  );
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
      const colorOrder = { red: 0, yellow: 1, green: 2 };
      const colorDiff = colorOrder[a.statusColor] - colorOrder[b.statusColor];
      if (colorDiff !== 0) return colorDiff;
      const debtDiff = b.debtMonths - a.debtMonths;
      if (Math.abs(debtDiff) > 0.1) return debtDiff;
      const aLastPayment = a.lastPaymentDate || 0;
      const bLastPayment = b.lastPaymentDate || 0;
      if (aLastPayment !== bLastPayment) return aLastPayment - bLastPayment;
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

  // Stats rápidas
  const totalPending = summaries.reduce((sum, s) => sum + s.pendingInterest, 0);
  const totalCapital = summaries.reduce((sum, s) => sum + Number(s.loan.currentcapital), 0);
  const overdueCount = summaries.filter(s => s.isOverdue).length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#e6edf3] tracking-tight">Cartera Activa</h1>
        <p className="text-[#8b949e] text-xs font-medium uppercase tracking-[0.2em] mt-2">Control de capital operativo</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="metric-card emerald p-4 sm:p-5">
          <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-0">
            <div className="flex items-center gap-2.5 sm:mb-3 relative z-10">
              <div className="w-9 h-9 rounded-lg bg-[#3fb950]/20 border border-[#3fb950]/30 flex items-center justify-center">
                <DollarSign size={18} className="text-[#3fb950]" />
              </div>
              <span className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider sm:block hidden">Pendiente</span>
            </div>
            <div className="flex-1 sm:flex-none">
              <span className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider sm:hidden">Pendiente</span>
              <p className="text-lg sm:text-xl font-bold text-[#e6edf3] font-mono relative z-10">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
        <div className="metric-card blue p-4 sm:p-5">
          <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-0">
            <div className="flex items-center gap-2.5 sm:mb-3 relative z-10">
              <div className="w-9 h-9 rounded-lg bg-[#58a6ff]/20 border border-[#58a6ff]/30 flex items-center justify-center">
                <Banknote size={18} className="text-[#58a6ff]" />
              </div>
              <span className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider sm:block hidden">Capital</span>
            </div>
            <div className="flex-1 sm:flex-none">
              <span className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider sm:hidden">Capital</span>
              <p className="text-lg sm:text-xl font-bold text-[#e6edf3] font-mono relative z-10">{formatCurrency(totalCapital)}</p>
            </div>
          </div>
        </div>
        <div className="metric-card red p-4 sm:p-5">
          <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-0">
            <div className="flex items-center gap-2.5 sm:mb-3 relative z-10">
              <div className="w-9 h-9 rounded-lg bg-[#f85149]/20 border border-[#f85149]/30 flex items-center justify-center">
                <AlertCircle size={18} className="text-[#f85149]" />
              </div>
              <span className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider sm:block hidden">En Mora</span>
            </div>
            <div className="flex-1 sm:flex-none">
              <span className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider sm:hidden">En Mora</span>
              <p className="text-lg sm:text-xl font-bold text-[#e6edf3] font-mono relative z-10">{overdueCount} / {summaries.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6e7681]" size={16} />
          <input
            type="text"
            placeholder="Buscar titular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl input-glass text-sm font-medium"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex bg-[#161b22] p-1 rounded-xl border border-[#30363d]">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#238636] text-white' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#238636] text-white' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}>
              <List size={16} />
            </button>
          </div>
          <div className="flex bg-[#161b22] p-1 rounded-xl border border-[#30363d]">
            <button onClick={() => setFilter('all')} className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${filter === 'all' ? 'bg-[#238636] text-white' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}>
              Todos
            </button>
            <button onClick={() => setFilter('overdue')} className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${filter === 'overdue' ? 'bg-[#f85149] text-white' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}>
              Mora
            </button>
          </div>
        </div>
      </div>

      {/* Grid/List View */}
      {viewMode === 'grid' ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, idx) => {
            const glassColor = s.statusColor === 'red'
              ? 'glass-red'
              : s.statusColor === 'yellow'
              ? 'glass-yellow'
              : 'glass-green';

            return (
              <div
                key={s.loan.id}
                onClick={() => setSelectedLoan(s)}
                className={`glass-card ${glassColor} rounded-2xl p-5 cursor-pointer group animate-fade-in-up hover:scale-[1.02]`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5">
                      <StatusDot color={s.statusColor} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#e6edf3] text-sm tracking-tight truncate group-hover:text-[#58a6ff] transition-colors">
                        {s.client.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-[#6e7681]">
                        <Calendar size={10}/>
                        <span className="text-[10px] font-medium">{new Date(s.loan.startdate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border backdrop-blur-sm ${
                    s.isOverdue
                      ? 'bg-[#f85149]/20 border-[#f85149]/40 text-[#f85149]'
                      : 'bg-[#3fb950]/20 border-[#3fb950]/40 text-[#3fb950]'
                  }`}>
                    {s.isOverdue ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
                  <div className="bg-[#0d1117]/60 p-3.5 rounded-xl border border-[#58a6ff]/20 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-[#58a6ff]/20 border border-[#58a6ff]/30 flex items-center justify-center">
                        <Banknote size={10} className="text-[#58a6ff]" />
                      </div>
                      <span className="text-[9px] font-semibold text-[#6e7681] uppercase tracking-wider">Capital</span>
                    </div>
                    <p className="text-sm font-bold text-[#e6edf3] font-mono">{formatCurrency(s.loan.currentcapital)}</p>
                  </div>
                  <div className="bg-[#0d1117]/60 p-3.5 rounded-xl border border-[#a371f7]/20 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-[#a371f7]/20 border border-[#a371f7]/30 flex items-center justify-center">
                        <Percent size={10} className="text-[#a371f7]" />
                      </div>
                      <span className="text-[9px] font-semibold text-[#6e7681] uppercase tracking-wider">Rédito</span>
                    </div>
                    <p className="text-sm font-bold text-[#e6edf3] font-mono">{formatCurrency(s.monthlyInterestAmount)}</p>
                  </div>
                </div>

                {/* Pending Amount */}
                <div className={`p-4 rounded-xl flex justify-between items-center relative z-10 backdrop-blur-sm ${
                  s.pendingInterest > 0
                    ? s.isOverdue
                      ? 'bg-[#f85149]/10 border border-[#f85149]/30'
                      : 'bg-[#d29922]/10 border border-[#d29922]/30'
                    : 'bg-[#3fb950]/10 border border-[#3fb950]/30'
                }`}>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign size={12} className={s.isOverdue ? 'text-[#f85149]' : s.pendingInterest > 0 ? 'text-[#d29922]' : 'text-[#3fb950]'} />
                      <span className="text-[9px] font-semibold text-[#8b949e] uppercase tracking-wider">Pendiente</span>
                    </div>
                    <span className={`font-bold text-xl font-mono ${
                      s.isOverdue ? 'text-[#f85149]' : s.pendingInterest > 0 ? 'text-[#d29922]' : 'text-[#3fb950]'
                    }`}>
                      {formatCurrency(s.pendingInterest)}
                    </span>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    s.isOverdue ? 'bg-[#f85149]/20 border-[#f85149]/40' : s.pendingInterest > 0 ? 'bg-[#d29922]/20 border-[#d29922]/40' : 'bg-[#3fb950]/20 border-[#3fb950]/40'
                  }`}>
                    <ArrowUpRight size={20} className={`${
                      s.isOverdue ? 'text-[#f85149]' : s.pendingInterest > 0 ? 'text-[#d29922]' : 'text-[#3fb950]'
                    } group-hover:scale-110 transition-transform`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#161b22]/80 border-b border-[#21262d]">
                <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase text-[#8b949e] tracking-wider">Titular</th>
                <th className="px-5 py-4 text-right text-[10px] font-semibold uppercase text-[#8b949e] tracking-wider">Capital</th>
                <th className="px-5 py-4 text-right text-[10px] font-semibold uppercase text-[#8b949e] tracking-wider">Pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {filtered.map((s) => (
                <tr key={s.loan.id} onClick={() => setSelectedLoan(s)} className="hover:bg-[#161b22]/50 cursor-pointer transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <StatusDot color={s.statusColor} size="sm" />
                      <span className="font-semibold text-sm text-[#e6edf3]">{s.client.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-mono font-semibold text-sm text-[#8b949e]">{formatCurrency(s.loan.currentcapital)}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={`font-mono font-bold text-sm ${s.isOverdue ? 'text-[#f85149]' : 'text-[#3fb950]'}`}>
                      {formatCurrency(s.pendingInterest)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="glass-card p-12 rounded-2xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center">
            <Search size={24} className="text-[#6e7681]" />
          </div>
          <p className="text-[#8b949e] font-medium">No se encontraron préstamos</p>
        </div>
      )}

      {/* Modal - Using React Portal to render at document.body */}
      {selectedLoan && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(1, 4, 9, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedLoan(null);
              setIsEditing(false);
              setEditRate('');
              setEditCapital('');
            }
          }}
        >
          <div
            className="animate-slide-up"
            style={{
              background: 'rgba(22, 27, 34, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(48, 54, 61, 0.5)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div className="p-3 sm:p-4 border-b border-[#21262d] flex justify-between items-center bg-[#161b22]/50 flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <DNFusionLogo size={20} className="sm:w-6 sm:h-6" />
                <h2 className="font-semibold text-[10px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[#8b949e]">Control Operativo</h2>
              </div>
              <button
                onClick={() => { setSelectedLoan(null); setIsEditing(false); setEditRate(''); setEditCapital(''); }}
                className="p-2 hover:bg-[#21262d] rounded-lg text-[#8b949e] hover:text-[#e6edf3] transition-colors"
              >
                <X size={20}/>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-12">
                {/* Left Panel */}
                <div className="md:col-span-5 p-4 sm:p-5 space-y-3 sm:space-y-4 md:border-r border-[#21262d]">
                  {/* Client Card */}
                  <div className="bg-gradient-to-br from-[#238636] to-[#2ea043] rounded-xl p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                    <div className="flex justify-between items-start mb-2 relative">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-semibold opacity-80 mb-1 uppercase tracking-wider">Titular</p>
                        <p className="text-base sm:text-lg font-bold tracking-tight truncate">{selectedLoan.client.name}</p>
                      </div>
                      {!isEditing && (
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setEditRate(selectedLoan.loan.monthlyrate.toString());
                            setEditCapital(selectedLoan.loan.currentcapital.toString());
                          }}
                          className="p-1.5 hover:bg-white/20 rounded-lg transition-all"
                          title="Editar préstamo"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/20 relative">
                        <div>
                          <p className="text-[9px] font-semibold opacity-80 uppercase mb-1">Capital</p>
                          <input
                            type="number"
                            value={editCapital}
                            onChange={(e) => setEditCapital(e.target.value)}
                            className="w-full bg-white/20 backdrop-blur border border-white/30 rounded-lg px-2 py-2 text-sm font-bold text-white placeholder-white/50 focus:outline-none focus:border-white/50"
                            placeholder="Capital"
                          />
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold opacity-80 uppercase mb-1">Tasa %</p>
                          <input
                            type="number"
                            step="0.1"
                            value={editRate}
                            onChange={(e) => setEditRate(e.target.value)}
                            className="w-full bg-white/20 backdrop-blur border border-white/30 rounded-lg px-2 py-2 text-sm font-bold text-white placeholder-white/50 focus:outline-none focus:border-white/50"
                            placeholder="Tasa"
                          />
                        </div>
                        <div className="col-span-2 flex gap-2 mt-1">
                          <button
                            onClick={() => {
                              onUpdateLoan(selectedLoan.loan.id, Number(editRate), Number(editCapital));
                              setIsEditing(false);
                              setSelectedLoan(null);
                            }}
                            className="flex-1 py-2 bg-white text-[#238636] rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all hover:bg-white/90 flex items-center justify-center gap-2"
                          >
                            <Save size={14} /> Guardar
                          </button>
                          <button
                            onClick={() => { setIsEditing(false); setEditRate(''); setEditCapital(''); }}
                            className="px-3 py-2 bg-white/20 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all hover:bg-white/30"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-white/20 relative">
                        <div>
                          <p className="text-[8px] font-semibold opacity-80 uppercase mb-0.5">Capital</p>
                          <p className="font-bold text-sm font-mono">{formatCurrency(selectedLoan.loan.currentcapital)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-semibold opacity-80 uppercase mb-0.5">Tasa</p>
                          <p className="font-bold text-sm font-mono">{selectedLoan.loan.monthlyrate}%</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Form */}
                  <form onSubmit={handleQuickPayment} className="space-y-2">
                    <div className="flex items-center bg-[#161b22] rounded-xl border border-[#30363d] p-1">
                      <button type="button" onClick={() => adjustPayment(-10000)} className="p-2 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg transition-colors">
                        <Minus size={16}/>
                      </button>
                      <input
                        type="number"
                        required
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full py-2 bg-transparent text-xl font-bold text-center text-[#e6edf3] focus:outline-none font-mono"
                        placeholder="0"
                      />
                      <button type="button" onClick={() => adjustPayment(10000)} className="p-2 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg transition-colors">
                        <Plus size={16}/>
                      </button>
                    </div>
                    <button type="submit" className="w-full py-3 rounded-xl btn-primary font-semibold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2">
                      <Zap size={14} /> Registrar Abono
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        showConfirm(
                          'Liquidar Operación',
                          '¿Estás seguro de que deseas liquidar esta operación? El préstamo será marcado como inactivo.',
                          () => { onSettle(selectedLoan.loan.id); setSelectedLoan(null); },
                          'warning',
                          'Liquidar',
                          'Cancelar'
                        );
                      }}
                      className="w-full py-2.5 text-[9px] font-semibold uppercase tracking-wider text-[#d29922] border border-[#d29922]/40 rounded-xl hover:bg-[#d29922]/10 transition-colors"
                    >
                      Liquidar Préstamo
                    </button>
                  </form>
                </div>

                {/* Right Panel - Transactions */}
                <div className="md:col-span-7 p-3 sm:p-5 space-y-2 sm:space-y-3 bg-[#0d1117]/50 border-t md:border-t-0 border-[#21262d]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-semibold uppercase text-[#8b949e] tracking-wider flex items-center gap-2">
                      <History size={14} className="text-[#58a6ff]" /> Historial
                    </h3>
                    <button
                      onClick={() => { onDeleteLoan(selectedLoan.loan.id); setSelectedLoan(null); }}
                      className="text-[9px] font-semibold text-[#f85149] hover:text-[#f85149]/80 uppercase flex items-center gap-1.5 transition-colors px-2 py-1.5 rounded-lg hover:bg-[#f85149]/10"
                    >
                      <Trash2 size={12}/> Eliminar
                    </button>
                  </div>

                  <div className="space-y-1.5 overflow-y-auto pr-1 max-h-[200px] sm:max-h-[280px]">
                    {transactions.filter(t => t.loanid === selectedLoan.loan.id).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-[#6e7681]">
                        <History size={28} className="mb-2 opacity-50" />
                        <p className="text-sm font-medium">Sin movimientos</p>
                      </div>
                    ) : (
                      transactions.filter(t => t.loanid === selectedLoan.loan.id).map((t, idx) => (
                        <div key={idx} className="bg-[#161b22]/80 p-2.5 sm:p-3 rounded-lg border border-[#21262d] flex justify-between items-center hover:border-[#30363d] transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-semibold text-[#e6edf3] truncate">{t.description}</p>
                            <p className="text-[9px] font-medium text-[#6e7681] mt-0.5">{new Date(t.date).toLocaleDateString()}</p>
                          </div>
                          <p className={`text-xs sm:text-sm font-bold font-mono ml-2 ${t.amount === 0 ? 'text-[#6e7681]' : 'text-[#3fb950]'}`}>
                            {t.amount > 0 ? `+${formatCurrency(t.amount)}` : 'SIS'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Dashboard;
