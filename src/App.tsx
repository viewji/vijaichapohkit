import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BalanceMatrixMonitor } from './components/BalanceMatrixMonitor';
import { EnrollmentDesk } from './components/EnrollmentDesk';
import { MasterAllocationTable } from './components/MasterAllocationTable';
import { AllocationModal } from './components/AllocationModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { SchemeConfigModal } from './components/SchemeConfigModal';
import { CloudDbModal } from './components/CloudDbModal';
import { AuthGate, AUTH_STORAGE_KEY } from './components/AuthGate';
import { FileText, CheckCircle2 } from 'lucide-react';
import { useStudy } from './context/StudyContext';

export const AppContent: React.FC = () => {
  const { totalEnrolled } = useStudy();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_STORAGE_KEY) === 'authenticated';
  });

  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isCloudDbModalOpen, setIsCloudDbModalOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  // If not authenticated, present the clinical gatekeeper screen
  if (!isAuthenticated) {
    return <AuthGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Sticky Top Header */}
      <Header
        onOpenSeedModal={() => setIsSeedModalOpen(true)}
        onOpenResetModal={() => setIsResetModalOpen(true)}
        onOpenCloudDbModal={() => setIsCloudDbModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Live Balance Monitor (2x2 Matrix) */}
        <BalanceMatrixMonitor />

        {/* Clinical Workspace: Enrolment Desk & Protocol Specification */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Enrolment Desk (Takes 2 Columns on Desktop) */}
          <div className="lg:col-span-2">
            <EnrollmentDesk />
          </div>

          {/* Clinical Protocol & Quality Card (Takes 1 Column) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Study Protocol Specs</h3>
                <span className="text-[11px] text-slate-400">Randomization Parameters</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Design</span>
                <span className="font-semibold text-slate-200">Parallel 2-Arm RCT</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Allocation Ratio</span>
                <span className="font-semibold text-emerald-400">1:1 Equal Ratio</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Stratification Factor</span>
                <span className="font-semibold text-slate-200">Biological Sex (M/F)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Block Structure</span>
                <span className="font-semibold text-slate-200">Fixed k = 4 (2 WB : 2 Ctrl)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Per-Stratum Blocks</span>
                <span className="font-semibold text-slate-200">4 blocks (16 subjects/stratum)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Enrolled</span>
                <span className="font-mono font-bold text-slate-100">{totalEnrolled} / 32</span>
              </div>
            </div>

            {/* Quality Compliance Checklist */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                ICH-GCP Compliance Checklist
              </span>
              <ul className="space-y-1.5 text-[11px] text-slate-400">
                <li className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Centralized concealed allocation</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Deterministic block balance assertion</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Timestamped irreversible audit trail</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Master Allocation Table */}
        <MasterAllocationTable />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <p>
          Clinical Trial Software Engine • Stratified Permuted Block Randomization (N=32) • Built to CONSORT & ICH-GCP E9 Guidelines
        </p>
      </footer>

      {/* Modals */}
      <AllocationModal />
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      />
      <SchemeConfigModal
        isOpen={isSeedModalOpen}
        onClose={() => setIsSeedModalOpen(false)}
      />
      <CloudDbModal
        isOpen={isCloudDbModalOpen}
        onClose={() => setIsCloudDbModalOpen(false)}
      />
    </div>
  );
};

export default AppContent;
