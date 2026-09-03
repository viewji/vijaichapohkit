// Vercel Serverless Function for /api/study/reset (Centralized Multi-User Reset)

function getKvConfig() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN, name: 'KV_REST_API' };
  }
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN, name: 'UPSTASH_REDIS' };
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith('_REST_API_URL') && value) {
      const prefix = key.replace(/_REST_API_URL$/, '');
      const token = process.env[`${prefix}_REST_API_TOKEN`];
      if (token) {
        return { url: value, token, name: prefix };
      }
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
    console.error('Cloud KV reset error:', e);
    return null;
  }
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
    const kv = getKvConfig();
    if (!kv) {
      return res.status(503).json({
        success: false,
        error: 'DATABASE_NOT_CONNECTED',
        message: 'Cannot reset: Central database is not connected in Vercel.',
      });
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { resetType } = payload;

    const raw = await kvCommand(['GET', 'rct_study_data']);
    let current = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;

    if (current && Array.isArray(current.slots)) {
      if (resetType === 'enrollments') {
        const resetSlots = current.slots.map(s => ({
          ...s,
          status: 'Pending',
          participantCode: undefined,
          notes: undefined,
          enrolledAt: undefined,
        }));
        const updated = { ...current, slots: resetSlots };
        await kvCommand(['SET', 'rct_study_data', JSON.stringify(updated)]);
        return res.status(200).json({ success: true, data: updated, source: 'vercel_kv' });
      }
    }

    return res.status(200).json({ success: true, message: 'Reset completed' });
  } catch (err) {
    console.error('API /reset error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
