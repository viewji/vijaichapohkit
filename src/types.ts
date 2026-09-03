export type StratumSex = 'Male' | 'Female';

export type Arm = 'Walking Bike' | 'Control';

export type EnrollmentStatus = 'Pending' | 'Enrolled';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface AllocationSlot {
  id: string; // e.g. 'M01' - 'M16', 'F01' - 'F16'
  stratum: StratumSex;
  blockNumber: number; // 1 to 4
  blockPosition: number; // 1 to 4
  arm: Arm;
  status: EnrollmentStatus;
  participantCode?: string; // Clinician provided code or MRN reference
  enrolledAt?: string; // ISO timestamp
  notes?: string;
}

export interface StudyScheme {
  schemeId: string;
  seed?: string;
  createdAt: string;
  slots: AllocationSlot[];
}

export interface ValidationSummary {
  isValid: boolean;
  maleWB: number;
  maleControl: number;
  femaleWB: number;
  femaleControl: number;
  totalWB: number;
  totalControl: number;
  totalSlots: number;
  blocksBalanced: boolean;
  errors: string[];
}

export interface EnrollmentPayload {
  stratum: StratumSex;
  participantCode?: string;
  notes?: string;
}

export interface StratumStats {
  stratum: StratumSex;
  totalQuota: number;
  enrolledTotal: number;
  walkingBikeCount: number;
  controlCount: number;
  walkingBikeTarget: number;
  controlTarget: number;
  remainingSlots: number;
}
