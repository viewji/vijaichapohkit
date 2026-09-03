import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { AllocationSlot, EnrollmentPayload, StratumSex, StratumStats, StudyScheme, ValidationSummary } from '../types';
import { generateRandomizationScheme, validateSchemeIntegrity, STUDY_PARAMS } from '../lib/randomization';

const STORAGE_KEY = 'RCT_STRATIFIED_RANDOMIZATION_DATA_V1';
const MASKING_STORAGE_KEY = 'RCT_ALLOCATION_MASKING_PREF_V1';

interface StudyContextType {
  scheme: StudyScheme;
  validation: ValidationSummary;
  isMasked: boolean;
  setIsMasked: (val: boolean | ((prev: boolean) => boolean)) => void;
  enrolledModalSlot: AllocationSlot | null;
  setEnrolledModalSlot: (slot: AllocationSlot | null) => void;
  enrollSubject: (payload: EnrollmentPayload) => { success: boolean; slot?: AllocationSlot; error?: string };
  generateNewScheme: (seed?: string) => void;
  resetEnrollmentsOnly: () => void;
  fullStudyReset: (seed?: string) => void;
  maleStats: StratumStats;
  femaleStats: StratumStats;
  totalEnrolled: number;
}

const StudyContext = createContext<StudyContextType | null>(null);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize scheme from localStorage or create fresh validated scheme
  const [scheme, setScheme] = useState<StudyScheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: StudyScheme = JSON.parse(saved);
        const val = validateSchemeIntegrity(parsed.slots);
        if (val.isValid) {
          return parsed;
        }
        console.warn('Saved scheme failed validation, regenerating fresh sequence:', val.errors);
      }
    } catch (e) {
      console.error('Failed to parse saved scheme from localStorage', e);
    }
    return generateRandomizationScheme();
  });

  // Allocation concealment is ENABLED (masked) by default to eliminate investigator bias
  const [isMasked, setIsMasked] = useState<boolean>(() => {
    const saved = localStorage.getItem(MASKING_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const [enrolledModalSlot, setEnrolledModalSlot] = useState<AllocationSlot | null>(null);

  // Persist scheme on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scheme));
    } catch (e) {
      console.error('Failed to save scheme to localStorage', e);
    }
  }, [scheme]);

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

  // Enroll next available subject in the selected stratum
  const enrollSubject = (payload: EnrollmentPayload) => {
    const currentStats = payload.stratum === 'Male' ? maleStats : femaleStats;
    if (currentStats.remainingSlots <= 0) {
      return {
        success: false,
        error: `Stratum quota reached! All ${STUDY_PARAMS.STRATA_QUOTA} participants for ${payload.stratum} have been enrolled.`,
      };
    }

    // Find the next pending slot in the given stratum
    const targetSlotIndex = scheme.slots.findIndex(
      (s) => s.stratum === payload.stratum && s.status === 'Pending'
    );

    if (targetSlotIndex === -1) {
      return {
        success: false,
        error: `No unassigned slots found for ${payload.stratum}.`,
      };
    }

    const targetSlot = scheme.slots[targetSlotIndex];
    const timestamp = new Date().toISOString();

    const updatedSlot: AllocationSlot = {
      ...targetSlot,
      status: 'Enrolled',
      participantCode: payload.participantCode?.trim() || undefined,
      notes: payload.notes?.trim() || undefined,
      enrolledAt: timestamp,
    };

    const newSlots = [...scheme.slots];
    newSlots[targetSlotIndex] = updatedSlot;

    setScheme((prev) => ({
      ...prev,
      slots: newSlots,
    }));

    // Trigger reveal modal
    setEnrolledModalSlot(updatedSlot);

    // Subtle clinical reveal celebration
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: updatedSlot.arm === 'Walking Bike' ? ['#10b981', '#34d399', '#6ee7b7'] : ['#6366f1', '#818cf8', '#a5b4fc'],
      });
    } catch {
      // ignore
    }

    return { success: true, slot: updatedSlot };
  };

  // Generate a completely new randomized scheme (e.g. with new seed)
  const generateNewScheme = (seed?: string) => {
    const fresh = generateRandomizationScheme(seed);
    setScheme(fresh);
    setEnrolledModalSlot(null);
  };

  // Keep the current sequence but reset enrollment status for all participants
  const resetEnrollmentsOnly = () => {
    const resetSlots = scheme.slots.map((s) => ({
      ...s,
      status: 'Pending' as const,
      participantCode: undefined,
      notes: undefined,
      enrolledAt: undefined,
    }));

    setScheme((prev) => ({
      ...prev,
      slots: resetSlots,
    }));
    setEnrolledModalSlot(null);
  };

  // Full reset (re-generates fresh sequence with optional seed)
  const fullStudyReset = (seed?: string) => {
    generateNewScheme(seed);
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
