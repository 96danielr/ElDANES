
import React, { useState, useMemo } from 'react';
import { Client, Loan } from '../types';
import { formatCurrency } from '../utils/finance';
import { Search, Plus, Info, ArrowLeft, UserPlus, Users } from 'lucide-react';
import { DNFusionLogo } from '../App';

interface Props {
  clients: Client[];
  loans: Loan[];
  onAddClient: (name: string, phone: string) => Promise<Client | null>;
  onDeleteClient: (id: string) => void;
  onCreateLoan: (clientId: string, capital: number, rate: number, customStartDate?: number) => void;
}

const NewLoan: React.FC<Props> = ({ clients, loans, onAddClient, onCreateLoan }) => {
  const [step, setStep] = useState<'client' | 'loan'>('client');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [capital, setCapital] = useState('');
  const [rate, setRate] = useState('10');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const simulation = useMemo(() => {
    const cap = Number(capital) || 0;
    const r = Number(rate) || 0;
    return { monthlyInterest: cap * (r / 100) };
  }, [capital, rate]);

  const handleCreateLoan = () => {
    if (selectedClient && capital && rate) {
      onCreateLoan(selectedClient.id, Number(capital), Number(rate), new Date(startDate).getTime());
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 py-2">
      <div className="text-center">
        <h1 className="text-xl font-black tracking-tight text-gradient">Nueva Operación</h1>
        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Apertura de expediente</p>
      </div>
      <div className="glass-card bg-slate-900/80 p-5 rounded-[1.75rem] border border-white/10 relative overflow-hidden">
        {step === 'client' ? (
          <div className="space-y-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 text-xs font-bold focus:outline-none" />
            </div>
            <div className={`max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar ${filteredClients.length > 0 ? '' : 'hidden'}`}>
              {filteredClients.map(c => (
                <div key={c.id} onClick={() => { setSelectedClient(c); setStep('loan'); }} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition-all">
                  <div className="min-w-0"><p className="font-bold text-[11px] truncate">{c.name}</p><p className="text-[9px] text-slate-500 truncate">{c.phone}</p></div>
                  <Plus size={16} className="text-indigo-400" />
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-5 space-y-4">
              <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-2"><UserPlus size={14}/> Nuevo Perfil</p>
              <input type="text" placeholder="Nombre" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 text-xs font-bold focus:outline-none" />
              <input type="text" placeholder="Teléfono" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 text-xs font-bold focus:outline-none" />
              <button disabled={!newClientName} onClick={async () => { const c = await onAddClient(newClientName, newClientPhone); if(c) { setSelectedClient(c); setStep('loan'); }}} className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-30">Crear Perfil</button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <button onClick={() => setStep('client')} className="text-slate-400 hover:text-indigo-400 text-[9px] font-black uppercase flex items-center gap-2"><ArrowLeft size={14} /> Volver</button>
            <div className="bg-indigo-600 rounded-2xl p-5 text-white relative overflow-hidden"><p className="text-[8px] font-black uppercase opacity-70 mb-1">Titular</p><p className="text-lg font-black">{selectedClient?.name}</p><DNFusionLogo size={100} className="absolute -right-10 -bottom-10 opacity-10 rotate-12" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Capital Base</label><input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 text-lg font-black text-white focus:outline-none" /></div>
              <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tasa Mes %</label><input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="w-full py-3 rounded-xl bg-slate-950/50 border border-white/5 text-lg font-black text-center text-white focus:outline-none" /></div>
            </div>
            <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Inicio</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-[11px] font-bold text-white focus:outline-none" /></div>
            <div className="bg-indigo-500/5 p-4 rounded-xl border border-white/5 border-l-4 border-l-indigo-500">
              <p className="text-indigo-400 font-black text-[8px] uppercase tracking-widest mb-0.5">Rédito Mensual</p>
              <p className="text-xl font-black text-white">{formatCurrency(simulation.monthlyInterest)}</p>
            </div>
            <button onClick={handleCreateLoan} disabled={!capital} className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-20">Activar Préstamo</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewLoan;
