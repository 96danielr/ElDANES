
import React, { useState } from 'react';
import { Client, Loan } from '../types';
import { Search, UserCircle, Edit2, Trash2, Phone, Calendar, X, Save } from 'lucide-react';

interface Props {
  clients: Client[];
  loans: Loan[];
  onUpdateClient: (id: string, name: string, phone: string) => void;
  onDeleteClient: (id: string) => void;
}

const ClientsList: React.FC<Props> = ({ clients, loans, onUpdateClient, onDeleteClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const filtered = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getLoanCount = (clientId: string) => {
    return loans.filter(l => l.clientid === clientId).length;
  };

  const handleStartEdit = (client: Client) => {
    setEditingClient(client);
    setEditName(client.name);
    setEditPhone(client.phone);
  };

  const handleSave = () => {
    if (editingClient && editName) {
      onUpdateClient(editingClient.id, editName, editPhone);
      setEditingClient(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-xl font-black tracking-tight text-[rgb(51,65,85)]">Clientes</h1>
        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Gestión de perfiles</p>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input type="text" placeholder="Filtrar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 rounded-lg border border-[#e5e7eb] bg-white focus:outline-none focus:border-[#146eb4] transition-all text-sm text-[#232f3e]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(client => (
          <div key={client.id} className="glass-card rounded-lg p-5 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#f9fafb] rounded-full flex items-center justify-center text-[#232f3e] group-hover:bg-[#146eb4] group-hover:text-white transition-all border border-[#e5e7eb]"><UserCircle size={24} /></div>
                <div><h3 className="font-bold text-sm text-slate-900">{client.name}</h3><div className="flex items-center gap-1 text-slate-600"><Phone size={10} /><span className="text-[10px] font-bold uppercase">{client.phone}</span></div></div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleStartEdit(client)} className="p-2 bg-[#f9fafb] hover:bg-[#146eb4] hover:text-white rounded-lg text-[#545b64] border border-[#e5e7eb]"><Edit2 size={14} /></button>
                <button onClick={() => onDeleteClient(client.id)} className="p-2 bg-[#f9fafb] hover:bg-[#dc2626] hover:text-white rounded-lg text-[#545b64] border border-[#e5e7eb]"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#e5e7eb] pt-3">
              <div className="flex items-center gap-1"><Calendar size={12} className="text-[#545b64]" /><span className="text-[9px] font-bold text-[#545b64] uppercase tracking-widest">{new Date(client.createdat).toLocaleDateString()}</span></div>
              <div className="px-2 py-1 bg-[#f9fafb] rounded-md text-[9px] font-black uppercase text-[#232f3e] border border-[#e5e7eb]">{getLoanCount(client.id)} Op.</div>
            </div>
          </div>
        ))}
      </div>
      {editingClient && (
        <div className="fixed inset-0 bg-white/90 z-[300] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center"><h2 className="font-bold text-xs uppercase text-slate-900">Editar Perfil</h2><button onClick={() => setEditingClient(null)} className="p-1 text-slate-600"><X size={20}/></button></div>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-white border border-[#e5e7eb] text-sm text-[#232f3e] focus:outline-none focus:border-[#146eb4]" />
            <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-white border border-[#e5e7eb] text-sm text-[#232f3e] focus:outline-none focus:border-[#146eb4]" />
            <button onClick={handleSave} className="w-full py-4 bg-[#146eb4] hover:bg-[#0f5a8f] text-white rounded-lg font-black text-xs uppercase flex items-center justify-center gap-2 transition-all"><Save size={16} /> Guardar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsList;
