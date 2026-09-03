import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { AllocationSlot, EnrollmentPayload, StratumStats, StudyScheme, SyncStatus, ValidationSummary } from '../types';
import { generateRandomizationScheme, validateSchemeIntegrity, STUDY_PARAMS } from '../lib/randomization';
import { fetchStudyFromServer, enrollSubjectOnServer, saveSchemeOnServer, resetStudyOnServer } from '../lib/api';

const STORAGE_KEY = 'RCT_CENTRAL_STUDY_CACHE_V2';
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
  cloudDbName?: string;
  dbDiagnostic?: { error?: string; message?: string; detectedKeys?: string[] };
}

const StudyContext = createContext<StudyContextType | null>(null);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read-only cache while central server responds
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
      console.error('Failed to parse cache', e);
    }
    return generateRandomizationScheme();
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [cloudDbName, setCloudDbName] = useState<string | undefined>(undefined);
  const [dbDiagnostic, setDbDiagnostic] = useState<{ error?: string; message?: string; detectedKeys?: string[] } | undefined>(undefined);

  // Allocation concealment preference
  const [isMasked, setIsMasked] = useState<boolean>(() => {
    const saved = localStorage.getItem(MASKING_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const [enrolledModalSlot, setEnrolledModalSlot] = useState<AllocationSlot | null>(null);

  // Poll authoritative study state from central cloud database
  const refreshFromServer = useCallback(async () => {
    try {
      const res = await fetchStudyFromServer();
      if (res.success && res.data) {
        const val = validateSchemeIntegrity(res.data.slots);
        if (val.isValid) {
          setScheme(res.data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
          setSyncStatus('synced');
          setDbDiagnostic(undefined);
          if ((res as any).dbName) setCloudDbName((res as any).dbName);
          return;
        }
      }

      // If database is not connected on server, capture diagnostic keys
      setDbDiagnostic({
        error: res.error,
        message: (res as any).message,
        detectedKeys: (res as any).detectedKeys || [],
      });

      if (res.error === 'DATABASE_NOT_CONNECTED') {
        setSyncStatus('error');
        return;
      }

      if (res.isBackendUnavailable) {
        setSyncStatus('offline');
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
  }, []);

  // Initial fetch and automatic real-time multi-user polling every 4 seconds
  useEffect(() => {
    refreshFromServer();

    // Auto-poll so changes made by other researchers appear in real-time
    const interval = setInterval(() => {
      refreshFromServer();
    }, 4000);

    // Also refresh immediately when tab regains focus
    const onFocus = () => { refreshFromServer(); };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
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

  // Strict server-authoritative enrollment: Must be saved on central server for all users!
  const enrollSubject = async (payload: EnrollmentPayload) => {
    const currentStats = payload.stratum === 'Male' ? maleStats : femaleStats;
    if (currentStats.remainingSlots <= 0) {
      return {
        success: false,
        error: `Stratum quota reached! All ${STUDY_PARAMS.STRATA_QUOTA} participants for ${payload.stratum} have been enrolled.`,
      };
    }

    setSyncStatus('syncing');

    // Call central server to allocate slot for ALL users
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

    // If central database is offline or not connected, DO NOT invent local personal assignment!
    setSyncStatus('error');
    const errorMsg = res.error === 'DATABASE_NOT_CONNECTED'
      ? 'Central cloud database is not connected in Vercel. Please ensure Vercel KV / Redis is connected so all users sync together.'
      : (res.error || 'Failed to assign slot on central server.');

    return {
      success: false,
      error: errorMsg,
    };
  };

  // Centralized scheme generation
  const generateNewScheme = async (seed?: string) => {
    setSyncStatus('syncing');
    const fresh = generateRandomizationScheme(seed);
    const res = await saveSchemeOnServer(fresh);
    if (res.success && res.data) {
      setScheme(res.data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
    }
    setEnrolledModalSlot(null);
  };

  // Centralized reset of enrollments
  const resetEnrollmentsOnly = async () => {
    setSyncStatus('syncing');
    const res = await resetStudyOnServer('enrollments');
    if (res.success && res.data) {
      setScheme(res.data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
    }
    setEnrolledModalSlot(null);
  };

  // Centralized full reset
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
        cloudDbName,
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
