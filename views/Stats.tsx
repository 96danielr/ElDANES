
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
  LineChart,
  Line,
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
  ArrowUpRight,
  ShieldCheck,
  DollarSign,
  Percent,
  Clock,
  Award,
  TrendingDown,
  Calendar,
  PieChart as PieChartIcon,
  ArrowDownRight,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import { DNFusionLogo } from "../App";

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

    // Nuevas métricas
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

    // Promedio de días de mora
    const overdueDays = overdueSummaries.reduce((sum, s) => {
      const days = s.debtMonths * 30;
      return sum + days;
    }, 0);
    const avgOverdueDays =
      overdueSummaries.length > 0 ? overdueDays / overdueSummaries.length : 0;

    // Tasa de recuperación (interés pagado vs generado)
    const totalInterestGenerated = summaries.reduce(
      (sum, s) => sum + s.totalInterestGenerated,
      0
    );
    const recoveryRate =
      totalInterestGenerated > 0
        ? (totalInterestPaid / totalInterestGenerated) * 100
        : 0;

    // Proyección de 12 meses
    const projectionData = Array.from({ length: 12 }).map((_, i) => ({
      mes: `M${i + 1}`,
      ganancia: monthlyProjectedRevenue * (i + 1),
      acumulado: totalInterestPaid + monthlyProjectedRevenue * (i + 1),
    }));

    // Datos mensuales de los últimos 6 meses
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

    // Interés pendiente total
    const totalPendingInterest = summaries.reduce(
      (sum, s) => sum + s.pendingInterest,
      0
    );

    // Interés del mes actual que falta por recoger (considerando fecha de corte del día 25)
    const CUTOFF_DAY = 25;
    const currentDay = now.getDate();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    
    // Determinar qué mes se puede cobrar actualmente según la fecha de corte
    let billableMonth: string;
    if (currentDay >= CUTOFF_DAY) {
      // Ya pasó el día 25, se puede cobrar el mes actual
      billableMonth = currentMonth;
    } else {
      // Aún no llega el día 25, solo se puede cobrar hasta el mes pasado
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      billableMonth = `${lastMonth.getFullYear()}-${String(
        lastMonth.getMonth() + 1
      ).padStart(2, "0")}`;
    }
    
    let currentMonthPendingInterest = 0;
    if (currentDay >= CUTOFF_DAY) {
      // Ya pasó el día 25, calcular interés del mes actual que falta
      currentMonthPendingInterest = summaries.reduce((sum, s) => {
        // Si el último pago no fue del mes actual, falta el interés del mes actual
        if (s.lastPaymentMonth !== currentMonth) {
          return sum + s.monthlyInterestAmount;
        }
        return sum;
      }, 0);
    }

    // Lista de clientes con interés pendiente (solo los que realmente deben según fecha de corte)
    // Si pagaron el mes que se puede cobrar actualmente, no aparecen en la lista
    const clientsWithPendingInterest = summaries
      .filter((s) => {
        // Solo mostrar si tiene interés pendiente Y no pagó el mes que se puede cobrar actualmente
        if (s.pendingInterest <= 0) return false;
        
        // Si pagó el mes que se puede cobrar actualmente, no debe aparecer
        if (s.lastPaymentMonth === billableMonth) return false;
        
        // Si pagó en el mes actual (aunque aún no llegue el día 25), no debe aparecer
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
    { name: "Sano", value: stats.capitalOnTime, color: "#6366f1" },
    { name: "Mora", value: stats.capitalOverdue, color: "#f43f5e" },
  ];

  const statusPieData = [
    {
      name: "Al Día",
      value: stats.activeCount - stats.overdueCount,
      color: "#10b981",
    },
    { name: "En Mora", value: stats.overdueCount, color: "#f43f5e" },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-black tracking-tight text-[rgb(51,65,85)]">
          Métricas Globales
        </h1>
        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">
          Rendimiento y Análisis
        </p>
      </div>

      {/* Sección de Interés Pendiente */}
      <div className="glass-card p-6 sm:p-7 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Receipt size={16} className="text-slate-700" />
              Interés Pendiente por Recaudar
            </h3>
            <p className="text-[9px] font-bold uppercase text-slate-500 mt-1">
              Estado de cobros pendientes
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-4">
            <p className="text-[9px] font-black text-slate-600 uppercase mb-2">
              Total Pendiente
            </p>
            <p className="text-2xl font-black text-slate-900">
              {formatCurrency(stats.totalPendingInterest)}
            </p>
          </div>
          <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-4">
            <p className="text-[9px] font-black text-slate-600 uppercase mb-2">
              Falta del Mes Actual
            </p>
            <p className="text-2xl font-black text-slate-900">
              {formatCurrency(stats.currentMonthPendingInterest)}
            </p>
          </div>
        </div>
        {stats.clientsWithPendingInterest.length > 0 && (
          <div>
            <h4 className="text-xs font-black text-slate-700 mb-4 uppercase">
              Clientes con Interés Pendiente ({stats.clientsWithPendingInterest.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="text-left py-3 px-4 text-[9px] font-black uppercase text-slate-600">
                      Cliente
                    </th>
                    <th className="text-right py-3 px-4 text-[9px] font-black uppercase text-slate-600">
                      Pendiente
                    </th>
                    <th className="text-right py-3 px-4 text-[9px] font-black uppercase text-slate-600">
                      Mensual
                    </th>
                    <th className="text-center py-3 px-4 text-[9px] font-black uppercase text-slate-600">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.clientsWithPendingInterest.map((client, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="text-sm font-bold text-slate-900">
                          {client.name}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="text-sm font-black text-slate-900">
                          {formatCurrency(client.pendingInterest)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="text-xs font-bold text-slate-600">
                          {formatCurrency(client.monthlyInterest)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div
                          className={`inline-block w-3 h-3 rounded-full ${
                            client.statusColor === "green"
                              ? "bg-green-500"
                              : client.statusColor === "yellow"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          title={
                            client.statusColor === "green"
                              ? "Al día"
                              : client.statusColor === "yellow"
                              ? "Amarillo"
                              : "En mora"
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mb-6">
        <div className="glass-card px-5 py-3 rounded-2xl flex items-center gap-4 w-full sm:w-auto">
          <Target size={20} className="text-slate-700" />
          <div>
            <p className="text-[8px] font-black uppercase text-slate-500">
              ROI Mensual
            </p>
            <p className="text-lg font-black text-slate-900">
              {stats.monthlyROI.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Métricas principales - Grid responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Landmark size={20} />}
          label="Capital en Calle"
          value={formatCurrency(stats.pendingCapital)}
          color="indigo"
          trend={
            stats.pendingCapital > stats.totalInitialCapital ? "up" : "down"
          }
        />
        <MetricCard
          icon={<Zap size={20} />}
          label="Rédito Mensual"
          value={formatCurrency(stats.monthlyProjectedRevenue)}
          color="emerald"
        />
        <MetricCard
          icon={<History size={20} />}
          label="Cobros Históricos"
          value={formatCurrency(stats.totalInterestPaid)}
          color="blue"
        />
        <MetricCard
          icon={<AlertCircle size={20} />}
          label="Tasa de Mora"
          value={`${(
            (stats.overdueCount / (stats.activeCount || 1)) *
            100
          ).toFixed(0)}%`}
          color="rose"
        />
      </div>

      {/* Segunda fila de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<DollarSign size={20} />}
          label="Préstamo Promedio"
          value={formatCurrency(stats.avgLoanAmount)}
          color="purple"
        />
        <MetricCard
          icon={<Percent size={20} />}
          label="Tasa Promedio"
          value={`${stats.avgRate.toFixed(1)}%`}
          color="amber"
        />
        <MetricCard
          icon={<Award size={20} />}
          label="Tasa Recuperación"
          value={`${stats.recoveryRate.toFixed(1)}%`}
          color="cyan"
        />
        <MetricCard
          icon={<Clock size={20} />}
          label="Días Mora Prom."
          value={`${Math.round(stats.avgOverdueDays)}`}
          color="orange"
        />
      </div>

      {/* Tercera fila de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users size={20} />}
          label="Préstamos Activos"
          value={stats.activeCount.toString()}
          color="indigo"
        />
        <MetricCard
          icon={<ShieldCheck size={20} />}
          label="Préstamos Cerrados"
          value={stats.closedCount.toString()}
          color="green"
        />
        <MetricCard
          icon={<Activity size={20} />}
          label="Total Transacciones"
          value={stats.totalTransactions.toString()}
          color="blue"
        />
        <MetricCard
          icon={<TrendingUp size={20} />}
          label="Total Cobrado"
          value={formatCurrency(stats.totalPaidAmount)}
          color="emerald"
        />
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico de proyección */}
        <div className="lg:col-span-8 glass-card p-6 sm:p-7 rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-slate-700" />
                Proyección de Ingresos
              </h3>
              <p className="text-[9px] font-bold uppercase text-slate-500 mt-1">
                Próximos 12 meses
              </p>
            </div>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.projectionData}>
                <defs>
                  <linearGradient
                    id="colorGanancia"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#1e293b"
                  strokeOpacity={0.2}
                />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.95)",
                    backdropFilter: "blur(20px)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#f8fafc",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ganancia"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="url(#colorGanancia)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de estado */}
        <div className="lg:col-span-4 glass-card p-6 sm:p-7 rounded-lg flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <PieChartIcon size={16} className="text-slate-700" />
                Estado
              </h3>
              <p className="text-[9px] font-bold uppercase text-slate-500 mt-1">
                Capital
              </p>
            </div>
          </div>
          <div className="h-48 sm:h-52 w-full relative flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-black text-slate-900">
                {stats.activeCount}
              </p>
              <p className="text-[8px] uppercase font-black text-slate-600">
                Activos
              </p>
            </div>
          </div>
          <div className="w-full space-y-2.5 mt-4 pt-4 border-t border-[#e5e7eb]">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                Sano
              </span>
              <span className="text-slate-900">
                {formatCurrency(stats.capitalOnTime)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold uppercase">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                Mora
              </span>
              <span className="text-slate-900">
                {formatCurrency(stats.capitalOverdue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de historial mensual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 glass-card p-6 sm:p-7 rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-slate-700" />
                Historial Mensual
              </h3>
              <p className="text-[9px] font-bold uppercase text-slate-500 mt-1">
                Últimos 6 meses
              </p>
            </div>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyData}>
                <defs>
                  <linearGradient id="colorCobrado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#1e293b"
                  strokeOpacity={0.2}
                />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.95)",
                    backdropFilter: "blur(20px)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#f8fafc",
                  }}
                />
                <Bar
                  dataKey="cobrado"
                  fill="url(#colorCobrado)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de estado de préstamos */}
        <div className="lg:col-span-4 glass-card p-6 sm:p-7 rounded-lg flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-slate-700" />
                Préstamos
              </h3>
              <p className="text-[9px] font-bold uppercase text-slate-500 mt-1">
                Por estado
              </p>
            </div>
          </div>
          <div className="h-48 sm:h-52 w-full relative flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {statusPieData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-black text-slate-900">
                {stats.activeCount}
              </p>
              <p className="text-[8px] uppercase font-black text-slate-600">
                Total
              </p>
            </div>
          </div>
          <div className="w-full space-y-2.5 mt-4 pt-4 border-t border-[#e5e7eb]">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                Al Día
              </span>
              <span className="text-slate-900">
                {stats.activeCount - stats.overdueCount}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold uppercase">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                En Mora
              </span>
              <span className="text-slate-900">{stats.overdueCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secciones: Cobros y Mora */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sección de Cobros */}
        <div className="glass-card p-6 sm:p-7 rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-slate-700" />
                Cobros
              </h3>
              <p className="text-[9px] font-bold uppercase text-slate-600 mt-1">
                Préstamos al día
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-4">
              <p className="text-[9px] font-black text-slate-600 uppercase mb-2">
                Total Cobrado
              </p>
              <p className="text-2xl font-black text-slate-900">
                {formatCurrency(stats.totalInterestPaid)}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Al Día
                </span>
                <span className="text-sm font-black text-slate-900">
                  {stats.activeCount - stats.overdueCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Capital Sano
                </span>
                <span className="text-sm font-black text-slate-800">
                  {formatCurrency(stats.capitalOnTime)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Rédito Mensual
                </span>
                <span className="text-sm font-black text-slate-800">
                  {formatCurrency(stats.monthlyProjectedRevenue)}
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-[#e5e7eb]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-slate-700" />
                <p className="text-[9px] font-black text-slate-600 uppercase">
                  Tasa Recuperación
                </p>
              </div>
              <p className="text-xl font-black text-slate-900">
                {stats.recoveryRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Sección de Mora */}
        <div className="glass-card p-6 sm:p-7 rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <AlertCircle size={16} className="text-slate-700" />
                Mora
              </h3>
              <p className="text-[9px] font-bold uppercase text-slate-600 mt-1">
                Préstamos en mora
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-4">
              <p className="text-[9px] font-black text-slate-600 uppercase mb-2">
                Capital en Mora
              </p>
              <p className="text-2xl font-black text-slate-900">
                {formatCurrency(stats.capitalOverdue)}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  En Mora
                </span>
                <span className="text-sm font-black text-slate-900">
                  {stats.overdueCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Tasa de Mora
                </span>
                <span className="text-sm font-black text-slate-800">
                  {(
                    (stats.overdueCount / (stats.activeCount || 1)) *
                    100
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Días Promedio
                </span>
                <span className="text-sm font-black text-slate-800">
                  {Math.round(stats.avgOverdueDays)}
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-[#e5e7eb]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={14} className="text-slate-700" />
                <p className="text-[9px] font-black text-slate-600 uppercase">
                  Riesgo
                </p>
              </div>
              <p className="text-xl font-black text-slate-900">
                {stats.capitalOverdue > 0
                  ? (
                      (stats.capitalOverdue / stats.pendingCapital) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, color, trend }: any) => {
  const colorStyles = {
    indigo: "text-[#232f3e] bg-[#f9fafb] border-[#e5e7eb]",
    emerald: "text-[#232f3e] bg-[#f9fafb] border-[#e5e7eb]",
    blue: "text-[#232f3e] bg-[#f9fafb] border-[#e5e7eb]",
    rose: "text-[#232f3e] bg-[#f9fafb] border-[#e5e7eb]",
    purple: "text-[#232f3e] bg-[#f9fafb] border-[#e5e7eb]",
    amber: "text-[#232f3e] bg-[#f9fafb] border-[#e5e7eb]",
    cyan: "text-[#232f3e] bg-[#f9fafb] border-[#e5e7eb]",
    orange: "text-[#232f3e] bg-[#f9fafb] border-[#e5e7eb]",
    green: "text-[#232f3e] bg-[#f9fafb] border-[#e5e7eb]",
  };
  return (
    <div className="glass-card p-5 sm:p-6 rounded-lg group transition-all duration-200">
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 border ${
          colorStyles[color as keyof typeof colorStyles]
        }`}
      >
        {icon}
      </div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <p className="text-lg sm:text-xl font-black text-slate-900">{value}</p>
        {trend &&
          (trend === "up" ? (
            <TrendingUp size={14} className="text-slate-600" />
          ) : (
            <TrendingDown size={14} className="text-slate-500" />
          ))}
      </div>
    </div>
  );
};

export default Stats;
