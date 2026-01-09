import React, { useState } from 'react';
import { Lock, Shield, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#58a6ff]/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#a371f7]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="glass-card p-8 sm:p-10 rounded-2xl w-full max-w-md relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58a6ff] via-[#a371f7] to-[#3fb950]" />

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <DNFusionLogo size={72} />
              <div className="absolute inset-0 blur-2xl opacity-40">
                <DNFusionLogo size={72} />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#e6edf3] mb-2 tracking-tight">
            Danes Finance
          </h1>
          <p className="text-[#8b949e] text-xs font-medium uppercase tracking-[0.2em]">
            Sistema de Gestión
          </p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="badge badge-info">
            <Shield size={12} className="mr-1.5" />
            Acceso Seguro
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3">
              Contraseña
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6e7681] group-focus-within:text-[#58a6ff] transition-colors" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Ingresa la contraseña"
                className="w-full pl-12 pr-4 py-4 rounded-xl input-glass text-sm font-medium"
                autoFocus
                disabled={isLoading}
              />
              {/* Focus glow effect */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                   style={{ boxShadow: '0 0 20px rgba(88, 166, 255, 0.15)' }} />
            </div>
            {error && (
              <div className="mt-3 flex items-center gap-2 text-[#f85149]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f85149]" />
                <p className="text-xs font-semibold">{error}</p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-4 rounded-xl btn-primary text-sm font-semibold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Ingresar
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[#21262d]">
          <p className="text-center text-[10px] text-[#6e7681] uppercase tracking-wider">
            Danes Finance v2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
