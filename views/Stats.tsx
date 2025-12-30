
import React, { useMemo } from 'react';
import { LoanSummary, Transaction, Loan } from '../types';
import { formatCurrency } from '../utils/finance';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, Target, Landmark, Activity, History, AlertCircle, Zap, Users, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { DNFusionLogo } from '../App';

interface Props {
  summaries: LoanSummary[];
  transactions: Transaction[];
  loans: Loan[];
}

const Stats: React.FC<Props> = ({ summaries, transactions, loans }) => {
  const stats = useMemo(() => {
    const activeLoans = loans.filter(l => l.isactive);
    const pendingCapital = activeLoans.reduce((sum, l) => sum + Number(l.currentcapital), 0);
    const totalInterestPaid = summaries.reduce((sum, s) => sum + s.totalInterestPaid, 0);
    const monthlyProjectedRevenue = summaries.reduce((sum, s) => sum + (Number(s.loan.currentcapital) * (Number(s.loan.monthlyrate) / 100)), 0);
    const monthlyROI = pendingCapital > 0 ? (monthlyProjectedRevenue / pendingCapital) * 100 : 0;
    
    const overdueSummaries = summaries.filter(s => s.isOverdue);
    const capitalOverdue = overdueSummaries.reduce((sum, s) => sum + Number(s.loan.currentcapital), 0);
    const capitalOnTime = pendingCapital - capitalOverdue;
    
    const projectionData = Array.from({ length: 6 }).map((_, i) => ({ 
      mes: `M${i + 1}`, 
      ganancia: monthlyProjectedRevenue * (i + 1) 
    }));

    return { 
      pendingCapital, 
      monthlyProjectedRevenue, 
      monthlyROI, 
      activeCount: summaries.length, 
      overdueCount: overdueSummaries.length, 
      capitalOnTime, 
      capitalOverdue, 
      projectionData, 
      totalInterestPaid 
    };
  }, [summaries, loans]);

  const pieData = [
    { name: 'Sano', value: stats.capitalOnTime, color: '#6366f1' },
    { name: 'Mora', value: stats.capitalOverdue, color: '#f43f5e' },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center gap-6">
        <div><h1 className="text-2xl font-black text-gradient">Métricas Globales</h1><p className="text-slate-500 text-[10px] font-bold uppercase flex items-center gap-2"><Activity size={12}/> Rendimiento Activos</p></div>
        <div className="glass-card px-5 py-3 rounded-2xl flex items-center gap-4"><Target size={20} className="text-indigo-400"/><div><p className="text-[8px] font-black uppercase">ROI Mes</p><p className="text-lg font-black">{stats.monthlyROI.toFixed(1)}%</p></div></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Landmark size={20} />} label="Capital en Calle" value={formatCurrency(stats.pendingCapital)} color="indigo" />
        <MetricCard icon={<Zap size={20} />} label="Rédito Mes" value={formatCurrency(stats.monthlyProjectedRevenue)} color="emerald" />
        <MetricCard icon={<History size={20} />} label="Cobros Históricos" value={formatCurrency(stats.totalInterestPaid)} color="blue" />
        <MetricCard icon={<AlertCircle size={20} />} label="Tasa Mora" value={`${((stats.overdueCount / (stats.activeCount || 1)) * 100).toFixed(0)}%`} color="rose" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 glass-card bg-slate-900/80 p-7 rounded-[2rem] border border-white/10 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.projectionData}><CartesianGrid vertical={false} stroke="#1e293b" strokeOpacity={0.2} /><XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 9, fontWeight: 800}} /><YAxis hide /><Tooltip contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none' }} /><Area type="monotone" dataKey="ganancia" stroke="#6366f1" strokeWidth={4} fill="#6366f120" /></AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-4 glass-card bg-slate-900/80 p-7 rounded-[2rem] border border-white/10 flex flex-col items-center">
          <div className="h-52 w-full relative">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">{pieData.map((e, i) => (<Cell key={i} fill={e.color} />))}</Pie></PieChart></ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><p className="text-xl font-black">{stats.activeCount}</p><p className="text-[8px] uppercase font-black text-slate-600">Ops</p></div>
          </div>
          <div className="w-full space-y-2 mt-4">
            <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-indigo-400">Sano</span><span>{formatCurrency(stats.capitalOnTime)}</span></div>
            <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-rose-400">Mora</span><span>{formatCurrency(stats.capitalOverdue)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, color }: any) => {
  const colorStyles = { indigo: 'text-indigo-400 bg-indigo-500/10', emerald: 'text-emerald-400 bg-emerald-500/10', blue: 'text-blue-400 bg-blue-500/10', rose: 'text-rose-400 bg-rose-500/10' };
  return (
    <div className="glass-card bg-slate-900/80 p-6 rounded-[1.75rem] border border-white/10 group hover:border-indigo-500/30 transition-all">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorStyles[color as keyof typeof colorStyles]}`}>{icon}</div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-baseline gap-2"><p className="text-lg font-black text-white">{value}</p><ArrowUpRight size={14} className="text-slate-700" /></div>
    </div>
  );
};

export default Stats;
