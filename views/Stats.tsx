
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

    const CUTOFF_DAY = 25;
    const currentDay = now.getDate();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let billableMonth: string;
    if (currentDay >= CUTOFF_DAY) {
      billableMonth = currentMonth;
    } else {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      billableMonth = `${lastMonth.getFullYear()}-${String(
        lastMonth.getMonth() + 1
      ).padStart(2, "0")}`;
    }

    let currentMonthPendingInterest = 0;
    if (currentDay >= CUTOFF_DAY) {
      currentMonthPendingInterest = summaries.reduce((sum, s) => {
        if (s.lastPaymentMonth !== currentMonth) {
          return sum + s.monthlyInterestAmount;
        }
        return sum;
      }, 0);
    }

    const clientsWithPendingInterest = summaries
      .filter((s) => {
        if (s.pendingInterest <= 0) return false;
        if (s.lastPaymentMonth === billableMonth) return false;
        if (s.lastPaymentMonth === currentMonth && currentDay < CUTOFF_DAY) return false;
        return true;
      })
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
    { name: "Sano", value: stats.capitalOnTime, color: "#3fb950" },
    { name: "Mora", value: stats.capitalOverdue, color: "#f85149" },
  ];

  const statusPieData = [
    {
      name: "Al Día",
      value: stats.activeCount - stats.overdueCount,
      color: "#3fb950",
    },
    { name: "En Mora", value: stats.overdueCount, color: "#f85149" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card px-4 py-3 rounded-xl border border-[#30363d]">
          <p className="text-[10px] font-semibold text-[#8b949e] uppercase mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-bold text-[#e6edf3] font-mono">
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
        <h1 className="text-2xl font-bold text-[#e6edf3] tracking-tight flex items-center justify-center gap-3">
          <Sparkles size={24} className="text-[#a371f7]" />
          Métricas Globales
        </h1>
        <p className="text-[#8b949e] text-xs font-medium uppercase tracking-[0.2em] mt-2">
          Rendimiento y Análisis
        </p>
      </div>

      {/* ROI Badge */}
      <div className="flex justify-center mb-8">
        <div className="glass-card px-6 py-4 rounded-2xl flex items-center gap-4 border-[#a371f7]/30 shadow-[0_0_30px_rgba(163,113,247,0.1)]">
          <div className="w-12 h-12 rounded-xl bg-[#a371f7]/20 flex items-center justify-center">
            <Target size={24} className="text-[#a371f7]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider">ROI Mensual</p>
            <p className="text-2xl font-bold text-[#e6edf3] font-mono">{stats.monthlyROI.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Pending Interest Section */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#3fb950]/20 flex items-center justify-center">
            <Receipt size={20} className="text-[#3fb950]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#e6edf3]">Interés Pendiente por Recaudar</h3>
            <p className="text-[10px] font-medium text-[#8b949e] uppercase tracking-wider">Estado de cobros pendientes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-[#161b22]/80 border border-[#21262d] rounded-xl p-5">
            <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider mb-2">Total Pendiente</p>
            <p className="text-2xl font-bold text-[#3fb950] font-mono">{formatCurrency(stats.totalPendingInterest)}</p>
          </div>
          <div className="bg-[#161b22]/80 border border-[#21262d] rounded-xl p-5">
            <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider mb-2">Falta del Mes Actual</p>
            <p className="text-2xl font-bold text-[#d29922] font-mono">{formatCurrency(stats.currentMonthPendingInterest)}</p>
          </div>
        </div>

        {stats.clientsWithPendingInterest.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-[#e6edf3] mb-4 uppercase tracking-wider flex items-center gap-2">
              <Users size={14} className="text-[#58a6ff]" />
              Clientes con Interés Pendiente ({stats.clientsWithPendingInterest.length})
            </h4>
            <div className="overflow-x-auto rounded-xl border border-[#21262d]">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#161b22]/80 border-b border-[#21262d]">
                    <th className="text-left py-3 px-4 text-[10px] font-semibold uppercase text-[#8b949e] tracking-wider">Cliente</th>
                    <th className="text-right py-3 px-4 text-[10px] font-semibold uppercase text-[#8b949e] tracking-wider">Pendiente</th>
                    <th className="text-right py-3 px-4 text-[10px] font-semibold uppercase text-[#8b949e] tracking-wider">Mensual</th>
                    <th className="text-center py-3 px-4 text-[10px] font-semibold uppercase text-[#8b949e] tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.clientsWithPendingInterest.map((client, idx) => (
                    <tr key={idx} className="border-b border-[#21262d] hover:bg-[#161b22]/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-sm font-semibold text-[#e6edf3]">{client.name}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="text-sm font-bold text-[#e6edf3] font-mono">{formatCurrency(client.pendingInterest)}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="text-xs font-semibold text-[#8b949e] font-mono">{formatCurrency(client.monthlyInterest)}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className={`inline-block w-3 h-3 rounded-full ${
                          client.statusColor === "green" ? "bg-[#3fb950] shadow-[0_0_8px_rgba(63,185,80,0.5)]" :
                          client.statusColor === "yellow" ? "bg-[#d29922] shadow-[0_0_8px_rgba(210,153,34,0.5)]" :
                          "bg-[#f85149] shadow-[0_0_8px_rgba(248,81,73,0.5)]"
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard icon={<Landmark size={20} />} label="Capital en Calle" value={formatCurrency(stats.pendingCapital)} color="blue" />
        <MetricCard icon={<Zap size={20} />} label="Rédito Mensual" value={formatCurrency(stats.monthlyProjectedRevenue)} color="emerald" />
        <MetricCard icon={<History size={20} />} label="Cobros Históricos" value={formatCurrency(stats.totalInterestPaid)} color="purple" />
        <MetricCard icon={<AlertCircle size={20} />} label="Tasa de Mora" value={`${((stats.overdueCount / (stats.activeCount || 1)) * 100).toFixed(0)}%`} color="red" />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard icon={<DollarSign size={20} />} label="Préstamo Promedio" value={formatCurrency(stats.avgLoanAmount)} color="cyan" />
        <MetricCard icon={<Percent size={20} />} label="Tasa Promedio" value={`${stats.avgRate.toFixed(1)}%`} color="yellow" />
        <MetricCard icon={<Award size={20} />} label="Tasa Recuperación" value={`${stats.recoveryRate.toFixed(1)}%`} color="emerald" />
        <MetricCard icon={<Clock size={20} />} label="Días Mora Prom." value={`${Math.round(stats.avgOverdueDays)}`} color="orange" />
      </div>

      {/* Tertiary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard icon={<Users size={20} />} label="Préstamos Activos" value={stats.activeCount.toString()} color="blue" />
        <MetricCard icon={<ShieldCheck size={20} />} label="Préstamos Cerrados" value={stats.closedCount.toString()} color="emerald" />
        <MetricCard icon={<Activity size={20} />} label="Total Transacciones" value={stats.totalTransactions.toString()} color="purple" />
        <MetricCard icon={<TrendingUp size={20} />} label="Total Cobrado" value={formatCurrency(stats.totalPaidAmount)} color="cyan" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Projection Chart */}
        <div className="lg:col-span-8 glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#58a6ff]/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-[#58a6ff]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#e6edf3]">Proyección de Ingresos</h3>
              <p className="text-[10px] font-medium text-[#8b949e] uppercase tracking-wider">Próximos 12 meses</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.projectionData}>
                <defs>
                  <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#58a6ff" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#21262d" strokeOpacity={0.8} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#8b949e", fontSize: 10, fontWeight: 600 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="ganancia" stroke="#58a6ff" strokeWidth={3} fill="url(#colorGanancia)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capital Pie Chart */}
        <div className="lg:col-span-4 glass-card p-6 rounded-2xl flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#a371f7]/20 flex items-center justify-center">
              <PieChartIcon size={20} className="text-[#a371f7]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#e6edf3]">Estado del Capital</h3>
              <p className="text-[10px] font-medium text-[#8b949e] uppercase tracking-wider">Distribución</p>
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
              <p className="text-3xl font-bold text-[#e6edf3] font-mono">{stats.activeCount}</p>
              <p className="text-[10px] uppercase font-semibold text-[#8b949e] tracking-wider">Activos</p>
            </div>
          </div>
          <div className="w-full space-y-3 mt-4 pt-4 border-t border-[#21262d]">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-[#8b949e] uppercase">
                <div className="w-2.5 h-2.5 rounded-full bg-[#3fb950]" /> Sano
              </span>
              <span className="text-sm font-bold text-[#e6edf3] font-mono">{formatCurrency(stats.capitalOnTime)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-[#8b949e] uppercase">
                <div className="w-2.5 h-2.5 rounded-full bg-[#f85149]" /> Mora
              </span>
              <span className="text-sm font-bold text-[#e6edf3] font-mono">{formatCurrency(stats.capitalOverdue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly History & Status Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly History */}
        <div className="lg:col-span-8 glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#3fb950]/20 flex items-center justify-center">
              <Calendar size={20} className="text-[#3fb950]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#e6edf3]">Historial Mensual</h3>
              <p className="text-[10px] font-medium text-[#8b949e] uppercase tracking-wider">Últimos 6 meses</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyData}>
                <defs>
                  <linearGradient id="colorCobrado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3fb950" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#3fb950" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#21262d" strokeOpacity={0.8} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#8b949e", fontSize: 10, fontWeight: 600 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cobrado" fill="url(#colorCobrado)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loans Status Pie */}
        <div className="lg:col-span-4 glass-card p-6 rounded-2xl flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#d29922]/20 flex items-center justify-center">
              <ShieldCheck size={20} className="text-[#d29922]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#e6edf3]">Estado Préstamos</h3>
              <p className="text-[10px] font-medium text-[#8b949e] uppercase tracking-wider">Por estado</p>
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
              <p className="text-3xl font-bold text-[#e6edf3] font-mono">{stats.activeCount}</p>
              <p className="text-[10px] uppercase font-semibold text-[#8b949e] tracking-wider">Total</p>
            </div>
          </div>
          <div className="w-full space-y-3 mt-4 pt-4 border-t border-[#21262d]">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-[#8b949e] uppercase">
                <div className="w-2.5 h-2.5 rounded-full bg-[#3fb950]" /> Al Día
              </span>
              <span className="text-sm font-bold text-[#e6edf3] font-mono">{stats.activeCount - stats.overdueCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-[#8b949e] uppercase">
                <div className="w-2.5 h-2.5 rounded-full bg-[#f85149]" /> En Mora
              </span>
              <span className="text-sm font-bold text-[#e6edf3] font-mono">{stats.overdueCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collections Summary */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#3fb950]/20 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-[#3fb950]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#e6edf3]">Resumen de Cobros</h3>
              <p className="text-[10px] font-medium text-[#8b949e] uppercase tracking-wider">Préstamos al día</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-[#161b22]/80 border border-[#21262d] rounded-xl p-5">
              <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider mb-2">Total Cobrado</p>
              <p className="text-2xl font-bold text-[#3fb950] font-mono">{formatCurrency(stats.totalInterestPaid)}</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase">Al Día</span>
                <span className="text-sm font-bold text-[#e6edf3] font-mono">{stats.activeCount - stats.overdueCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase">Capital Sano</span>
                <span className="text-sm font-bold text-[#e6edf3] font-mono">{formatCurrency(stats.capitalOnTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase">Rédito Mensual</span>
                <span className="text-sm font-bold text-[#e6edf3] font-mono">{formatCurrency(stats.monthlyProjectedRevenue)}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-[#21262d]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-[#3fb950]" />
                <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider">Tasa Recuperación</p>
              </div>
              <p className="text-xl font-bold text-[#e6edf3] font-mono">{stats.recoveryRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Default Summary */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#f85149]/20 flex items-center justify-center">
              <AlertCircle size={20} className="text-[#f85149]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#e6edf3]">Resumen de Mora</h3>
              <p className="text-[10px] font-medium text-[#8b949e] uppercase tracking-wider">Préstamos en mora</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-[#161b22]/80 border border-[#f85149]/30 rounded-xl p-5">
              <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider mb-2">Capital en Mora</p>
              <p className="text-2xl font-bold text-[#f85149] font-mono">{formatCurrency(stats.capitalOverdue)}</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase">En Mora</span>
                <span className="text-sm font-bold text-[#e6edf3] font-mono">{stats.overdueCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase">Tasa de Mora</span>
                <span className="text-sm font-bold text-[#e6edf3] font-mono">{((stats.overdueCount / (stats.activeCount || 1)) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase">Días Promedio</span>
                <span className="text-sm font-bold text-[#e6edf3] font-mono">{Math.round(stats.avgOverdueDays)}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-[#21262d]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={14} className="text-[#f85149]" />
                <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider">Índice de Riesgo</p>
              </div>
              <p className="text-xl font-bold text-[#e6edf3] font-mono">
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
  const colorStyles: Record<string, string> = {
    blue: "bg-[#58a6ff]/20 text-[#58a6ff]",
    emerald: "bg-[#3fb950]/20 text-[#3fb950]",
    purple: "bg-[#a371f7]/20 text-[#a371f7]",
    red: "bg-[#f85149]/20 text-[#f85149]",
    cyan: "bg-[#39d0d8]/20 text-[#39d0d8]",
    yellow: "bg-[#d29922]/20 text-[#d29922]",
    orange: "bg-[#f0883e]/20 text-[#f0883e]",
  };

  return (
    <div className="glass-card p-5 rounded-xl group transition-all duration-300">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorStyles[color]}`}>
        {icon}
      </div>
      <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold text-[#e6edf3] font-mono">{value}</p>
    </div>
  );
};

export default Stats;
