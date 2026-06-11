
import React, { useMemo } from 'react';
import { LoanSummary, Transaction, Loan, Client } from '../types';
import { formatCurrency } from '../utils/finance';
import { computePaymentBreakdown } from '../supabase/functions/_shared/finance';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  Landmark,
  Wallet,
  CheckCircle2,
  CircleDashed,
  XCircle,
  Receipt,
  Users,
  CalendarCheck,
} from "lucide-react";

const MESES_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

interface Props {
  summaries: LoanSummary[];
  transactions: Transaction[];
  loans: Loan[];
  clients: Client[];
}

const Stats: React.FC<Props> = ({ summaries, transactions, loans, clients }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

    // Desglose interés/capital de TODOS los pagos históricos (activos y liquidados)
    const allSplits = loans.flatMap((loan) => computePaymentBreakdown(loan, transactions));
    const interestSplits = allSplits.filter((s) => s.toInterest > 0);

    const interestIn = (from: number, to: number) =>
      interestSplits
        .filter((s) => s.date >= from && s.date < to)
        .reduce((sum, s) => sum + s.toInterest, 0);

    const gainThisMonth = interestIn(thisMonthStart, nextMonthStart);
    const gainLastMonth = interestIn(lastMonthStart, thisMonthStart);
    const gainThisYear = interestIn(yearStart, nextMonthStart);
    const gainAllTime = interestSplits.reduce((sum, s) => sum + s.toInterest, 0);

    // Interés cobrado por mes — últimos 6 meses
    const monthlyGains = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const from = d.getTime();
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      return {
        mes: `${MESES_ES[d.getMonth()]}`,
        ganancia: interestIn(from, to),
      };
    });

    // Cobranza del mes (solo activos): esperado vs cobrado por cliente
    const collection = summaries
      .map((s) => {
        const loanSplits = computePaymentBreakdown(s.loan, transactions).filter(
          (sp) => sp.date >= thisMonthStart && sp.date < nextMonthStart
        );
        const interestPaidThisMonth = loanSplits.reduce((sum, sp) => sum + sp.toInterest, 0);
        const totalPaidThisMonth = loanSplits.reduce((sum, sp) => sum + sp.toInterest + sp.toCapital, 0);
        const expected = s.monthlyInterestAmount;
        let state: 'pago' | 'parcial' | 'falta';
        if (expected > 0 && interestPaidThisMonth >= expected * 0.98) state = 'pago';
        else if (totalPaidThisMonth > 0) state = 'parcial';
        else state = 'falta';
        return {
          name: s.client.name.trim(),
          expected,
          interestPaidThisMonth,
          totalPaidThisMonth,
          state,
          statusColor: s.statusColor,
        };
      })
      .sort((a, b) => {
        const order = { falta: 0, parcial: 1, pago: 2 };
        if (order[a.state] !== order[b.state]) return order[a.state] - order[b.state];
        return b.expected - a.expected;
      });

    const expectedThisMonth = collection.reduce((sum, c) => sum + c.expected, 0);
    const collectedThisMonth = collection.reduce((sum, c) => sum + c.interestPaidThisMonth, 0);
    const progress = expectedThisMonth > 0 ? Math.min(100, (collectedThisMonth / expectedThisMonth) * 100) : 0;

    // Contexto compacto
    const activeLoans = loans.filter((l) => l.isactive);
    const capitalEnCalle = activeLoans.reduce((sum, l) => sum + Number(l.currentcapital), 0);
    const pendingInterestTotal = summaries.reduce((sum, s) => sum + s.pendingInterest, 0);
    const overdueCount = summaries.filter((s) => s.isOverdue).length;

    return {
      gainThisMonth,
      gainLastMonth,
      gainThisYear,
      gainAllTime,
      monthlyGains,
      collection,
      expectedThisMonth,
      collectedThisMonth,
      progress,
      capitalEnCalle,
      pendingInterestTotal,
      activeCount: summaries.length,
      overdueCount,
      paidCount: collection.filter((c) => c.state === 'pago').length,
      partialCount: collection.filter((c) => c.state === 'parcial').length,
      missingCount: collection.filter((c) => c.state === 'falta').length,
    };
  }, [summaries, loans, transactions, clients]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card px-4 py-3 rounded-xl border border-[var(--border-default)]">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-bold text-[var(--text-primary)] font-mono">
              {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const monthName = MESES_ES[new Date().getMonth()];

  return (
    <div className="space-y-6 pb-10 animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center justify-center gap-3">
          <TrendingUp size={24} className="text-accent" />
          Ganancias y Cobranza
        </h1>
        <p className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-[0.2em] mt-2">
          Interés real cobrado — sin proyecciones
        </p>
      </div>

      {/* ═══ BLOQUE 1: GANANCIA REAL ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="metric-card p-4 sm:p-5">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Ganancia {monthName}</p>
          <p className="text-lg sm:text-2xl font-bold text-success font-mono">{formatCurrency(stats.gainThisMonth)}</p>
        </div>
        <div className="metric-card p-4 sm:p-5">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Mes Anterior</p>
          <p className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] font-mono">{formatCurrency(stats.gainLastMonth)}</p>
        </div>
        <div className="metric-card p-4 sm:p-5">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Acumulado {new Date().getFullYear()}</p>
          <p className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] font-mono">{formatCurrency(stats.gainThisYear)}</p>
        </div>
        <div className="metric-card p-4 sm:p-5">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Histórico Total</p>
          <p className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] font-mono">{formatCurrency(stats.gainAllTime)}</p>
        </div>
      </div>

      {/* Gráfica: interés cobrado por mes */}
      <div className="glass-card p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-success/20 border border-success/30 flex items-center justify-center">
            <Receipt size={20} className="text-success" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Interés Cobrado por Mes</h3>
            <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Ganancia real — últimos 6 meses</p>
          </div>
        </div>
        <div className="h-56 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthlyGains}>
              <defs>
                <linearGradient id="colorGananciaReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D97757" stopOpacity={0.95} />
                  <stop offset="95%" stopColor="#E59C7F" stopOpacity={0.65} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border-default)" strokeOpacity={0.8} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontWeight: 600 }} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ganancia" fill="url(#colorGananciaReal)" radius={[8, 8, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ BLOQUE 2: COBRANZA DEL MES ═══ */}
      <div className="glass-card p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
            <CalendarCheck size={20} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Cobranza de {monthName}</h3>
            <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              {stats.paidCount} pagaron · {stats.partialCount} parcial · {stats.missingCount} faltan
            </p>
          </div>
        </div>

        {/* Esperado vs cobrado + barra */}
        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Cobrado (interés)</p>
              <p className="text-xl sm:text-2xl font-bold text-success font-mono">{formatCurrency(stats.collectedThisMonth)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Esperado del mes</p>
              <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-mono">{formatCurrency(stats.expectedThisMonth)}</p>
            </div>
          </div>
          <div className="h-3 rounded-full bg-white/8 border border-[var(--border-default)] overflow-hidden">
            <div
              className="h-full rounded-full bg-success transition-all duration-500"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          <p className="text-right text-[10px] font-semibold text-[var(--text-secondary)] mt-1">{stats.progress.toFixed(0)}%</p>
        </div>

        {/* Lista de clientes: faltan primero */}
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {stats.collection.map((c, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 bg-white/6 border border-[var(--border-default)] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {c.state === 'pago' && <CheckCircle2 size={18} className="text-success flex-shrink-0" />}
                {c.state === 'parcial' && <CircleDashed size={18} className="text-warning flex-shrink-0" />}
                {c.state === 'falta' && <XCircle size={18} className="text-danger flex-shrink-0" />}
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{c.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold font-mono ${
                  c.state === 'pago' ? 'text-success' : c.state === 'parcial' ? 'text-warning' : 'text-danger'
                }`}>
                  {formatCurrency(c.interestPaidThisMonth)}
                  <span className="text-[var(--text-tertiary)] font-normal"> / {formatCurrency(c.expected)}</span>
                </p>
              </div>
            </div>
          ))}
          {stats.collection.length === 0 && (
            <p className="text-center text-sm text-[var(--text-secondary)] py-8">Sin préstamos activos</p>
          )}
        </div>
      </div>

      {/* ═══ CONTEXTO COMPACTO ═══ */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="metric-card p-3 sm:p-5">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <Landmark size={14} className="text-accent" />
            <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Capital en Calle</p>
          </div>
          <p className="text-sm sm:text-xl font-bold text-[var(--text-primary)] font-mono">{formatCurrency(stats.capitalEnCalle)}</p>
        </div>
        <div className="metric-card p-3 sm:p-5">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <Wallet size={14} className="text-warning" />
            <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Interés Pendiente</p>
          </div>
          <p className="text-sm sm:text-xl font-bold text-[var(--text-primary)] font-mono">{formatCurrency(stats.pendingInterestTotal)}</p>
        </div>
        <div className="metric-card p-3 sm:p-5">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <Users size={14} className="text-success" />
            <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Activos / Mora</p>
          </div>
          <p className="text-sm sm:text-xl font-bold text-[var(--text-primary)] font-mono">
            {stats.activeCount} <span className="text-danger">/ {stats.overdueCount}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Stats;
