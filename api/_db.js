// Unified Cloud Storage Adapter for Vercel (Supports both Blob & KV/Upstash)
import { put, list } from '@vercel/blob';

const BLOB_FILENAME = 'rct_study_data.json';

// Detect whether Vercel Blob or Vercel KV is configured
export function getStorageMode() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return 'blob';
  }

  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return 'kv';
  }
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return 'kv';
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith('_REST_API_URL') && value) {
      const prefix = key.replace(/_REST_API_URL$/, '');
      if (process.env[`${prefix}_REST_API_TOKEN`]) {
        return 'kv';
      }
    }
  }

  return 'none';
}

function getKvConfig() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  }
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith('_REST_API_URL') && value) {
      const prefix = key.replace(/_REST_API_URL$/, '');
      const token = process.env[`${prefix}_REST_API_TOKEN`];
      if (token) return { url: value, token };
    }
  }

  return null;
}

async function kvCommand(args) {
  const kv = getKvConfig();
  if (!kv) return null;
  try {
    const res = await fetch(`${kv.url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kv.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json ? json.result : null;
  } catch (e) {
    console.error('KV request error:', e);
    return null;
  }
}

// Read authoritative study data from Cloud (Blob or KV)
export async function getCloudStudyData() {
  const mode = getStorageMode();

  if (mode === 'blob') {
    try {
      const { blobs } = await list({ prefix: BLOB_FILENAME });
      if (blobs.length > 0) {
        // Fetch newest blob
        const res = await fetch(blobs[0].url, { cache: 'no-store' });
        if (res.ok) {
          return await res.json();
        }
      }
      return null;
    } catch (e) {
      console.error('Error reading from Vercel Blob:', e);
      return null;
    }
  }

  if (mode === 'kv') {
    const raw = await kvCommand(['GET', 'rct_study_data']);
    if (raw) {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    }
    return null;
  }

  return null;
}

// Save authoritative study data to Cloud (Blob or KV)
export async function saveCloudStudyData(studyData) {
  const mode = getStorageMode();

  if (mode === 'blob') {
    try {
      const blob = await put(BLOB_FILENAME, JSON.stringify(studyData), {
        access: 'public',
        addRandomSuffix: false,
      });
      return !!blob;
    } catch (e) {
      console.error('Error writing to Vercel Blob:', e);
      return false;
    }
  }

  if (mode === 'kv') {
    const res = await kvCommand(['SET', 'rct_study_data', JSON.stringify(studyData)]);
    return !!res;
  }

  return false;
}
