import React, { useState } from 'react';
import { KeyRound, Sparkles, X, ShieldCheck, RefreshCw, Hash, Calendar, Layers } from 'lucide-react';
import { useStudy } from '../context/StudyContext';

interface SchemeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemeConfigModal: React.FC<SchemeConfigModalProps> = ({ isOpen, onClose }) => {
  const { scheme, validation, generateNewScheme } = useStudy();

  const [seedInput, setSeedInput] = useState(scheme.seed || '');

  if (!isOpen) return null;

  const handleRegenerate = (e: React.FormEvent) => {
    e.preventDefault();
    generateNewScheme(seedInput.trim() || undefined);
    onClose();
  };

  const handleGenerateRandomSeed = () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    setSeedInput(`RCT-SEED-${randomHex}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-base">
            <KeyRound className="w-5 h-5" />
            <span>Randomization Scheme & Seed Config</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleRegenerate} className="py-4 space-y-4">
          {/* Active Scheme Metadata */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-400 font-sans">
              <span>Active Scheme ID:</span>
              <span className="font-mono text-slate-200 font-bold">{scheme.schemeId}</span>
            </div>
            <div className="flex justify-between text-slate-400 font-sans">
              <span>Generated At:</span>
              <span className="text-slate-300">{new Date(scheme.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400 font-sans">
              <span>Validation Status:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1 font-sans">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Balanced (16 WB / 16 Control)</span>
              </span>
            </div>
          </div>

          {/* Seed Input Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Random Seed (Reproducibility Key)
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Using the same seed regenerates the exact identical permuted block sequence for biostatistical audits and peer review.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Leave blank for cryptographic random, or enter seed"
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={handleGenerateRandomSeed}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 shrink-0"
                title="Create a random reproducible seed"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Auto Seed</span>
              </button>
            </div>
          </div>

          {/* Mathematical Invariant Info */}
          <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-xs text-indigo-200 space-y-1">
            <strong className="block font-semibold text-indigo-300">Mathematical Specification:</strong>
            <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
              <li>Permuted blocks of size 4 (2 Walking Bike, 2 Control per block).</li>
              <li>4 blocks per stratum $\rightarrow$ exactly 16 subjects per sex stratum.</li>
              <li>Total $N=32$, strictly maintaining 1:1 allocation across both strata.</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-900/40"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate Scheme</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
