
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
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-black tracking-tight">Clientes</h1><p className="text-slate-500 text-xs font-bold uppercase">Gestión de perfiles</p></div>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input type="text" placeholder="Filtrar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 rounded-2xl border border-white/10 bg-slate-900 focus:outline-none transition-all text-sm" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(client => (
          <div key={client.id} className="glass-card rounded-2xl p-5 border border-white/5 hover:border-indigo-500/30 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all"><UserCircle size={24} /></div>
                <div><h3 className="font-bold text-sm">{client.name}</h3><div className="flex items-center gap-1 text-slate-500"><Phone size={10} /><span className="text-[10px] font-bold uppercase">{client.phone}</span></div></div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleStartEdit(client)} className="p-2 bg-white/5 hover:bg-indigo-600 hover:text-white rounded-lg"><Edit2 size={14} /></button>
                <button onClick={() => onDeleteClient(client.id)} className="p-2 bg-white/5 hover:bg-red-600 hover:text-white rounded-lg"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <div className="flex items-center gap-1"><Calendar size={12} className="text-slate-600" /><span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{new Date(client.createdat).toLocaleDateString()}</span></div>
              <div className="px-2 py-1 bg-slate-800 rounded-md text-[9px] font-black uppercase text-slate-400">{getLoanCount(client.id)} Op.</div>
            </div>
          </div>
        ))}
      </div>
      {editingClient && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex justify-between items-center"><h2 className="font-bold text-xs uppercase">Editar Perfil</h2><button onClick={() => setEditingClient(null)} className="p-1 text-slate-500"><X size={20}/></button></div>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/5 text-sm" />
            <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/5 text-sm" />
            <button onClick={handleSave} className="w-full py-4 bg-indigo-600 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><Save size={16} /> Guardar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsList;
