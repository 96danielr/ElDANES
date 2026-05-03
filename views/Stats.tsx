
import React, { useMemo } from 'react';
import { LoanSummary, Transaction, Loan } from '../types';
import { formatCurrency } from '../utils/finance';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  Target,
  Landmark,
  Activity,
  History,
  AlertCircle,
  Zap,
  Users,
  ShieldCheck,
  DollarSign,
  Percent,
  Clock,
  Award,
  TrendingDown,
  Calendar,
  PieChart as PieChartIcon,
  Receipt,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface Props {
  summaries: LoanSummary[];
  transactions: Transaction[];
  loans: Loan[];
}

const Stats: React.FC<Props> = ({ summaries, transactions, loans }) => {
  const stats = useMemo(() => {
    const activeLoans = loans.filter((l) => l.isactive);
    const closedLoans = loans.filter((l) => !l.isactive);
    const pendingCapital = activeLoans.reduce(
      (sum, l) => sum + Number(l.currentcapital),
      0
    );
    const totalInitialCapital = activeLoans.reduce(
      (sum, l) => sum + Number(l.initialcapital),
      0
    );
    const totalInterestPaid = summaries.reduce(
      (sum, s) => sum + s.totalInterestPaid,
      0
    );
    const monthlyProjectedRevenue = summaries.reduce(
      (sum, s) =>
        sum +
        Number(s.loan.currentcapital) * (Number(s.loan.monthlyrate) / 100),
      0
    );
    const monthlyROI =
      pendingCapital > 0 ? (monthlyProjectedRevenue / pendingCapital) * 100 : 0;

    const overdueSummaries = summaries.filter((s) => s.isOverdue);
    const capitalOverdue = overdueSummaries.reduce(
      (sum, s) => sum + Number(s.loan.currentcapital),
      0
    );
    const capitalOnTime = pendingCapital - capitalOverdue;

    const avgLoanAmount =
      activeLoans.length > 0 ? pendingCapital / activeLoans.length : 0;
    const avgRate =
      activeLoans.length > 0
        ? activeLoans.reduce((sum, l) => sum + Number(l.monthlyrate), 0) /
          activeLoans.length
        : 0;
    const totalTransactions = transactions.filter(
      (t) => Number(t.amount) > 0
    ).length;
    const totalPaidAmount = transactions
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const overdueDays = overdueSummaries.reduce((sum, s) => {
      const days = s.debtMonths * 30;
      return sum + days;
    }, 0);
    const avgOverdueDays =
      overdueSummaries.length > 0 ? overdueDays / overdueSummaries.length : 0;

    const totalInterestGenerated = summaries.reduce(
      (sum, s) => sum + s.totalInterestGenerated,
      0
    );
    const recoveryRate =
      totalInterestGenerated > 0
        ? (totalInterestPaid / totalInterestGenerated) * 100
        : 0;

    const projectionData = Array.from({ length: 12 }).map((_, i) => ({
      mes: `M${i + 1}`,
      ganancia: monthlyProjectedRevenue * (i + 1),
      acumulado: totalInterestPaid + monthlyProjectedRevenue * (i + 1),
    }));

    const now = new Date();
    const monthlyData = Array.from({ length: 6 }).map((_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthStart = date.getTime();
      const monthEnd = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
      ).getTime();
      const monthTransactions = transactions.filter((t) => {
        const tDate = Number(t.date);
        return tDate >= monthStart && tDate <= monthEnd && Number(t.amount) > 0;
      });
      const monthTotal = monthTransactions.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      );
      return {
        mes: date.toLocaleDateString("es-ES", { month: "short" }),
        cobrado: monthTotal,
        transacciones: monthTransactions.length,
      };
    });

    const totalPendingInterest = summaries.reduce(
      (sum, s) => sum + s.pendingInterest,
      0
    );

    const currentMonthPendingInterest = summaries.reduce((sum, s) => {
      if (s.pendingInterest > 0) {
        return sum + Math.min(s.pendingInterest, s.monthlyInterestAmount);
      }
      return sum;
    }, 0);

    const clientsWithPendingInterest = summaries
      .filter((s) => s.pendingInterest > 0)
      .map((s) => ({
        name: s.client.name,
        pendingInterest: s.pendingInterest,
        monthlyInterest: s.monthlyInterestAmount,
        statusColor: s.statusColor,
      }))
      .sort((a, b) => b.pendingInterest - a.pendingInterest);

    return {
      pendingCapital,
      totalInitialCapital,
      monthlyProjectedRevenue,
      monthlyROI,
      activeCount: summaries.length,
      closedCount: closedLoans.length,
      overdueCount: overdueSummaries.length,
      capitalOnTime,
      capitalOverdue,
      projectionData,
      monthlyData,
      totalInterestPaid,
      totalInterestGenerated,
      avgLoanAmount,
      avgRate,
      totalTransactions,
      totalPaidAmount,
      avgOverdueDays,
      recoveryRate,
      totalPendingInterest,
      currentMonthPendingInterest,
      clientsWithPendingInterest,
    };
  }, [summaries, loans, transactions]);

  const pieData = [
    { name: "Sano", value: stats.capitalOnTime, color: "#00A878" },
    { name: "Mora", value: stats.capitalOverdue, color: "#DE350B" },
  ];

  const statusPieData = [
    {
      name: "Al Día",
      value: stats.activeCount - stats.overdueCount,
      color: "#00A878",
    },
    { name: "En Mora", value: stats.overdueCount, color: "#DE350B" },
  ];

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

  return (
    <div className="space-y-6 pb-10 animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center justify-center gap-3">
          <Sparkles size={24} className="text-dpurple" />
          Métricas Globales
        </h1>
        <p className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-[0.2em] mt-2">
          Rendimiento y Análisis
        </p>
      </div>

      {/* ROI Badge */}
      <div className="flex justify-center mb-8">
        <div className="glass-card glass-purple px-6 py-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-dpurple/20 border border-dpurple/30 flex items-center justify-center">
            <Target size={24} className="text-dpurple" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">ROI Mensual</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">{stats.monthlyROI.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Pending Interest Section */}
      <div className="glass-card glass-green p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-success/20 border border-success/30 flex items-center justify-center">
            <Receipt size={20} className="text-success" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Interés Pendiente por Recaudar</h3>
            <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Estado de cobros pendientes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white/6 border border-[var(--border-default)] rounded-xl p-5">
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Total Pendiente</p>
            <p className="text-2xl font-bold text-success font-mono">{formatCurrency(stats.totalPendingInterest)}</p>
          </div>
          <div className="bg-white/6 border border-[var(--border-default)] rounded-xl p-5">
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Falta del Mes Actual</p>
            <p className="text-2xl font-bold text-warning font-mono">{formatCurrency(stats.currentMonthPendingInterest)}</p>
          </div>
        </div>

        {stats.clientsWithPendingInterest.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider flex items-center gap-2">
              <Users size={14} className="text-accent" />
              Clientes con Interés Pendiente ({stats.clientsWithPendingInterest.length})
            </h4>
            <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/8 border-b border-[var(--border-default)]">
                    <th className="text-left py-3 px-4 text-[10px] font-semibold uppercase text-[var(--text-secondary)] tracking-wider">Cliente</th>
                    <th className="text-right py-3 px-4 text-[10px] font-semibold uppercase text-[var(--text-secondary)] tracking-wider">Pendiente</th>
                    <th className="text-right py-3 px-4 text-[10px] font-semibold uppercase text-[var(--text-secondary)] tracking-wider">Mensual</th>
                    <th className="text-center py-3 px-4 text-[10px] font-semibold uppercase text-[var(--text-secondary)] tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.clientsWithPendingInterest.map((client, idx) => (
                    <tr key={idx} className="border-b border-[var(--border-default)] hover:bg-white/8 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{client.name}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="text-sm font-bold text-[var(--text-primary)] font-mono">{formatCurrency(client.pendingInterest)}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="text-xs font-semibold text-[var(--text-secondary)] font-mono">{formatCurrency(client.monthlyInterest)}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className={`inline-block w-3 h-3 rounded-full ${
                          client.statusColor === "green" ? "bg-success" :
                          client.statusColor === "yellow" ? "bg-warning" :
                          "bg-danger"
                        }`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard icon={<Landmark size={18} />} label="Capital en Calle" value={formatCurrency(stats.pendingCapital)} color="blue" />
        <MetricCard icon={<Zap size={18} />} label="Rédito Mensual" value={formatCurrency(stats.monthlyProjectedRevenue)} color="emerald" />
        <MetricCard icon={<History size={18} />} label="Cobros Históricos" value={formatCurrency(stats.totalInterestPaid)} color="purple" />
        <MetricCard icon={<AlertCircle size={18} />} label="Tasa de Mora" value={`${((stats.overdueCount / (stats.activeCount || 1)) * 100).toFixed(0)}%`} color="red" />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard icon={<DollarSign size={18} />} label="Préstamo Prom." value={formatCurrency(stats.avgLoanAmount)} color="cyan" />
        <MetricCard icon={<Percent size={18} />} label="Tasa Promedio" value={`${stats.avgRate.toFixed(1)}%`} color="yellow" />
        <MetricCard icon={<Award size={18} />} label="Recuperación" value={`${stats.recoveryRate.toFixed(1)}%`} color="emerald" />
        <MetricCard icon={<Clock size={18} />} label="Días Mora" value={`${Math.round(stats.avgOverdueDays)}`} color="orange" />
      </div>

      {/* Tertiary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard icon={<Users size={18} />} label="Préstamos Activos" value={stats.activeCount.toString()} color="blue" />
        <MetricCard icon={<ShieldCheck size={18} />} label="Cerrados" value={stats.closedCount.toString()} color="emerald" />
        <MetricCard icon={<Activity size={18} />} label="Transacciones" value={stats.totalTransactions.toString()} color="purple" />
        <MetricCard icon={<TrendingUp size={18} />} label="Total Cobrado" value={formatCurrency(stats.totalPaidAmount)} color="cyan" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Projection Chart */}
        <div className="lg:col-span-8 glass-card p-4 sm:p-6 rounded-2xl">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
              <TrendingUp size={16} className="text-accent sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">Proyección de Ingresos</h3>
              <p className="text-[9px] sm:text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Próximos 12 meses</p>
            </div>
          </div>
          <div className="h-52 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.projectionData}>
                <defs>
                  <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8A05BE" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8A05BE" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border-default)" strokeOpacity={0.8} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontWeight: 600 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="ganancia" stroke="var(--accent)" strokeWidth={3} fill="url(#colorGanancia)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capital Pie Chart */}
        <div className="lg:col-span-4 glass-card glass-purple p-6 rounded-2xl flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-dpurple/20 border border-dpurple/30 flex items-center justify-center">
              <PieChartIcon size={20} className="text-dpurple" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Estado del Capital</h3>
              <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Distribución</p>
            </div>
          </div>
          <div className="h-52 w-full relative flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                  {pieData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-bold text-[var(--text-primary)] font-mono">{stats.activeCount}</p>
              <p className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] tracking-wider">Activos</p>
            </div>
          </div>
          <div className="w-full space-y-3 mt-4 pt-4 border-t border-[var(--border-default)]">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
                <div className="w-2.5 h-2.5 rounded-full bg-success" /> Sano
              </span>
              <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{formatCurrency(stats.capitalOnTime)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
                <div className="w-2.5 h-2.5 rounded-full bg-danger" /> Mora
              </span>
              <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{formatCurrency(stats.capitalOverdue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly History & Status Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly History */}
        <div className="lg:col-span-8 glass-card glass-green p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-success/20 border border-success/30 flex items-center justify-center">
              <Calendar size={20} className="text-success" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Historial Mensual</h3>
              <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Últimos 6 meses</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyData}>
                <defs>
                  <linearGradient id="colorCobrado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8A05BE" stopOpacity={0.95} />
                    <stop offset="95%" stopColor="#B468D4" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border-default)" strokeOpacity={0.8} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontWeight: 600 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cobrado" fill="url(#colorCobrado)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loans Status Pie */}
        <div className="lg:col-span-4 glass-card glass-yellow p-6 rounded-2xl flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-warning/20 border border-warning/30 flex items-center justify-center">
              <ShieldCheck size={20} className="text-warning" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Estado Préstamos</h3>
              <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Por estado</p>
            </div>
          </div>
          <div className="h-52 w-full relative flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                  {statusPieData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-bold text-[var(--text-primary)] font-mono">{stats.activeCount}</p>
              <p className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] tracking-wider">Total</p>
            </div>
          </div>
          <div className="w-full space-y-3 mt-4 pt-4 border-t border-[var(--border-default)]">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
                <div className="w-2.5 h-2.5 rounded-full bg-success" /> Al Día
              </span>
              <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{stats.activeCount - stats.overdueCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
                <div className="w-2.5 h-2.5 rounded-full bg-danger" /> En Mora
              </span>
              <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{stats.overdueCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collections Summary */}
        <div className="glass-card glass-green p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-success/20 border border-success/30 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-success" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Resumen de Cobros</h3>
              <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Préstamos al día</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white/6 border border-[var(--border-default)] rounded-xl p-5">
              <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Total Cobrado</p>
              <p className="text-2xl font-bold text-success font-mono">{formatCurrency(stats.totalInterestPaid)}</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Al Día</span>
                <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{stats.activeCount - stats.overdueCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Capital Sano</span>
                <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{formatCurrency(stats.capitalOnTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Rédito Mensual</span>
                <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{formatCurrency(stats.monthlyProjectedRevenue)}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--border-default)]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-success" />
                <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Tasa Recuperación</p>
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)] font-mono">{stats.recoveryRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Default Summary */}
        <div className="glass-card glass-red p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-danger/20 border border-danger/30 flex items-center justify-center">
              <AlertCircle size={20} className="text-danger" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Resumen de Mora</h3>
              <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Préstamos en mora</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white/6 border border-danger/30 rounded-xl p-5">
              <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Capital en Mora</p>
              <p className="text-2xl font-bold text-danger font-mono">{formatCurrency(stats.capitalOverdue)}</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">En Mora</span>
                <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{stats.overdueCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Tasa de Mora</span>
                <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{((stats.overdueCount / (stats.activeCount || 1)) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Días Promedio</span>
                <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{Math.round(stats.avgOverdueDays)}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--border-default)]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={14} className="text-danger" />
                <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Índice de Riesgo</p>
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)] font-mono">
                {stats.capitalOverdue > 0 ? ((stats.capitalOverdue / stats.pendingCapital) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, color }: any) => {
  const iconStyles: Record<string, string> = {
    blue: "bg-accent/20 border-accent/30 text-accent",
    emerald: "bg-success/20 border-success/30 text-success",
    purple: "bg-dpurple/20 border-dpurple/30 text-dpurple",
    red: "bg-danger/20 border-danger/30 text-danger",
    cyan: "bg-cyan/20 border-cyan/30 text-cyan",
    yellow: "bg-warning/20 border-warning/30 text-warning",
    orange: "bg-accent/20 border-accent/30 text-accent",
  };

  return (
    <div className={`metric-card ${color} p-3 sm:p-5 group`}>
      <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center mb-2 sm:mb-3 ${iconStyles[color]} transition-all group-hover:scale-110`}>
        {icon}
      </div>
      <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5 sm:mb-1 relative z-10 truncate">{label}</p>
      <p className="text-base sm:text-xl font-bold text-[var(--text-primary)] font-mono relative z-10">{value}</p>
    </div>
  );
};

export default Stats;
