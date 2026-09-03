import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';

const REQUIRED_PASS = '0860897395';
export const AUTH_STORAGE_KEY = 'RCT_PORTAL_AUTH_SESSION_V1';

interface AuthGateProps {
  onAuthenticated: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === REQUIRED_PASS) {
      localStorage.setItem(AUTH_STORAGE_KEY, 'authenticated');
      onAuthenticated();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Portal Shield & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-lg shadow-emerald-950/50">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            RCT Randomization Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Protocol RCT-WB-2026 • Stratified Permuted Block (N=32)
          </p>
        </div>

        {/* Card */}
        <div className={`bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 transition-transform ${
          shake ? 'animate-shake ring-2 ring-rose-500/50' : ''
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-6 pb-3 border-b border-slate-800">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Authorized Clinical Staff Access</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label 
                htmlFor="access-pass" 
                className="block text-xs font-medium text-slate-300 mb-2 flex items-center justify-between"
              >
                <span>Trial Access Password</span>
                <span className="text-[10px] text-slate-500 font-normal">ICH-GCP Protected</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="access-pass"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(false);
                  }}
                  autoFocus
                  placeholder="Enter security passcode..."
                  className={`w-full pl-10 pr-11 py-3 bg-slate-950/90 border rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 font-mono transition-all ${
                    error
                      ? 'border-rose-500/70 focus:ring-rose-500/40 text-rose-200'
                      : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/40'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-2 animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Invalid security password. Please re-enter.</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/80 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <span>Unlock Randomization Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              This system contains concealed patient randomization codes. Unauthorized access or breach of allocation concealment is strictly prohibited.
            </p>
          </div>
        </div>

        {/* Version info */}
        <p className="text-center text-slate-600 text-xs mt-6">
          RCT Clinical Allocation System • Version 1.0.0
        </p>
      </div>
    </div>
  );
};
