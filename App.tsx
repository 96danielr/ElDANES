
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
import { LayoutGrid, PlusCircle, BarChart3, Users, RefreshCw, Sun, Moon, Receipt } from 'lucide-react';
import ConfirmModal from './components/ConfirmModal';
import Login from './components/Login';
import { useTheme } from './hooks/useTheme';

export const DNFusionLogo = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Fondo circular con glow */}
    <circle cx="50" cy="50" r="48" fill="url(#logo_bg)" opacity="0.3" />
    <circle cx="50" cy="50" r="45" fill="url(#logo_bg)" />
    
    {/* Letra D con gradiente vibrante */}
    <path 
      d="M25 20 L25 80 M25 20 L60 20 C75 20 80 30 80 50 C80 70 75 80 60 80 L25 80" 
      stroke="url(#logo_grad)" 
      strokeWidth="12" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
    />
    
    {/* Estrella decorativa */}
    <path 
      d="M70 30 L72 35 L77 35 L73 38 L75 43 L70 40 L65 43 L67 38 L63 35 L68 35 Z" 
      fill="url(#logo_star)" 
    />
    
    <defs>
      <radialGradient id="logo_bg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#146eb4" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#232f3e" stopOpacity="0.1" />
      </radialGradient>
      <linearGradient id="logo_grad" x1="25" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#146eb4" />
        <stop offset="40%" stopColor="#0f5a8f" />
        <stop offset="70%" stopColor="#0d4a75" />
        <stop offset="100%" stopColor="#232f3e" />
      </linearGradient>
      <linearGradient id="logo_star" x1="65" y1="30" x2="77" y2="43" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#146eb4" />
        <stop offset="100%" stopColor="#FF9900" />
      </linearGradient>
    </defs>
  </svg>
);

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Verificar si hay sesión guardada en localStorage
    return localStorage.getItem('danes_auth') === 'authenticated';
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new' | 'clients' | 'stats' | 'movimientos'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Estado para modal de confirmación
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
          // Borramos primero transacciones por la FK
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

  const registerPayment = async (loanId: string, amount: number) => {
    const loan = loans.find(l => l.id === loanId);
    const summary = summaries.find(s => s.loan.id === loanId);
    if (!loan || !summary) return;
    
    try {
      const result = await registerPaymentFunction({
        loanId,
        amount,
        pendingInterest: summary.pendingInterest
      });
      showToast(result.message || "Abono procesado correctamente");
      fetchData();
    } catch (error: any) {
      console.error('Register payment error:', error);
      showToast(error.message || "Error al procesar el pago", "error");
    }
  };

  const updateLoan = async (loanId: string, monthlyrate?: number, currentcapital?: number, initialcapital?: number) => {
    try {
      const result = await updateLoanFunction({
        loanId,
        monthlyrate,
        currentcapital,
        initialcapital
      });
      showToast(result.message || "Préstamo actualizado correctamente");
      fetchData();
    } catch (error: any) {
      console.error('Update loan error:', error);
      showToast(error.message || "Error al actualizar el préstamo", "error");
    }
  };

  // Si no está autenticado, mostrar el login
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (loading && clients.length === 0) return (
    <div className="min-h-screen relative flex flex-col items-center justify-center gap-4">
      {/* Blobs de fondo con colores vibrantes */}
      <div className="bg-blob bg-blob-1"></div>
      <div className="bg-blob bg-blob-2"></div>
      <div className="bg-blob bg-blob-3"></div>
      <div className="bg-blob bg-blob-4"></div>
      <DNFusionLogo size={60} className="animate-pulse relative z-10" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#232f3e] relative z-10">Sincronizando...</p>
    </div>
  );

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pt-16 relative">
      {/* Blobs de fondo con colores vibrantes */}
      <div className="bg-blob bg-blob-1"></div>
      <div className="bg-blob bg-blob-2"></div>
      <div className="bg-blob bg-blob-3"></div>
      <div className="bg-blob bg-blob-4"></div>
      
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`glass-card px-6 py-3 rounded-2xl border shadow-2xl ${notification.type === 'success' ? 'border-emerald-500/40' : 'border-rose-500/40'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{notification.message}</p>
          </div>
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 nav-glass z-[100] hidden md:block border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DNFusionLogo size={28} />
            <span className="text-base font-black tracking-tight text-[rgb(51,65,85)]">Danes Finance</span>
          </div>
          <nav className="flex gap-2 p-1 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
            <NavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutGrid size={16}/>} label="Cobros" />
            <NavBtn active={activeTab === 'new'} onClick={() => setActiveTab('new')} icon={<PlusCircle size={16}/>} label="Operar" />
            <NavBtn active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} icon={<Users size={16}/>} label="Clientes" />
            <NavBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<BarChart3 size={16}/>} label="Stats" />
            <NavBtn active={activeTab === 'movimientos'} onClick={() => setActiveTab('movimientos')} icon={<Receipt size={16}/>} label="Movimientos" />
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:px-6">
        {activeTab === 'dashboard' && <Dashboard summaries={summaries} transactions={transactions} onPayment={registerPayment} onSettle={settleLoan} onDeleteLoan={deleteLoan} onUpdateLoan={updateLoan} showConfirm={showConfirm} />}
        {activeTab === 'new' && <NewLoan clients={clients} loans={loans} onAddClient={addClient} onDeleteClient={deleteClient} onCreateLoan={createLoan} />}
        {activeTab === 'clients' && <ClientsList clients={clients} loans={loans} onUpdateClient={updateClient} onDeleteClient={deleteClient} />}
        {activeTab === 'stats' && <Stats summaries={summaries} transactions={transactions} loans={loans} />}
        {activeTab === 'movimientos' && <Movimientos summaries={summaries} transactions={transactions} />}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] nav-glass rounded-2xl flex justify-around items-center h-16 md:hidden z-[100] shadow-2xl border border-white/30 px-2">
        <MobileNavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutGrid size={22}/>} />
        <MobileNavBtn active={activeTab === 'new'} onClick={() => setActiveTab('new')} icon={<PlusCircle size={22}/>} />
        <MobileNavBtn active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} icon={<Users size={22}/>} />
        <MobileNavBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<BarChart3 size={22}/>} />
        <MobileNavBtn active={activeTab === 'movimientos'} onClick={() => setActiveTab('movimientos')} icon={<Receipt size={22}/>} />
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
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${active ? 'bg-[#FF9900] text-white shadow-md' : 'text-[#545b64] hover:text-[#FF9900] hover:bg-[#f7f7f7]'}`}>
    {icon} <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
  </button>
);

const MobileNavBtn = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={`p-3 rounded-xl transition-all ${active ? 'bg-[#FF9900] text-white shadow-md' : 'text-[#545b64]'}`}>{icon}</button>
);

export default App;
