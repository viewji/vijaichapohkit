import React, { useState } from 'react';
import { UserPlus, UserCheck, ShieldAlert, Sparkles, Check, AlertCircle, Clock } from 'lucide-react';
import { StratumSex } from '../types';
import { useStudy } from '../context/StudyContext';

export const EnrollmentDesk: React.FC = () => {
  const { maleStats, femaleStats, enrollSubject } = useStudy();

  const [selectedStratum, setSelectedStratum] = useState<StratumSex>('Male');
  const [participantCode, setParticipantCode] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStats = selectedStratum === 'Male' ? maleStats : femaleStats;
  const isQuotaFull = currentStats.remainingSlots <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);

    if (isQuotaFull) {
      setErrorMsg(`Cannot enroll: ${selectedStratum} quota of 16 participants is fully reached.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await enrollSubject({
        stratum: selectedStratum,
        participantCode: participantCode.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        // Clear form inputs
        setParticipantCode('');
        setNotes('');
      } else {
        setErrorMsg(res.error || 'Failed to randomize subject.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Clinical Enrolment Desk (Concealed Allocation)
            </h2>
            <p className="text-xs text-slate-400">
              Sequential real-time randomization adhering to ICH-GCP concealment standards
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Next slot masked until assignment</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Stratum Selection (Sex) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Step 1: Select Stratum (Sex) *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Male Selector Card */}
            <button
              type="button"
              onClick={() => {
                setSelectedStratum('Male');
                setErrorMsg(null);
              }}
              className={`relative text-left p-3.5 rounded-xl border transition-all ${
                selectedStratum === 'Male'
                  ? 'bg-blue-950/40 border-blue-500/80 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/40'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                    ♂
                  </span>
                  Male
                </span>
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                  maleStats.remainingSlots > 0 ? 'bg-slate-800 text-slate-300' : 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                }`}>
                  {maleStats.remainingSlots > 0 ? `${maleStats.remainingSlots} left` : 'FULL'}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                Enrolled: <strong className="text-slate-200">{maleStats.enrolledTotal}/16</strong> (WB: {maleStats.walkingBikeCount}, Ctrl: {maleStats.controlCount})
              </div>
            </button>

            {/* Female Selector Card */}
            <button
              type="button"
              onClick={() => {
                setSelectedStratum('Female');
                setErrorMsg(null);
              }}
              className={`relative text-left p-3.5 rounded-xl border transition-all ${
                selectedStratum === 'Female'
                  ? 'bg-rose-950/40 border-rose-500/80 shadow-md shadow-rose-500/10 ring-1 ring-rose-500/40'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs">
                    ♀
                  </span>
                  Female
                </span>
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                  femaleStats.remainingSlots > 0 ? 'bg-slate-800 text-slate-300' : 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                }`}>
                  {femaleStats.remainingSlots > 0 ? `${femaleStats.remainingSlots} left` : 'FULL'}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                Enrolled: <strong className="text-slate-200">{femaleStats.enrolledTotal}/16</strong> (WB: {femaleStats.walkingBikeCount}, Ctrl: {femaleStats.controlCount})
              </div>
            </button>
          </div>
        </div>

        {/* Participant Code & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="participant-code" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Step 2: Subject Ref / Hospital ID <span className="text-slate-500 font-normal lowercase">(optional)</span>
            </label>
            <input
              id="participant-code"
              type="text"
              value={participantCode}
              onChange={(e) => setParticipantCode(e.target.value)}
              placeholder="e.g. SUBJ-019 or HN-84920"
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all font-mono"
            />
          </div>

          <div>
            <label htmlFor="enrollment-notes" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Step 3: Clinical Notes <span className="text-slate-500 font-normal lowercase">(optional)</span>
            </label>
            <input
              id="enrollment-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Consent verified, Clinic Room B"
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={isQuotaFull || isSubmitting}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              isQuotaFull || isSubmitting
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 hover:shadow-emerald-900/50 active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <span>Assigning & Persisting to Server...</span>
            ) : isQuotaFull ? (
              <>
                <UserCheck className="w-4 h-4" />
                <span>{selectedStratum} Stratum Quota Full (16/16)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
                <span>Assign Intervention & Reveal Allocation ({selectedStratum})</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-center text-slate-500 mt-2 flex items-center justify-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Assignment is logged with a secure timestamp and locked in permanent audit log</span>
          </p>
        </div>
      </form>
    </div>
  );
};
