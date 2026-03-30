
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { LoanSummary, Transaction } from '../types';
import { formatCurrency } from '../utils/finance';
import { Search, AlertCircle, CheckCircle2, X, ArrowUpRight, LayoutGrid, List, Trash2, Plus, Minus, History, Calendar, Edit2, Save, Banknote, Percent, DollarSign, TrendingUp, Zap, Tag } from 'lucide-react';
import { DNFusionLogo } from '../App';

interface Props {
  summaries: LoanSummary[];
  transactions: Transaction[];
  onPayment: (loanId: string, amount: number, paymentType: 'interest' | 'capital' | 'mixed') => void;
  onSettle: (loanId: string) => void;
  onDeleteLoan: (loanId: string) => void;
  onUpdateLoan: (loanId: string, monthlyrate?: number, currentcapital?: number, initialcapital?: number, owner?: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'warning' | 'info', confirmText?: string, cancelText?: string) => void;
}

const StatusDot = ({ color, size = "md" }: { color: 'green' | 'yellow' | 'red', size?: 'sm' | 'md' | 'lg' }) => {
  const colors = {
    green: 'bg-success',
    yellow: 'bg-warning',
    red: 'bg-danger'
  };
  const sizes = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' };
  return (
    <div className="relative">
      <div className={`${sizes[size]} rounded-full ${colors[color]}`} />
      <div className={`absolute inset-0 ${sizes[size]} rounded-full ${colors[color]} animate-ping opacity-75`} />
    </div>
  );
};

const OWNER_OPTIONS = ['Juntos', 'Daniel', 'Néstor'] as const;

const ownerStyles: Record<string, { bg: string; text: string; border: string; letter: string }> = {
  'Juntos': { bg: 'bg-dpurple/15', text: 'text-dpurple', border: 'border-dpurple/30', letter: 'J' },
  'Daniel': { bg: 'bg-accent/15', text: 'text-accent', border: 'border-accent/30', letter: 'D' },
  'Néstor': { bg: 'bg-cyan/15', text: 'text-cyan', border: 'border-cyan/30', letter: 'N' },
};

const OwnerBadge = ({ owner }: { owner: string }) => {
  const style = ownerStyles[owner] || ownerStyles['Juntos'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
      {style.letter}
    </span>
  );
};

const Dashboard: React.FC<Props> = ({ summaries, transactions, onPayment, onSettle, onDeleteLoan, onUpdateLoan, showConfirm }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'overdue'>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedLoan, setSelectedLoan] = useState<LoanSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editRate, setEditRate] = useState('');
  const [editCapital, setEditCapital] = useState('');
  const [paymentType, setPaymentType] = useState<'interest' | 'capital' | 'mixed'>('interest');

  // Filtro por owner: D/N también incluyen los de Juntos (participación compartida)
  const ownerMatchesCard = (owner: string) => {
    if (ownerFilter === 'all') return true;
    if (ownerFilter === 'Juntos') return owner === 'Juntos';
    // Daniel o Néstor → mostrar sus propios + los de Juntos
    return owner === ownerFilter || owner === 'Juntos';
  };

  const filtered = summaries
    .filter(s => {
      const matchesSearch = s.client.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' || s.isOverdue;
      const matchesOwner = ownerMatchesCard(s.loan.owner || 'Juntos');
      return matchesSearch && matchesFilter && matchesOwner;
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
      onPayment(selectedLoan.loan.id, Number(paymentAmount), paymentType);
      setSelectedLoan(null);
      setPaymentAmount('');
      setPaymentType('interest');
    }
  };

  const adjustPayment = (delta: number) => {
    const current = Number(paymentAmount) || 0;
    setPaymentAmount(String(Math.max(0, current + delta)));
  };

  // Factor de participación: Juntos = 50% cuando se filtra por D o N
  const ownerShare = (s: LoanSummary) => {
    if (ownerFilter === 'all' || ownerFilter === 'Juntos') return 1;
    return (s.loan.owner || 'Juntos') === 'Juntos' ? 0.5 : 1;
  };

  // Stats rápidas — con participación proporcional
  const totalPending = filtered.reduce((sum, s) => sum + s.pendingInterest * ownerShare(s), 0);
  const totalCapital = filtered.reduce((sum, s) => sum + Number(s.loan.currentcapital) * ownerShare(s), 0);
  const totalMonthlyRevenue = filtered.reduce((sum, s) => sum + s.monthlyInterestAmount * ownerShare(s), 0);
  const overdueCount = filtered.filter(s => s.isOverdue).length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">EL DANES</h1>
        <p className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-[0.2em] mt-2">
          {ownerFilter === 'all' ? 'World Map — Cartera Activa' : `${ownerFilter} — ${filtered.length} préstamos`}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="metric-card emerald p-4 sm:p-5">
          <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-0">
            <div className="flex items-center gap-2.5 sm:mb-3 relative z-10">
              <div className="w-9 h-9 rounded-lg bg-success/12 border border-success/25 flex items-center justify-center">
                <DollarSign size={18} className="text-success" />
              </div>
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider sm:block hidden">Pendiente</span>
            </div>
            <div className="flex-1 sm:flex-none">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider sm:hidden">Pendiente</span>
              <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-mono relative z-10">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
        <div className="metric-card blue p-4 sm:p-5">
          <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-0">
            <div className="flex items-center gap-2.5 sm:mb-3 relative z-10">
              <div className="w-9 h-9 rounded-lg bg-accent/12 border border-accent/25 flex items-center justify-center">
                <Banknote size={18} className="text-accent" />
              </div>
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider sm:block hidden">Capital</span>
            </div>
            <div className="flex-1 sm:flex-none">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider sm:hidden">Capital</span>
              <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-mono relative z-10">{formatCurrency(totalCapital)}</p>
            </div>
          </div>
        </div>
        <div className="metric-card purple p-4 sm:p-5">
          <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-0">
            <div className="flex items-center gap-2.5 sm:mb-3 relative z-10">
              <div className="w-9 h-9 rounded-lg bg-dpurple/12 border border-dpurple/25 flex items-center justify-center">
                <TrendingUp size={18} className="text-dpurple" />
              </div>
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider sm:block hidden">Rédito Mes</span>
            </div>
            <div className="flex-1 sm:flex-none">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider sm:hidden">Rédito Mes</span>
              <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-mono relative z-10">{formatCurrency(totalMonthlyRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={16} />
          <input
            type="text"
            placeholder="Buscar titular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl input-glass text-sm font-medium"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex bg-white/8 p-1 rounded-xl border border-[var(--border-default)]">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-success text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-success text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              <List size={16} />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-white/8 p-1 rounded-xl border border-[var(--border-default)]">
              {(['all', 'Juntos', 'Daniel', 'Néstor'] as const).map((opt) => {
                const isActive = ownerFilter === opt;
                const label = opt === 'all' ? '✦' : (ownerStyles[opt]?.letter || opt[0]);
                const activeClass = opt === 'all'
                  ? 'bg-white/15 text-[var(--text-primary)]'
                  : `${ownerStyles[opt]?.bg} ${ownerStyles[opt]?.text}`;
                return (
                  <button
                    key={opt}
                    onClick={() => setOwnerFilter(ownerFilter === opt ? 'all' : opt)}
                    className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all ${
                      isActive ? activeClass : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex bg-white/8 p-1 rounded-xl border border-[var(--border-default)]">
              <button onClick={() => setFilter('all')} className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${filter === 'all' ? 'bg-success text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                Todos
              </button>
              <button onClick={() => setFilter('overdue')} className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${filter === 'overdue' ? 'bg-danger text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                Mora
              </button>
            </div>
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
                      <h3 className="font-bold text-[var(--text-primary)] text-sm tracking-tight truncate group-hover:text-accent transition-colors">
                        {s.client.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-[var(--text-tertiary)]">
                        <Calendar size={10}/>
                        <span className="text-[10px] font-medium">{new Date(s.loan.startdate).toLocaleDateString()}</span>
                        <OwnerBadge owner={s.loan.owner || 'Juntos'} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDeleteLoan(s.loan.id); }}
                      className="p-2 rounded-xl bg-danger/10 border border-danger/25 text-danger hover:bg-danger/20 transition-all"
                      title="Eliminar préstamo"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className={`p-2.5 rounded-xl border backdrop-blur-sm ${
                      s.isOverdue
                        ? 'bg-danger/12 border-danger/30 text-danger'
                        : 'bg-success/12 border-success/30 text-success'
                    }`}>
                      {s.isOverdue ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
                  <div className="bg-white/6 p-3.5 rounded-xl border border-accent/15 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-accent/12 border border-accent/25 flex items-center justify-center">
                        <Banknote size={10} className="text-accent" />
                      </div>
                      <span className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Capital</span>
                    </div>
                    <p className="text-sm font-bold text-[var(--text-primary)] font-mono">{formatCurrency(s.loan.currentcapital)}</p>
                  </div>
                  <div className="bg-white/6 p-3.5 rounded-xl border border-dpurple/15 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-dpurple/12 border border-dpurple/25 flex items-center justify-center">
                        <Percent size={10} className="text-dpurple" />
                      </div>
                      <span className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Rédito</span>
                    </div>
                    <p className="text-sm font-bold text-[var(--text-primary)] font-mono">{formatCurrency(s.monthlyInterestAmount)}</p>
                  </div>
                </div>

                {/* Pending Amount */}
                <div className={`p-4 rounded-xl flex justify-between items-center relative z-10 backdrop-blur-sm ${
                  s.pendingInterest > 0
                    ? s.isOverdue
                      ? 'bg-danger/8 border border-danger/25'
                      : 'bg-warning/8 border border-warning/25'
                    : 'bg-success/8 border border-success/25'
                }`}>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign size={12} className={s.isOverdue ? 'text-danger' : s.pendingInterest > 0 ? 'text-warning' : 'text-success'} />
                      <span className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Pendiente</span>
                    </div>
                    <span className={`font-bold text-xl font-mono ${
                      s.isOverdue ? 'text-danger' : s.pendingInterest > 0 ? 'text-warning' : 'text-success'
                    }`}>
                      {formatCurrency(s.pendingInterest)}
                    </span>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    s.isOverdue ? 'bg-danger/12 border-danger/30' : s.pendingInterest > 0 ? 'bg-warning/12 border-warning/30' : 'bg-success/12 border-success/30'
                  }`}>
                    <ArrowUpRight size={20} className={`${
                      s.isOverdue ? 'text-danger' : s.pendingInterest > 0 ? 'text-warning' : 'text-success'
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
              <tr className="bg-white/8 border-b border-[var(--border-default)]">
                <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase text-[var(--text-secondary)] tracking-wider">Titular</th>
                <th className="px-5 py-4 text-center text-[10px] font-semibold uppercase text-[var(--text-secondary)] tracking-wider">Owner</th>
                <th className="px-5 py-4 text-right text-[10px] font-semibold uppercase text-[var(--text-secondary)] tracking-wider">Capital</th>
                <th className="px-5 py-4 text-right text-[10px] font-semibold uppercase text-[var(--text-secondary)] tracking-wider">Pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {filtered.map((s) => (
                <tr key={s.loan.id} onClick={() => setSelectedLoan(s)} className="hover:bg-surface-hover cursor-pointer transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <StatusDot color={s.statusColor} size="sm" />
                      <span className="font-semibold text-sm text-[var(--text-primary)]">{s.client.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <OwnerBadge owner={s.loan.owner || 'Juntos'} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-mono font-semibold text-sm text-[var(--text-secondary)]">{formatCurrency(s.loan.currentcapital)}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={`font-mono font-bold text-sm ${s.isOverdue ? 'text-danger' : 'text-success'}`}>
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/8 border border-[var(--border-default)] flex items-center justify-center">
            <Search size={24} className="text-[var(--text-tertiary)]" />
          </div>
          <p className="text-[var(--text-secondary)] font-medium">No se encontraron préstamos</p>
        </div>
      )}

      {/* Modal - Using React Portal to render at document.body */}
      {selectedLoan && createPortal(
        <div
          className="modal-overlay"
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
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedLoan(null);
              setIsEditing(false);
              setEditRate('');
              setEditCapital('');
              setPaymentType('interest');
            }
          }}
        >
          <div
            className="animate-slide-up bg-deep border border-[var(--border-default)]"
            style={{
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
            <div className="p-3 sm:p-4 border-b border-[var(--border-default)] flex justify-between items-center bg-white/5 flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <DNFusionLogo size={20} className="sm:w-6 sm:h-6" />
                <h2 className="font-semibold text-[10px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[var(--text-secondary)]">Control Operativo</h2>
              </div>
              <button
                onClick={() => { setSelectedLoan(null); setIsEditing(false); setEditRate(''); setEditCapital(''); setPaymentType('interest'); }}
                className="p-2 hover:bg-surface-hover rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={20}/>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-12">
                {/* Left Panel */}
                <div className="md:col-span-5 p-4 sm:p-5 space-y-3 sm:space-y-4 md:border-r border-[var(--border-default)]">
                  {/* Client Card */}
                  <div className="bg-gradient-to-br from-accent to-accent/70 rounded-xl p-4 text-white relative overflow-hidden">
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
                            className="flex-1 py-2 bg-white text-accent rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all hover:bg-white/90 flex items-center justify-center gap-2"
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

                  {/* Owner Selector */}
                  <div className="bg-white/6 rounded-xl border border-[var(--border-default)] p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Tag size={12} className="text-[var(--text-secondary)]" />
                      <span className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Etiqueta</span>
                    </div>
                    <div className="flex gap-1.5">
                      {OWNER_OPTIONS.map((opt) => {
                        const style = ownerStyles[opt];
                        const isActive = (selectedLoan.loan.owner || 'Juntos') === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              if (!isActive) {
                                onUpdateLoan(selectedLoan.loan.id, undefined, undefined, undefined, opt);
                                setSelectedLoan({
                                  ...selectedLoan,
                                  loan: { ...selectedLoan.loan, owner: opt }
                                });
                              }
                            }}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                              isActive
                                ? `${style.bg} ${style.text} ${style.border} shadow-sm`
                                : 'border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Form */}
                  <form onSubmit={handleQuickPayment} className="space-y-2">
                    {/* Payment Type Selector */}
                    <div className="flex gap-1.5 bg-white/6 rounded-xl border border-[var(--border-default)] p-1.5">
                      <button
                        type="button"
                        onClick={() => setPaymentType('interest')}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                          paymentType === 'interest'
                            ? 'bg-success/12 text-success border-success/30'
                            : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        Interés
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('capital')}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                          paymentType === 'capital'
                            ? 'bg-accent/12 text-accent border-accent/30'
                            : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        Capital
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('mixed')}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                          paymentType === 'mixed'
                            ? 'bg-dpurple/12 text-dpurple border-dpurple/30'
                            : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        Mixto
                      </button>
                    </div>

                    <div className="flex items-center bg-white/8 rounded-xl border border-[var(--border-default)] p-1">
                      <button type="button" onClick={() => adjustPayment(-10000)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-surface-hover rounded-lg transition-colors">
                        <Minus size={16}/>
                      </button>
                      <input
                        type="number"
                        required
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full py-2 bg-transparent text-xl font-bold text-center text-[var(--text-primary)] focus:outline-none font-mono"
                        placeholder="0"
                      />
                      <button type="button" onClick={() => adjustPayment(10000)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-surface-hover rounded-lg transition-colors">
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
                      className="w-full py-2.5 text-[9px] font-semibold uppercase tracking-wider text-warning border border-warning/30 rounded-xl hover:bg-warning/8 transition-colors"
                    >
                      Liquidar Préstamo
                    </button>
                  </form>
                </div>

                {/* Right Panel - Transactions */}
                <div className="md:col-span-7 p-3 sm:p-5 space-y-2 sm:space-y-3 bg-white/5 border-t md:border-t-0 border-[var(--border-default)]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-semibold uppercase text-[var(--text-secondary)] tracking-wider flex items-center gap-2">
                      <History size={14} className="text-accent" /> Historial
                    </h3>
                    <button
                      onClick={() => { onDeleteLoan(selectedLoan.loan.id); setSelectedLoan(null); }}
                      className="text-[9px] font-semibold text-danger hover:text-danger/80 uppercase flex items-center gap-1.5 transition-colors px-2 py-1.5 rounded-lg hover:bg-danger/8"
                    >
                      <Trash2 size={12}/> Eliminar
                    </button>
                  </div>

                  <div className="space-y-1.5 overflow-y-auto pr-1 max-h-[200px] sm:max-h-[280px]">
                    {transactions.filter(t => t.loanid === selectedLoan.loan.id).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-[var(--text-tertiary)]">
                        <History size={28} className="mb-2 opacity-50" />
                        <p className="text-sm font-medium">Sin movimientos</p>
                      </div>
                    ) : (
                      transactions.filter(t => t.loanid === selectedLoan.loan.id).map((t, idx) => (
                        <div key={idx} className="bg-white/6 p-2.5 sm:p-3 rounded-lg border border-[var(--border-subtle)] flex justify-between items-center hover:border-[var(--border-default)] transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">{t.description}</p>
                            <p className="text-[9px] font-medium text-[var(--text-tertiary)] mt-0.5">{new Date(t.date).toLocaleDateString()}</p>
                          </div>
                          <p className={`text-xs sm:text-sm font-bold font-mono ml-2 ${t.amount === 0 ? 'text-[var(--text-tertiary)]' : 'text-success'}`}>
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
