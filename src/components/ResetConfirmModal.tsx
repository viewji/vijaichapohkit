import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, X, ShieldAlert } from 'lucide-react';
import { useStudy } from '../context/StudyContext';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({ isOpen, onClose }) => {
  const { resetEnrollmentsOnly, fullStudyReset, totalEnrolled } = useStudy();

  const [resetType, setResetType] = useState<'enrollments' | 'full'>('enrollments');
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleExecuteReset = () => {
    if (!confirmed) return;

    if (resetType === 'enrollments') {
      resetEnrollmentsOnly();
    } else {
      fullStudyReset();
    }

    setConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-rose-400 font-bold text-base">
            <ShieldAlert className="w-5 h-5" />
            <span>Confirm Study Data Reset</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <p className="text-xs text-slate-300">
            This action will modify trial data. Currently, <strong className="text-emerald-400">{totalEnrolled} participants</strong> have been enrolled.
          </p>

          {/* Reset Options */}
          <div className="space-y-2">
            <label className={`block p-3 rounded-xl border text-xs cursor-pointer transition-all ${
              resetType === 'enrollments'
                ? 'bg-amber-950/30 border-amber-500/60 text-slate-200'
                : 'bg-slate-950/40 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-start gap-2.5">
                <input
                  type="radio"
                  name="reset-option"
                  checked={resetType === 'enrollments'}
                  onChange={() => setResetType('enrollments')}
                  className="mt-0.5 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <strong className="block text-slate-200">Reset Participant Enrollments Only</strong>
                  <span className="text-slate-400 text-[11px]">
                    Clears patient codes and timestamps, setting all 32 slots back to "Pending". Keeps the current randomized sequence.
                  </span>
                </div>
              </div>
            </label>

            <label className={`block p-3 rounded-xl border text-xs cursor-pointer transition-all ${
              resetType === 'full'
                ? 'bg-rose-950/30 border-rose-500/60 text-slate-200'
                : 'bg-slate-950/40 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-start gap-2.5">
                <input
                  type="radio"
                  name="reset-option"
                  checked={resetType === 'full'}
                  onChange={() => setResetType('full')}
                  className="mt-0.5 text-rose-500 focus:ring-rose-500"
                />
                <div>
                  <strong className="block text-rose-300">Full Study Re-randomization</strong>
                  <span className="text-slate-400 text-[11px]">
                    Discards the entire allocation matrix and regenerates a brand new permuted sequence of 32 slots.
                  </span>
                </div>
              </div>
            </label>
          </div>

          {/* Explicit Confirmation Checkbox */}
          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
              />
              <span>I understand that this action is irreversible.</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleExecuteReset}
            disabled={!confirmed}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              confirmed
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            Execute Reset
          </button>
        </div>
      </div>
    </div>
  );
};
