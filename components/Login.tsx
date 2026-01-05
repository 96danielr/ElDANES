import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { DNFusionLogo } from '../App';

interface LoginProps {
  onLogin: (password: string) => boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simular un pequeño delay para mejor UX
    setTimeout(() => {
      const isValid = onLogin(password);
      if (!isValid) {
        setError('Contraseña incorrecta');
        setPassword('');
      }
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="glass-card p-8 sm:p-10 rounded-2xl w-full max-w-md shadow-xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <DNFusionLogo size={64} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[rgb(51,65,85)] mb-2">
            Danes Finance
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            Sistema de Gestión
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Ingresa la contraseña"
                className="w-full pl-12 pr-4 py-3 rounded-lg bg-white border border-[#e5e7eb] text-sm font-bold text-[#232f3e] focus:outline-none focus:border-[#146eb4] focus:ring-2 focus:ring-[#146eb4]/20 transition-all"
                autoFocus
                disabled={isLoading}
              />
            </div>
            {error && (
              <p className="mt-2 text-xs font-bold text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-3.5 rounded-lg bg-[#146eb4] hover:bg-[#0f5a8f] text-white font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isLoading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
