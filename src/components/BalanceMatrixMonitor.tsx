import React from 'react';
import { Users, Bike, Footprints, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { useStudy } from '../context/StudyContext';

export const BalanceMatrixMonitor: React.FC = () => {
  const { maleStats, femaleStats, totalEnrolled } = useStudy();

  const totalWB = maleStats.walkingBikeCount + femaleStats.walkingBikeCount;
  const totalControl = maleStats.controlCount + femaleStats.controlCount;
  const overallPercent = Math.round((totalEnrolled / 32) * 100);

  return (
    <section aria-labelledby="balance-monitor-heading" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 id="balance-monitor-heading" className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span>Live Progress & Balance Monitor (2×2 Matrix)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time enrollment tracking and balance verification across stratified arms
          </p>
        </div>

        {/* Global Progress Pill */}
        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2">
          <div className="text-right">
            <span className="text-xs text-slate-400">Total Enrolled:</span>
            <div className="text-sm font-bold text-slate-200">
              <span className="text-emerald-400 font-mono text-base">{totalEnrolled}</span>
              <span className="text-slate-500 font-mono"> / 32 subjects</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-slate-700 relative flex items-center justify-center bg-slate-950 font-mono text-xs font-bold text-slate-200">
            {overallPercent}%
          </div>
        </div>
      </div>

      {/* Grid: Male Stratum, Female Stratum, and Overall Study Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Male Stratum Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  ♂
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Male Stratum</h3>
                  <span className="text-xs text-slate-400 font-mono">Target: 16 subjects</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/50">
                  {maleStats.enrolledTotal} / 16
                </span>
                {maleStats.remainingSlots === 0 && (
                  <span className="block text-[10px] text-emerald-400 font-medium mt-0.5">Quota Filled</span>
                )}
              </div>
            </div>

            {/* Sub-arms breakdown */}
            <div className="space-y-3">
              {/* Walking Bike */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                    <Bike className="w-4 h-4 text-emerald-400" />
                    Walking Bike
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    <span className="text-emerald-400">{maleStats.walkingBikeCount}</span> / 8
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${(maleStats.walkingBikeCount / 8) * 100}%` }}
                  />
                </div>
              </div>

              {/* Control / Conventional Walk */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
                    <Footprints className="w-4 h-4 text-indigo-400" />
                    Control (Conventional)
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    <span className="text-indigo-400">{maleStats.controlCount}</span> / 8
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
                    style={{ width: `${(maleStats.controlCount / 8) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Remaining slots:</span>
            <span className={maleStats.remainingSlots > 0 ? 'text-slate-200 font-bold' : 'text-slate-500'}>
              {maleStats.remainingSlots} slots
            </span>
          </div>
        </div>

        {/* Female Stratum Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-28 h-28 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  ♀
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Female Stratum</h3>
                  <span className="text-xs text-slate-400 font-mono">Target: 16 subjects</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50">
                  {femaleStats.enrolledTotal} / 16
                </span>
                {femaleStats.remainingSlots === 0 && (
                  <span className="block text-[10px] text-emerald-400 font-medium mt-0.5">Quota Filled</span>
                )}
              </div>
            </div>

            {/* Sub-arms breakdown */}
            <div className="space-y-3">
              {/* Walking Bike */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                    <Bike className="w-4 h-4 text-emerald-400" />
                    Walking Bike
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    <span className="text-emerald-400">{femaleStats.walkingBikeCount}</span> / 8
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${(femaleStats.walkingBikeCount / 8) * 100}%` }}
                  />
                </div>
              </div>

              {/* Control / Conventional Walk */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
                    <Footprints className="w-4 h-4 text-indigo-400" />
                    Control (Conventional)
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    <span className="text-indigo-400">{femaleStats.controlCount}</span> / 8
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
                    style={{ width: `${(femaleStats.controlCount / 8) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Remaining slots:</span>
            <span className={femaleStats.remainingSlots > 0 ? 'text-slate-200 font-bold' : 'text-slate-500'}>
              {femaleStats.remainingSlots} slots
            </span>
          </div>
        </div>

        {/* Global Arm Balance Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Trial Arm Balance</h3>
                  <span className="text-xs text-slate-400 font-mono">Target: 16 WB vs 16 Control</span>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                1:1 Target
              </span>
            </div>

            <div className="space-y-3">
              {/* Total Walking Bike */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">Total Walking Bike</span>
                  <span className="font-mono font-bold text-emerald-400">{totalWB} / 16</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${(totalWB / 16) * 100}%` }}
                  />
                </div>
              </div>

              {/* Total Control */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">Total Control</span>
                  <span className="font-mono font-bold text-indigo-400">{totalControl} / 16</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                    style={{ width: `${(totalControl / 16) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs">
            <span className="text-slate-400">Arm Equivalence Delta:</span>
            <span className="font-mono font-bold text-slate-200">
              {Math.abs(totalWB - totalControl)} subject(s)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
