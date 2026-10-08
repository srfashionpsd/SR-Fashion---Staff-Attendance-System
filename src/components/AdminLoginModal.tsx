import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import {
  LogIn,
  X,
  Lock,
  User as UserIcon,
  ShieldCheck,
  KeyRound
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await api.login(username.trim(), password);
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickFillAdmin = () => {
    setUsername('admin');
    setPassword('admin123');
  };

  const quickFillOperator = () => {
    setUsername('operator');
    setPassword('op123');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-white space-y-4">
        
        {/* Header with Official Logo */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-amber-400 bg-slate-950 flex-shrink-0">
              <img src="/sr_fashion_logo.jpg" alt="SR Fashion Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">SR Fashion Portal</h3>
              <p className="text-[11px] text-amber-400 font-semibold">Admin Authentication</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs text-rose-300 font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Username
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:outline-none text-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Password or Master PIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:outline-none text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Fast Login Chips */}
        <div className="pt-2 border-t border-slate-800 space-y-1.5 text-center">
          <span className="text-[10px] text-slate-500 block uppercase font-bold">
            One-Click Demo Credentials:
          </span>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={quickFillAdmin}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-amber-300 border border-slate-700 transition cursor-pointer"
            >
              Fill Admin (admin123)
            </button>
            <button
              type="button"
              onClick={quickFillOperator}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-blue-300 border border-slate-700 transition cursor-pointer"
            >
              Fill Operator (op123)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
