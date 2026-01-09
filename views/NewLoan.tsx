
import React, { useState, useMemo } from 'react';
import { Client, Loan } from '../types';
import { formatCurrency } from '../utils/finance';
import { Search, Plus, ArrowLeft, UserPlus, Zap, Calendar, Banknote, Percent } from 'lucide-react';
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
    <div className="max-w-lg mx-auto space-y-5 py-2 animate-fade-in-up">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#e6edf3] tracking-tight">Nueva Operación</h1>
        <p className="text-[#8b949e] text-xs font-medium uppercase tracking-[0.2em] mt-2">Apertura de expediente</p>
      </div>

      <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
        {step === 'client' ? (
          <div className="space-y-6">
            {/* New Client Section */}
            <div className="space-y-4">
              <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider flex items-center gap-2">
                <UserPlus size={14} className="text-[#58a6ff]" /> Nuevo Perfil
              </p>
              <input
                type="text"
                placeholder="Nombre"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl input-glass text-sm font-semibold"
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl input-glass text-sm font-semibold"
              />
              <button
                disabled={!newClientName}
                onClick={async () => {
                  const c = await onAddClient(newClientName, newClientPhone);
                  if (c) {
                    setSelectedClient(c);
                    setStep('loan');
                  }
                }}
                className="w-full py-4 rounded-xl btn-primary text-[11px] font-semibold uppercase tracking-wider disabled:opacity-30 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={16} /> Crear Perfil
              </button>
            </div>

            {/* Search Client Section */}
            <div className="border-t border-[#21262d] pt-6 space-y-4">
              <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider flex items-center gap-2">
                <Search size={14} className="text-[#a371f7]" /> Buscar Cliente
              </p>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6e7681]" size={16} />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl input-glass text-sm font-semibold"
                />
              </div>
              <div className={`max-h-48 overflow-y-auto space-y-2 pr-1 ${filteredClients.length > 0 ? '' : 'hidden'}`}>
                {filteredClients.map(c => (
                  <div
                    key={c.id}
                    onClick={() => { setSelectedClient(c); setStep('loan'); }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#161b22]/80 border border-[#21262d] hover:border-[#58a6ff]/40 hover:bg-[#161b22] cursor-pointer transition-all group"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[#e6edf3] truncate">{c.name}</p>
                      <p className="text-[10px] text-[#6e7681] truncate">{c.phone}</p>
                    </div>
                    <Plus size={16} className="text-[#6e7681] group-hover:text-[#58a6ff] transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Back Button */}
            <button
              onClick={() => setStep('client')}
              className="text-[#8b949e] hover:text-[#e6edf3] text-[10px] font-semibold uppercase flex items-center gap-2 transition-colors"
            >
              <ArrowLeft size={14} /> Volver
            </button>

            {/* Client Card */}
            <div className="bg-gradient-to-br from-[#58a6ff]/20 to-[#a371f7]/20 rounded-2xl p-6 border border-[#58a6ff]/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#58a6ff]/10 rounded-full blur-2xl" />
              <p className="text-[9px] font-semibold uppercase text-[#8b949e] tracking-wider mb-2">Titular</p>
              <p className="text-xl font-bold text-[#e6edf3] relative">{selectedClient?.name}</p>
              <DNFusionLogo size={80} className="absolute -right-6 -bottom-6 opacity-10 rotate-12" />
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5 ml-1">
                  <Banknote size={12} className="text-[#3fb950]" /> Capital Base
                </label>
                <input
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl input-glass text-lg font-bold font-mono"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5 ml-1">
                  <Percent size={12} className="text-[#a371f7]" /> Tasa Mes %
                </label>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl input-glass text-lg font-bold text-center font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5 ml-1">
                <Calendar size={12} className="text-[#d29922]" /> Fecha Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl input-glass text-sm font-semibold"
              />
            </div>

            {/* Simulation Card */}
            <div className="bg-[#161b22]/80 p-5 rounded-xl border border-[#21262d] border-l-4 border-l-[#3fb950]">
              <p className="text-[9px] font-semibold text-[#8b949e] uppercase tracking-wider mb-1">Rédito Mensual</p>
              <p className="text-2xl font-bold text-[#3fb950] font-mono">{formatCurrency(simulation.monthlyInterest)}</p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleCreateLoan}
              disabled={!capital}
              className="w-full py-4 rounded-xl btn-primary text-[11px] font-semibold uppercase tracking-wider disabled:opacity-20 flex items-center justify-center gap-2"
            >
              <Zap size={16} /> Activar Préstamo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewLoan;
