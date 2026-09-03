import React, { useState, useMemo } from 'react';
import { 
  Table, 
  Eye, 
  EyeOff, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  Bike, 
  Footprints, 
  Lock, 
  HelpCircle,
  AlertTriangle 
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { Arm, EnrollmentStatus, StratumSex } from '../types';

export const MasterAllocationTable: React.FC = () => {
  const { scheme, isMasked, setIsMasked } = useStudy();

  const [searchQuery, setSearchQuery] = useState('');
  const [stratumFilter, setStratumFilter] = useState<'All' | StratumSex>('All');
  const [armFilter, setArmFilter] = useState<'All' | Arm>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | EnrollmentStatus>('All');

  // Filter slots based on user criteria
  const filteredSlots = useMemo(() => {
    return scheme.slots.filter((slot) => {
      // Stratum filter
      if (stratumFilter !== 'All' && slot.stratum !== stratumFilter) return false;

      // Arm filter
      if (armFilter !== 'All' && slot.arm !== armFilter) return false;

      // Status filter
      if (statusFilter !== 'All' && slot.status !== statusFilter) return false;

      // Text query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const idMatch = slot.id.toLowerCase().includes(query);
        const codeMatch = slot.participantCode?.toLowerCase().includes(query);
        const notesMatch = slot.notes?.toLowerCase().includes(query);
        return idMatch || codeMatch || notesMatch;
      }

      return true;
    });
  }, [scheme.slots, stratumFilter, armFilter, statusFilter, searchQuery]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Table className="w-5 h-5 text-emerald-400" />
              <span>Allocation Audit & Master Scheme Table</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive trial registry tracking all 32 stratified allocation slots across blocks
            </p>
          </div>

          {/* Mask / Unmask Toggle */}
          <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl">
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-200 block">
                {isMasked ? 'Allocation Concealed' : 'Allocations Unmasked'}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {isMasked ? 'Future slots hidden to prevent bias' : 'Audit mode active (all slots visible)'}
              </span>
            </div>

            <button
              onClick={() => setIsMasked(!isMasked)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                !isMasked ? 'bg-amber-600' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={!isMasked}
              title={isMasked ? 'Click to unmask all allocations for audit' : 'Click to mask future allocations'}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  !isMasked ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Warning if unmasked */}
        {!isMasked && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/30 text-amber-300 text-xs animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Investigator Notice:</strong> Allocation unmasking is active. Ensure clinical staff enrolling patients do not see future slots to preserve clinical equipoise and prevent selection bias.
            </span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID or Ref..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
          </div>

          {/* Stratum Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <span className="text-[11px] text-slate-400 font-medium">Sex:</span>
            <select
              value={stratumFilter}
              onChange={(e) => setStratumFilter(e.target.value as 'All' | StratumSex)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Sexes</option>
              <option value="Male" className="bg-slate-900">Male (n=16)</option>
              <option value="Female" className="bg-slate-900">Female (n=16)</option>
            </select>
          </div>

          {/* Arm Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <span className="text-[11px] text-slate-400 font-medium">Arm:</span>
            <select
              value={armFilter}
              onChange={(e) => setArmFilter(e.target.value as 'All' | Arm)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Arms</option>
              <option value="Walking Bike" className="bg-slate-900">Walking Bike (16)</option>
              <option value="Control" className="bg-slate-900">Control (16)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <span className="text-[11px] text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | EnrollmentStatus)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Statuses</option>
              <option value="Enrolled" className="bg-slate-900">Enrolled</option>
              <option value="Pending" className="bg-slate-900">Pending Queue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Subject ID</th>
              <th className="py-3 px-4">Stratum (Sex)</th>
              <th className="py-3 px-4">Block Position</th>
              <th className="py-3 px-4">Assigned Intervention</th>
              <th className="py-3 px-4">Enrollment Status</th>
              <th className="py-3 px-4">Participant Ref</th>
              <th className="py-3 px-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredSlots.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  No allocation slots match the active filters.
                </td>
              </tr>
            ) : (
              filteredSlots.map((slot) => {
                const isEnrolled = slot.status === 'Enrolled';
                const showArm = isEnrolled || !isMasked;
                const isWB = slot.arm === 'Walking Bike';

                return (
                  <tr 
                    key={slot.id} 
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isEnrolled ? 'bg-slate-900/40' : ''
                    }`}
                  >
                    {/* Subject ID */}
                    <td className="py-3 px-4 font-bold text-slate-100">
                      {slot.id}
                    </td>

                    {/* Stratum */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        slot.stratum === 'Male'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {slot.stratum === 'Male' ? '♂ Male' : '♀ Female'}
                      </span>
                    </td>

                    {/* Block Position */}
                    <td className="py-3 px-4 text-slate-400 font-sans">
                      <span className="inline-flex items-center gap-1 font-mono text-slate-300">
                        Block {slot.blockNumber} <span className="text-slate-600">|</span> Pos {slot.blockPosition}/4
                      </span>
                    </td>

                    {/* Assigned Arm */}
                    <td className="py-3 px-4">
                      {showArm ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-sans ${
                          isWB
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                        }`}>
                          {isWB ? <Bike className="w-3.5 h-3.5" /> : <Footprints className="w-3.5 h-3.5" />}
                          <span>{slot.arm}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium font-sans bg-slate-800/80 text-slate-400 border border-slate-700/60">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>Concealed</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {isEnrolled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-sans font-medium text-xs">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Enrolled</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-sans text-xs">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending Queue</span>
                        </span>
                      )}
                    </td>

                    {/* Participant Code */}
                    <td className="py-3 px-4 text-slate-300">
                      {slot.participantCode ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          {slot.participantCode}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-sans text-[11px]">—</span>
                      )}
                    </td>

                    {/* Enrolled Timestamp */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {slot.enrolledAt ? (
                        new Date(slot.enrolledAt).toLocaleString([], { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })
                      ) : (
                        <span className="text-slate-600 font-sans">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <span>Showing {filteredSlots.length} of 32 total slots</span>
        <span className="text-slate-500 text-[11px]">
          Stratified 1:1 permuted block design • Fixed block size k=4
        </span>
      </div>
    </div>
  );
};
