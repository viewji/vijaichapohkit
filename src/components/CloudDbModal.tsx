import React from 'react';
import { Database, X, AlertTriangle, ExternalLink, RefreshCw, CheckCircle2, Server } from 'lucide-react';
import { useStudy } from '../context/StudyContext';

interface CloudDbModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudDbModal: React.FC<CloudDbModalProps> = ({ isOpen, onClose }) => {
  const { syncStatus, refreshFromServer, dbDiagnostic } = useStudy();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-rose-400 font-bold text-base">
            <Database className="w-5 h-5" />
            <span>Central Cloud Database Setup</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {/* Status Banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <strong className="block text-sm font-semibold text-rose-300 mb-0.5">
                Vercel Cloud Database Not Connected
              </strong>
              <span>
                To sync all coordinators across different computers and phones in real-time, Vercel needs to connect your project to a cloud database.
              </span>
            </div>
          </div>

          {/* Diagnostic Info */}
          {dbDiagnostic && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-2">
              <span className="font-semibold text-slate-300 block">Vercel Diagnostic Info:</span>
              <div className="font-mono text-[11px] text-slate-400 space-y-1">
                <div>
                  <span className="text-slate-500">Status:</span> {dbDiagnostic.error || 'DATABASE_NOT_CONNECTED'}
                </div>
                <div>
                  <span className="text-slate-500">Detected Keys:</span>{' '}
                  {dbDiagnostic.detectedKeys && dbDiagnostic.detectedKeys.length > 0 ? (
                    <span className="text-amber-400 font-bold">{dbDiagnostic.detectedKeys.join(', ')}</span>
                  ) : (
                    <span className="text-rose-400 font-semibold">None (Database not linked to this deployment yet)</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step-by-Step Fix */}
          <div className="space-y-2.5 text-xs text-slate-300">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] block">
              How to Connect in 2 Minutes on Vercel:
            </span>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <strong className="block text-slate-200">Redeploy on Vercel (Most Common Fix)</strong>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    If you created the database <em>after</em> your first upload, Vercel requires you to trigger a <strong>Redeploy</strong> in your Vercel Dashboard under the <strong>Deployments</strong> tab (click the <strong>...</strong> menu on your latest deployment $\rightarrow$ <strong>Redeploy</strong>).
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <strong className="block text-slate-200">Verify Database is "KV" (Key-Value)</strong>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    In your Vercel Dashboard under <strong>Storage</strong>, make sure the database created is a <strong>KV</strong> (Redis) database, and that your project is selected in <strong>Connected Projects</strong>.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            <span>Open Vercel Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={async () => {
              await refreshFromServer();
              if (syncStatus === 'synced') {
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Connection Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
