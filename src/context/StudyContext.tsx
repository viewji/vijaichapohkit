import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { AllocationSlot, EnrollmentPayload, StratumStats, StudyScheme, SyncStatus, ValidationSummary } from '../types';
import { generateRandomizationScheme, validateSchemeIntegrity, STUDY_PARAMS } from '../lib/randomization';
import { fetchStudyFromServer, enrollSubjectOnServer, saveSchemeOnServer, resetStudyOnServer } from '../lib/api';

const STORAGE_KEY = 'RCT_STRATIFIED_RANDOMIZATION_DATA_V1';
const MASKING_STORAGE_KEY = 'RCT_ALLOCATION_MASKING_PREF_V1';

interface StudyContextType {
  scheme: StudyScheme;
  validation: ValidationSummary;
  isMasked: boolean;
  setIsMasked: (val: boolean | ((prev: boolean) => boolean)) => void;
  enrolledModalSlot: AllocationSlot | null;
  setEnrolledModalSlot: (slot: AllocationSlot | null) => void;
  enrollSubject: (payload: EnrollmentPayload) => Promise<{ success: boolean; slot?: AllocationSlot; error?: string }>;
  generateNewScheme: (seed?: string) => Promise<void>;
  resetEnrollmentsOnly: () => Promise<void>;
  fullStudyReset: (seed?: string) => Promise<void>;
  maleStats: StratumStats;
  femaleStats: StratumStats;
  totalEnrolled: number;
  syncStatus: SyncStatus;
  refreshFromServer: () => Promise<void>;
}

const StudyContext = createContext<StudyContextType | null>(null);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize scheme from localStorage as immediate cache while server request is in flight
  const [scheme, setScheme] = useState<StudyScheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: StudyScheme = JSON.parse(saved);
        const val = validateSchemeIntegrity(parsed.slots);
        if (val.isValid) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse cached scheme from localStorage', e);
    }
    return generateRandomizationScheme();
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');

  // Allocation concealment is ENABLED (masked) by default to eliminate investigator bias
  const [isMasked, setIsMasked] = useState<boolean>(() => {
    const saved = localStorage.getItem(MASKING_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const [enrolledModalSlot, setEnrolledModalSlot] = useState<AllocationSlot | null>(null);

  // Initial load from backend server
  const refreshFromServer = useCallback(async () => {
    setSyncStatus('syncing');
    const res = await fetchStudyFromServer();
    if (res.success && res.data) {
      const val = validateSchemeIntegrity(res.data.slots);
      if (val.isValid) {
        setScheme(res.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
        setSyncStatus('synced');
        return;
      }
    }
    // If server is not reachable or returned error, fall back to local cached copy
    setSyncStatus(res.error?.includes('Failed to fetch') || res.error?.includes('Network') ? 'offline' : 'error');
  }, []);

  useEffect(() => {
    refreshFromServer();
  }, [refreshFromServer]);

  // Persist masking preference
  useEffect(() => {
    try {
      localStorage.setItem(MASKING_STORAGE_KEY, String(isMasked));
    } catch (e) {
      console.error('Failed to save masking preference', e);
    }
  }, [isMasked]);

  // Automatic mathematical integrity validation
  const validation = useMemo(() => {
    return validateSchemeIntegrity(scheme.slots);
  }, [scheme.slots]);

  // Compute live stratum stats
  const maleStats = useMemo<StratumStats>(() => {
    const maleSlots = scheme.slots.filter((s) => s.stratum === 'Male');
    const enrolled = maleSlots.filter((s) => s.status === 'Enrolled');
    const wb = enrolled.filter((s) => s.arm === 'Walking Bike').length;
    const ctrl = enrolled.filter((s) => s.arm === 'Control').length;

    return {
      stratum: 'Male',
      totalQuota: STUDY_PARAMS.STRATA_QUOTA,
      enrolledTotal: enrolled.length,
      walkingBikeCount: wb,
      controlCount: ctrl,
      walkingBikeTarget: STUDY_PARAMS.TARGET_PER_STRATUM_ARM,
      controlTarget: STUDY_PARAMS.TARGET_PER_STRATUM_ARM,
      remainingSlots: STUDY_PARAMS.STRATA_QUOTA - enrolled.length,
    };
  }, [scheme.slots]);

  const femaleStats = useMemo<StratumStats>(() => {
    const femaleSlots = scheme.slots.filter((s) => s.stratum === 'Female');
    const enrolled = femaleSlots.filter((s) => s.status === 'Enrolled');
    const wb = enrolled.filter((s) => s.arm === 'Walking Bike').length;
    const ctrl = enrolled.filter((s) => s.arm === 'Control').length;

    return {
      stratum: 'Female',
      totalQuota: STUDY_PARAMS.STRATA_QUOTA,
      enrolledTotal: enrolled.length,
      walkingBikeCount: wb,
      controlCount: ctrl,
      walkingBikeTarget: STUDY_PARAMS.TARGET_PER_STRATUM_ARM,
      controlTarget: STUDY_PARAMS.TARGET_PER_STRATUM_ARM,
      remainingSlots: STUDY_PARAMS.STRATA_QUOTA - enrolled.length,
    };
  }, [scheme.slots]);

  const totalEnrolled = maleStats.enrolledTotal + femaleStats.enrolledTotal;

  // Server-authoritative enrollment
  const enrollSubject = async (payload: EnrollmentPayload) => {
    const currentStats = payload.stratum === 'Male' ? maleStats : femaleStats;
    if (currentStats.remainingSlots <= 0) {
      return {
        success: false,
        error: `Stratum quota reached! All ${STUDY_PARAMS.STRATA_QUOTA} participants for ${payload.stratum} have been enrolled.`,
      };
    }

    setSyncStatus('syncing');

    // Attempt server-authoritative enrollment first
    const res = await enrollSubjectOnServer(payload);
    if (res.success && res.slot && res.data) {
      setScheme(res.data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
      setEnrolledModalSlot(res.slot);
      setSyncStatus('synced');

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.65 },
          colors: res.slot.arm === 'Walking Bike' ? ['#10b981', '#34d399', '#6ee7b7'] : ['#6366f1', '#818cf8', '#a5b4fc'],
        });
      } catch {
        // ignore
      }

      return { success: true, slot: res.slot };
    }

    // Fallback: If server is offline, perform local assignment
    console.warn('Server enrollment failed or offline, performing local fallback:', res.error);
    const targetSlotIndex = scheme.slots.findIndex(
      (s) => s.stratum === payload.stratum && s.status === 'Pending'
    );

    if (targetSlotIndex === -1) {
      setSyncStatus('error');
      return {
        success: false,
        error: `No unassigned slots found for ${payload.stratum}.`,
      };
    }

    const targetSlot = scheme.slots[targetSlotIndex];
    const updatedSlot: AllocationSlot = {
      ...targetSlot,
      status: 'Enrolled',
      participantCode: payload.participantCode?.trim() || undefined,
      notes: payload.notes?.trim() || undefined,
      enrolledAt: new Date().toISOString(),
    };

    const newSlots = [...scheme.slots];
    newSlots[targetSlotIndex] = updatedSlot;
    const localScheme = { ...scheme, slots: newSlots };

    setScheme(localScheme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localScheme));
    setEnrolledModalSlot(updatedSlot);
    setSyncStatus('offline');

    // Try background sync to server
    saveSchemeOnServer(localScheme).then((r) => {
      if (r.success) setSyncStatus('synced');
    });

    return { success: true, slot: updatedSlot };
  };

  // Generate a completely new randomized scheme
  const generateNewScheme = async (seed?: string) => {
    setSyncStatus('syncing');
    const fresh = generateRandomizationScheme(seed);
    setScheme(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setEnrolledModalSlot(null);

    const res = await saveSchemeOnServer(fresh);
    if (res.success) {
      setSyncStatus('synced');
    } else {
      setSyncStatus('offline');
    }
  };

  // Reset enrollment status for all participants
  const resetEnrollmentsOnly = async () => {
    setSyncStatus('syncing');
    const res = await resetStudyOnServer('enrollments');
    if (res.success && res.data) {
      setScheme(res.data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
      setSyncStatus('synced');
    } else {
      // Local fallback
      const resetSlots = scheme.slots.map((s) => ({
        ...s,
        status: 'Pending' as const,
        participantCode: undefined,
        notes: undefined,
        enrolledAt: undefined,
      }));
      const updated = { ...scheme, slots: resetSlots };
      setScheme(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSyncStatus('offline');
    }
    setEnrolledModalSlot(null);
  };

  // Full reset
  const fullStudyReset = async (seed?: string) => {
    setSyncStatus('syncing');
    const res = await resetStudyOnServer('full', seed);
    if (res.success && res.data) {
      setScheme(res.data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
      setSyncStatus('synced');
    } else {
      await generateNewScheme(seed);
    }
  };

  return (
    <StudyContext.Provider
      value={{
        scheme,
        validation,
        isMasked,
        setIsMasked,
        enrolledModalSlot,
        setEnrolledModalSlot,
        enrollSubject,
        generateNewScheme,
        resetEnrollmentsOnly,
        fullStudyReset,
        maleStats,
        femaleStats,
        totalEnrolled,
        syncStatus,
        refreshFromServer,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
};

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return ctx;
}
