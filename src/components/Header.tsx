import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  RotateCcw, 
  KeyRound, 
  FileSpreadsheet,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { exportAllocationsToCsv } from '../lib/csvExport';

interface HeaderProps {
  onOpenSeedModal: () => void;
  onOpenResetModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSeedModal, onOpenResetModal, onLogout }) => {
  const { scheme, validation } = useStudy();

  const handleExportCsv = () => {
    exportAllocationsToCsv(scheme.slots, {
      schemeId: scheme.schemeId,
      seed: scheme.seed,
      createdAt: scheme.createdAt,
    });
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title and Protocol Metadata */}
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100 tracking-tight">
                  RCT Stratified Randomization Portal
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  N = 32
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Block Size = 4
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Protocol: <strong className="text-slate-300">RCT-WB-2026</strong></span>
                <span>•</span>
                <span>Interventions: <strong className="text-emerald-300">Walking Bike (16)</strong> vs <strong className="text-indigo-300">Control (16)</strong></span>
                <span>•</span>
                <span>Stratification: <strong className="text-slate-300">Sex (16M / 16F)</strong></span>
              </p>
            </div>
          </div>

          {/* Validation Status & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mathematical Invariant Badge */}
            {validation.isValid ? (
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-medium"
                title="Strict Mathematical Assertion Passed: Exactly 2 Walking Bike & 2 Control per block, 8:8 per stratum, 16:16 overall."
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>1:1 Blocks Verified</span>
              </div>
            ) : (
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-400 text-xs font-medium"
                title={validation.errors.join('; ')}
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Integrity Error</span>
              </div>
            )}

            {/* Seed Indicator */}
            <button
              onClick={onOpenSeedModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
              title="Click to view or set randomization seed"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Seed: {scheme.seed ? `"${scheme.seed}"` : 'WebCrypto'}</span>
            </button>

            {/* CSV Export */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
              title="Download RFC-4180 compliant CSV of complete allocation matrix"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Reset Study Data */}
            <button
              onClick={onOpenResetModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-900/30 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-medium transition-colors"
              title="Reset study data or re-generate scheme"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {/* Lock / Logout Portal */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-amber-400 text-xs font-medium transition-colors"
              title="Lock portal and require password on return"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Lock Portal</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
