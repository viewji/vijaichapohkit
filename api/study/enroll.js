// Vercel Serverless Function for /api/study/enroll (Strict Centralized Allocation)

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
    console.error('Cloud KV enrollment error:', e);
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
        message: 'Cannot enroll: Central database is not connected in Vercel. Please connect Vercel KV in your Vercel Dashboard Storage settings.',
      });
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { stratum, participantCode, notes } = payload;

    if (!stratum || (stratum !== 'Male' && stratum !== 'Female')) {
      return res.status(400).json({ success: false, error: 'Invalid stratum (Must be Male or Female)' });
    }

    const raw = await kvCommand(['GET', 'rct_study_data']);
    let studyData = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;

    if (!studyData || !Array.isArray(studyData.slots)) {
      return res.status(400).json({ success: false, error: 'Central study scheme not initialized in database' });
    }

    // Check stratum quota
    const enrolledCount = studyData.slots.filter(s => s.stratum === stratum && s.status === 'Enrolled').length;
    if (enrolledCount >= 16) {
      return res.status(400).json({ success: false, error: `Stratum ${stratum} quota full (16/16 participants enrolled)` });
    }

    // Find next unassigned slot
    const targetIndex = studyData.slots.findIndex(s => s.stratum === stratum && s.status === 'Pending');
    if (targetIndex === -1) {
      return res.status(400).json({ success: false, error: `No unassigned slot found for ${stratum}` });
    }

    const assignedSlot = {
      ...studyData.slots[targetIndex],
      status: 'Enrolled',
      participantCode: participantCode ? String(participantCode).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
      enrolledAt: new Date().toISOString(),
    };

    studyData.slots[targetIndex] = assignedSlot;

    // Atomically write back to cloud KV so all other users immediately see this slot enrolled
    await kvCommand(['SET', 'rct_study_data', JSON.stringify(studyData)]);

    return res.status(200).json({
      success: true,
      slot: assignedSlot,
      data: studyData,
      source: 'vercel_kv',
    });
  } catch (err) {
    console.error('API /enroll error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
