import { AllocationSlot, EnrollmentPayload, StudyScheme } from '../types';

const API_BASE = '/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  slot?: AllocationSlot;
  error?: string;
}

export async function fetchStudyFromServer(): Promise<ApiResponse<StudyScheme>> {
  try {
    const res = await fetch(`${API_BASE}/study`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

export async function enrollSubjectOnServer(
  payload: EnrollmentPayload
): Promise<ApiResponse<StudyScheme>> {
  try {
    const res = await fetch(`${API_BASE}/study/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || `Server responded with ${res.status}` };
    }
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during enrollment' };
  }
}

export async function saveSchemeOnServer(scheme: StudyScheme): Promise<ApiResponse<StudyScheme>> {
  try {
    const res = await fetch(`${API_BASE}/study/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheme),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error saving scheme' };
  }
}

export async function resetStudyOnServer(
  resetType: 'enrollments' | 'full',
  seed?: string
): Promise<ApiResponse<StudyScheme>> {
  try {
    const res = await fetch(`${API_BASE}/study/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetType, seed }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during reset' };
  }
}
