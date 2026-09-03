import React from 'react';
import { CheckCircle2, Bike, Footprints, Printer, X, ShieldCheck, Hash, Calendar, Layers } from 'lucide-react';
import { useStudy } from '../context/StudyContext';

export const AllocationModal: React.FC = () => {
  const { enrolledModalSlot, setEnrolledModalSlot } = useStudy();

  if (!enrolledModalSlot) return null;

  const isWalkingBike = enrolledModalSlot.arm === 'Walking Bike';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-allocation-title"
      >
        {/* Top Header Strip with Status Indicator */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${
          isWalkingBike 
            ? 'bg-emerald-950/70 border-emerald-500/30 text-emerald-300' 
            : 'bg-indigo-950/70 border-indigo-500/30 text-indigo-300'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm tracking-wide uppercase">
            <ShieldCheck className="w-5 h-5" />
            <span>Randomized Allocation Confirmed</span>
          </div>
          <button
            onClick={() => setEnrolledModalSlot(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable slip area */}
        <div id="print-slip-area" className="p-6 sm:p-8 space-y-6">
          {/* Subject ID & Stratum Pill */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Subject Trial ID
              </span>
              <span className="text-3xl font-extrabold font-mono text-slate-100">
                {enrolledModalSlot.id}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Stratum
              </span>
              <span className={`inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full ${
                enrolledModalSlot.stratum === 'Male'
                  ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}>
                {enrolledModalSlot.stratum === 'Male' ? '♂ Male' : '♀ Female'}
              </span>
            </div>
          </div>

          {/* Core Allocation Reveal Box */}
          <div className={`p-6 rounded-2xl border-2 text-center transition-all ${
            isWalkingBike
              ? 'bg-gradient-to-b from-emerald-950/80 to-slate-900 border-emerald-500 shadow-lg shadow-emerald-900/30'
              : 'bg-gradient-to-b from-indigo-950/80 to-slate-900 border-indigo-500 shadow-lg shadow-indigo-900/30'
          }`}>
            <div className="flex justify-center mb-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                isWalkingBike ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'
              }`}>
                {isWalkingBike ? <Bike className="w-9 h-9" /> : <Footprints className="w-9 h-9" />}
              </div>
            </div>

            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1">
              Assigned Intervention Arm
            </span>

            <div 
              id="modal-allocation-title"
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                isWalkingBike ? 'text-emerald-400' : 'text-indigo-400'
              }`}
            >
              {enrolledModalSlot.arm}
            </div>

            <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
              {isWalkingBike 
                ? 'Participant is assigned to the Walking Bike intervention protocol.'
                : 'Participant is assigned to the Conventional Walking control protocol.'}
            </p>
          </div>

          {/* Audit Details */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="space-y-1">
              <div className="text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Permuted Block</span>
              </div>
              <div className="font-mono font-bold text-slate-200">
                Block {enrolledModalSlot.blockNumber} (Slot {enrolledModalSlot.blockPosition}/4)
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Enrolled At</span>
              </div>
              <div className="font-mono text-slate-200">
                {enrolledModalSlot.enrolledAt ? new Date(enrolledModalSlot.enrolledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
              </div>
            </div>

            {enrolledModalSlot.participantCode && (
              <div className="col-span-2 pt-2 border-t border-slate-800/80 space-y-0.5">
                <span className="text-slate-400">Hospital / Subject Ref:</span>
                <span className="block font-mono font-bold text-slate-200">{enrolledModalSlot.participantCode}</span>
              </div>
            )}

            {enrolledModalSlot.notes && (
              <div className="col-span-2 pt-1 text-slate-400 italic">
                Notes: {enrolledModalSlot.notes}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Slip</span>
          </button>

          <button
            onClick={() => setEnrolledModalSlot(null)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all text-center"
          >
            Confirm & Done
          </button>
        </div>
      </div>
    </div>
  );
};
