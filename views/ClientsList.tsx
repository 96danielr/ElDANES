
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Client, Loan } from '../types';
import { Search, UserCircle, Edit2, Trash2, Phone, Calendar, X, Save, Users } from 'lucide-react';

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
    <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-[#e6edf3] tracking-tight flex items-center justify-center gap-2 sm:gap-3">
          <Users size={20} className="text-[#58a6ff] sm:w-6 sm:h-6" />
          Clientes
        </h1>
        <p className="text-[#8b949e] text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] mt-1.5 sm:mt-2">Gestión de perfiles</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6e7681]" size={16} />
        <input
          type="text"
          placeholder="Filtrar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 sm:py-4 rounded-xl input-glass text-sm font-semibold"
        />
      </div>

      {/* Clients Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((client, idx) => (
          <div
            key={client.id}
            className="glass-card rounded-2xl p-4 sm:p-5 group"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#161b22] rounded-xl flex items-center justify-center text-[#8b949e] group-hover:bg-[#58a6ff]/20 group-hover:text-[#58a6ff] transition-all border border-[#21262d] flex-shrink-0">
                  <UserCircle size={22} className="sm:w-[26px] sm:h-[26px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm text-[#e6edf3] truncate">{client.name}</h3>
                  <div className="flex items-center gap-1.5 text-[#6e7681]">
                    <Phone size={10} />
                    <span className="text-[10px] font-semibold truncate">{client.phone || 'Sin teléfono'}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex-shrink-0">
                <button
                  onClick={() => handleStartEdit(client)}
                  className="p-1.5 sm:p-2 bg-[#161b22] hover:bg-[#58a6ff]/20 hover:text-[#58a6ff] rounded-lg text-[#8b949e] border border-[#21262d] transition-all"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => onDeleteClient(client.id)}
                  className="p-1.5 sm:p-2 bg-[#161b22] hover:bg-[#f85149]/20 hover:text-[#f85149] rounded-lg text-[#8b949e] border border-[#21262d] transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#21262d] pt-3">
              <div className="flex items-center gap-1.5">
                <Calendar size={12} className="text-[#6e7681]" />
                <span className="text-[10px] font-semibold text-[#6e7681] uppercase tracking-wider">
                  {new Date(client.createdat).toLocaleDateString()}
                </span>
              </div>
              <div className="badge badge-info">
                {getLoanCount(client.id)} Op.
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="glass-card p-12 rounded-2xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center">
            <Users size={24} className="text-[#6e7681]" />
          </div>
          <p className="text-[#8b949e] font-medium">No se encontraron clientes</p>
        </div>
      )}

      {/* Edit Modal - Using React Portal */}
      {editingClient && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(1, 4, 9, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingClient(null);
            }
          }}
        >
          <div
            className="animate-slide-up"
            style={{
              background: 'rgba(22, 27, 34, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(48, 54, 61, 0.5)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '380px',
              padding: '20px',
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xs sm:text-sm uppercase text-[#e6edf3] tracking-wider">Editar Perfil</h2>
              <button
                onClick={() => setEditingClient(null)}
                className="p-2 hover:bg-[#21262d] rounded-lg text-[#8b949e] hover:text-[#e6edf3] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre"
                className="w-full px-4 py-3 rounded-xl input-glass text-sm font-semibold"
              />
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Teléfono"
                className="w-full px-4 py-3 rounded-xl input-glass text-sm font-semibold"
              />
              <button
                onClick={handleSave}
                className="w-full py-3.5 btn-primary rounded-xl font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <Save size={16} /> Guardar Cambios
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ClientsList;
