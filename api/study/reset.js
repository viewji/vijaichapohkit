// Vercel Serverless Function for /api/study/reset

function getKvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function kvGet(key) {
  const kv = getKvConfig();
  if (!kv) return null;
  const res = await fetch(`${kv.url}/get/${key}`, {
    headers: { Authorization: `Bearer ${kv.token}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (json && json.result) {
    return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
  }
  return null;
}

async function kvSet(key, value) {
  const kv = getKvConfig();
  if (!kv) return false;
  const res = await fetch(`${kv.url}/set/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kv.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
  });
  return res.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { resetType } = payload;
    const kv = getKvConfig();

    if (kv) {
      const current = await kvGet('rct_study_data');
      if (current) {
        if (resetType === 'enrollments') {
          const resetSlots = current.slots.map(s => ({
            ...s,
            status: 'Pending',
            participantCode: undefined,
            notes: undefined,
            enrolledAt: undefined,
          }));
          const updated = { ...current, slots: resetSlots };
          await kvSet('rct_study_data', updated);
          return res.status(200).json({ success: true, data: updated });
        }
      }
    }

    return res.status(200).json({ success: true, mode: 'client_local' });
  } catch (err) {
    console.error('API /reset error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
