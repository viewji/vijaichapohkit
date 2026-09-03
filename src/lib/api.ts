import { AllocationSlot, EnrollmentPayload, StudyScheme } from '../types';

const API_BASE = '/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  slot?: AllocationSlot;
  error?: string;
  isBackendUnavailable?: boolean;
}

async function parseJsonResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (text.trim().startsWith('<') || res.status === 404) {
      throw new Error('BACKEND_UNAVAILABLE');
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('BACKEND_UNAVAILABLE');
    }
  }
  return await res.json();
}

export async function fetchStudyFromServer(): Promise<ApiResponse<StudyScheme>> {
  try {
    const res = await fetch(`${API_BASE}/study`, { cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, error: 'BACKEND_UNAVAILABLE', isBackendUnavailable: true };
      }
      throw new Error(`Server responded with ${res.status}`);
    }
    const json = await parseJsonResponse(res);
    return json;
  } catch (err: any) {
    const isUnavail = err.message === 'BACKEND_UNAVAILABLE' || err.message?.includes('Failed to fetch') || err.message?.includes('Network');
    return { success: false, error: err.message || 'Network error', isBackendUnavailable: isUnavail };
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
    if (res.status === 404) {
      return { success: false, error: 'BACKEND_UNAVAILABLE', isBackendUnavailable: true };
    }
    const json = await parseJsonResponse(res);
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || `Server responded with ${res.status}` };
    }
    return json;
  } catch (err: any) {
    const isUnavail = err.message === 'BACKEND_UNAVAILABLE' || err.message?.includes('Failed to fetch') || err.message?.includes('Network');
    return { success: false, error: err.message || 'Network error during enrollment', isBackendUnavailable: isUnavail };
  }
}

export async function saveSchemeOnServer(scheme: StudyScheme): Promise<ApiResponse<StudyScheme>> {
  try {
    const res = await fetch(`${API_BASE}/study/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheme),
    });
    if (res.status === 404) {
      return { success: false, error: 'BACKEND_UNAVAILABLE', isBackendUnavailable: true };
    }
    return await parseJsonResponse(res);
  } catch (err: any) {
    const isUnavail = err.message === 'BACKEND_UNAVAILABLE' || err.message?.includes('Failed to fetch') || err.message?.includes('Network');
    return { success: false, error: err.message || 'Network error saving scheme', isBackendUnavailable: isUnavail };
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
    if (res.status === 404) {
      return { success: false, error: 'BACKEND_UNAVAILABLE', isBackendUnavailable: true };
    }
    return await parseJsonResponse(res);
  } catch (err: any) {
    const isUnavail = err.message === 'BACKEND_UNAVAILABLE' || err.message?.includes('Failed to fetch') || err.message?.includes('Network');
    return { success: false, error: err.message || 'Network error during reset', isBackendUnavailable: isUnavail };
  }
}
