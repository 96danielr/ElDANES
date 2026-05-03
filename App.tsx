
import React, { useState, useEffect, useMemo } from 'react';
import { Client, Loan, Transaction, LoanSummary } from './types';
import { calculateLoanSummary } from './utils/finance';
import Dashboard from './views/Dashboard';
import NewLoan from './views/NewLoan';
import Stats from './views/Stats';
import ClientsList from './views/ClientsList';
import Movimientos from './views/Movimientos';
import { supabase } from './lib/supabase';
import { settleLoan as settleLoanFunction, registerPayment as registerPaymentFunction, createLoan as createLoanFunction, updateLoan as updateLoanFunction } from './lib/functions';
import { LayoutGrid, PlusCircle, BarChart3, Users, RefreshCw, Receipt, Sparkles, FileDown } from 'lucide-react';
import { generateMonthlyReport } from './utils/reportPdf';
import ConfirmModal from './components/ConfirmModal';
import Login from './components/Login';
import { useTheme } from './hooks/useTheme';

// Logo — Glassmorphism monogram
export const DNFusionLogo = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="logo_ring" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="20" r="18" stroke="url(#logo_ring)" strokeWidth="2" fill="rgba(139,92,246,0.12)" />
    <text
      x="20" y="20"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="'DM Sans', system-ui, sans-serif"
      fontSize="18"
      fontWeight="700"
      fill="#FFFFFF"
    >D</text>
  </svg>
);

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('danes_auth') === 'authenticated';
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new' | 'clients' | 'stats' | 'movimientos'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'warning'
  });

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: 'danger' | 'warning' | 'info' = 'warning',
    confirmText?: string,
    cancelText?: string
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      variant,
      confirmText,
      cancelText
    });
  };

  const handleLogin = (password: string): boolean => {
    if (password === 'pagame') {
      setIsAuthenticated(true);
      localStorage.setItem('danes_auth', 'authenticated');
      return true;
    }
    return false;
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const { data: cData, error: ce } = await supabase.from('clients').select('*').order('name');
      const { data: lData, error: le } = await supabase.from('loans').select('*');
      const { data: tData, error: te } = await supabase.from('transactions').select('*').order('date', { ascending: false });

      if (ce || le || te) throw new Error("Error cargando tablas");

      setClients(cData || []);
      setLoans(lData || []);
      setTransactions(tData || []);
    } catch (err: any) {
      console.error('Fetch Error:', err);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const summaries: LoanSummary[] = useMemo(() => {
    return loans
      .filter(l => l.isactive)
      .map(loan => {
        const client = clients.find(c => c.id === loan.clientid) || { id: loan.clientid, name: 'Desconocido', phone: '', createdat: 0 };
        return calculateLoanSummary(loan, client, transactions);
      });
  }, [loans, clients, transactions]);

  const settledSummaries: LoanSummary[] = useMemo(() => {
    return loans
      .filter(l => !l.isactive)
      .map(loan => {
        const client = clients.find(c => c.id === loan.clientid) || { id: loan.clientid, name: 'Desconocido', phone: '', createdat: 0 };
        return calculateLoanSummary(loan, client, transactions);
      });
  }, [loans, clients, transactions]);

  const addClient = async (name: string, phone: string) => {
    const { data, error } = await supabase.from('clients').insert([{ name, phone, createdat: Date.now() }]).select().single();
    if (error) return showToast(error.message, 'error'), null;
    fetchData();
    return data as Client;
  };

  const updateClient = async (id: string, name: string, phone: string) => {
    const { error } = await supabase.from('clients').update({ name, phone }).eq('id', id);
    if (error) return showToast(error.message, 'error');
    showToast("Datos actualizados");
    fetchData();
  };

  const deleteClient = async (id: string) => {
    const hasActiveLoan = loans.some(l => l.clientid === id && l.isactive);
    if (hasActiveLoan) return showToast("Cliente con deuda activa", 'error');

    showConfirm(
      'Eliminar Cliente',
      '¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.',
      async () => {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) return showToast(error.message, 'error');
        showToast("Eliminado");
        fetchData();
      },
      'danger',
      'Eliminar',
      'Cancelar'
    );
  };

  const createLoan = async (clientId: string, capital: number, rate: number, customStartDate?: number) => {
    const existing = loans.find(l => l.clientid === clientId && l.isactive);

    if (existing) {
      showConfirm(
        'Préstamo Existente',
        `Este cliente ya tiene un préstamo activo. ¿Deseas sumar $${capital.toLocaleString()} al capital existente?`,
        async () => {
          try {
            const result = await createLoanFunction({
              clientId,
              capital,
              rate,
              customStartDate,
              existingLoanId: existing.id
            });
            showToast(result.message || "Capital sumado");
            setActiveTab('dashboard');
            fetchData();
          } catch (error: any) {
            console.error('Create loan error:', error);
            showToast(error.message || "Error al actualizar capital", "error");
          }
        },
        'info',
        'Sumar Capital',
        'Cancelar'
      );
    } else {
      try {
        const result = await createLoanFunction({
          clientId,
          capital,
          rate,
          customStartDate
        });
        showToast(result.message || "Préstamo activado");
        setActiveTab('dashboard');
        fetchData();
      } catch (error: any) {
        console.error('Create loan error:', error);
        showToast(error.message || "Error al crear préstamo", "error");
      }
    }
  };

  const deleteLoan = async (loanId: string) => {
    showConfirm(
      'Eliminar Préstamo',
      '¿Estás seguro de que deseas eliminar este préstamo? Se eliminarán también todos los abonos registrados. Esta acción no se puede deshacer.',
      async () => {
        try {
          const { error: te } = await supabase.from('transactions').delete().eq('loanid', loanId);
          if (te) throw te;
          const { error: le } = await supabase.from('loans').delete().eq('id', loanId);
          if (le) throw le;

          showToast("Operación eliminada del sistema");
          fetchData();
        } catch (e: any) {
          showToast(e.message, 'error');
        }
      },
      'danger',
      'Eliminar Todo',
      'Cancelar'
    );
  };

  const settleLoan = async (loanId: string) => {
    const summary = summaries.find(s => s.loan.id === loanId);
    if (!summary) return;
    const totalDue = Number(summary.loan.currentcapital) + Number(summary.pendingInterest);

    showConfirm(
      'Liquidar Préstamo',
      `¿Estás seguro de que deseas liquidar y cerrar este préstamo por un total de $${totalDue.toLocaleString()}? Esta acción marcará el préstamo como inactivo.`,
      async () => {
        try {
          const result = await settleLoanFunction({ loanId, totalDue });
          showToast(result.message || "Crédito liquidado con éxito");
          fetchData();
        } catch (error: any) {
          console.error('Settle loan error:', error);
          showToast(error.message || "Error al liquidar el préstamo", "error");
        }
      },
      'warning',
      'Liquidar',
      'Cancelar'
    );
  };

  const registerPayment = async (loanId: string, amount: number, paymentType: 'interest' | 'capital' | 'mixed' = 'mixed') => {
    const loan = loans.find(l => l.id === loanId);
    const summary = summaries.find(s => s.loan.id === loanId);
    if (!loan || !summary) return;

    try {
      const result = await registerPaymentFunction({
        loanId,
        amount,
        pendingInterest: summary.pendingInterest,
        paymentType
      });
      showToast(result.message || "Abono procesado correctamente");
      fetchData();
    } catch (error: any) {
      console.error('Register payment error:', error);
      showToast(error.message || "Error al procesar el pago", "error");
    }
  };

  const updateLoan = async (loanId: string, monthlyrate?: number, owner?: string) => {
    try {
      const result = await updateLoanFunction({
        loanId,
        monthlyrate,
        owner
      });
      showToast(result.message || "Préstamo actualizado correctamente");
      fetchData();
    } catch (error: any) {
      console.error('Update loan error:', error);
      showToast(error.message || "Error al actualizar el préstamo", "error");
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (loading && clients.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 relative z-10">
      <DNFusionLogo size={72} className="animate-pulse" />
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-secondary)]">Cargando</p>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-28 md:pb-0 md:pt-20 relative z-10">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] animate-fade-in-up">
          <div className={`glass-card px-6 py-3 rounded-xl flex items-center gap-3 ${
            notification.type === 'success'
              ? 'border-success/30 shadow-[0_0_20px_rgba(62,207,142,0.15)]'
              : 'border-danger/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
          }`}>
            <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-success' : 'bg-danger'}`} />
            <p className="text-sm font-semibold text-[var(--text-primary)]">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      <header className="fixed top-0 left-0 right-0 nav-glass z-[100] hidden md:block">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <DNFusionLogo size={32} />
            <div className="flex flex-col">
              <span className="text-base font-bold text-[var(--text-primary)] tracking-tight">Danes Finance</span>
              <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Sistema de Gestión</span>
            </div>
          </div>

          <nav className="flex items-center gap-1 p-1 bg-white/8 rounded-xl border border-[var(--border-default)]">
            <NavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutGrid size={16}/>} label="Cobros" />
            <NavBtn active={activeTab === 'new'} onClick={() => setActiveTab('new')} icon={<PlusCircle size={16}/>} label="Operar" />
            <NavBtn active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} icon={<Users size={16}/>} label="Clientes" />
            <NavBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<BarChart3 size={16}/>} label="Stats" />
            <NavBtn active={activeTab === 'movimientos'} onClick={() => setActiveTab('movimientos')} icon={<Receipt size={16}/>} label="Movimientos" />
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => generateMonthlyReport(summaries, transactions, loans, clients)}
              className="p-2.5 rounded-xl bg-white/8 border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-success hover:border-success/50 transition-all"
              title="Descargar informe mensual"
            >
              <FileDown size={18} />
            </button>
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white/8 border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-accent/50 transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-4">
        {activeTab === 'dashboard' && <Dashboard summaries={summaries} settledSummaries={settledSummaries} transactions={transactions} onPayment={registerPayment} onSettle={settleLoan} onDeleteLoan={deleteLoan} onUpdateLoan={updateLoan} showConfirm={showConfirm} />}
        {activeTab === 'new' && <NewLoan clients={clients} loans={loans} onAddClient={addClient} onDeleteClient={deleteClient} onCreateLoan={createLoan} />}
        {activeTab === 'clients' && <ClientsList clients={clients} loans={loans} onUpdateClient={updateClient} onDeleteClient={deleteClient} />}
        {activeTab === 'stats' && <Stats summaries={summaries} transactions={transactions} loans={loans} />}
        {activeTab === 'movimientos' && <Movimientos summaries={summaries} transactions={transactions} />}
      </main>

      {/* Mobile Download Button */}
      <button
        onClick={() => generateMonthlyReport(summaries, transactions, loans, clients)}
        className="fixed bottom-24 right-4 w-12 h-12 rounded-full bg-accent text-white shadow-lg flex items-center justify-center md:hidden z-[100] hover:bg-[var(--accent-hover)] transition-all active:scale-95"
        title="Descargar informe"
      >
        <FileDown size={20} />
      </button>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] nav-glass rounded-2xl flex justify-around items-center h-16 md:hidden z-[100] px-2">
        <MobileNavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutGrid size={22}/>} label="Cobros" />
        <MobileNavBtn active={activeTab === 'new'} onClick={() => setActiveTab('new')} icon={<PlusCircle size={22}/>} label="Nuevo" />
        <MobileNavBtn active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} icon={<Users size={22}/>} label="Clientes" />
        <MobileNavBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<BarChart3 size={22}/>} label="Stats" />
        <MobileNavBtn active={activeTab === 'movimientos'} onClick={() => setActiveTab('movimientos')} icon={<Receipt size={22}/>} label="Movs" />
      </nav>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />
    </div>
  );
};

const NavBtn = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
      active
        ? 'bg-accent/15 text-accent border border-accent/30'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
    }`}
  >
    {icon}
    <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
  </button>
);

const MobileNavBtn = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 min-w-[60px] ${
      active
        ? 'bg-accent/15 text-accent border border-accent/30'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`}
  >
    {icon}
    <span className="text-[9px] font-semibold uppercase tracking-wide">{label}</span>
  </button>
);

export default App;
