// Vercel Serverless Function for /api/study/enroll

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
    const { stratum, participantCode, notes } = payload;
    const kv = getKvConfig();

    if (kv) {
      let studyData = await kvGet('rct_study_data');
      if (!studyData) {
        return res.status(400).json({ success: false, error: 'Study scheme not initialized' });
      }

      const enrolledCount = studyData.slots.filter(s => s.stratum === stratum && s.status === 'Enrolled').length;
      if (enrolledCount >= 16) {
        return res.status(400).json({ success: false, error: `Stratum ${stratum} quota full (16/16)` });
      }

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
      await kvSet('rct_study_data', studyData);

      return res.status(200).json({ success: true, slot: assignedSlot, data: studyData });
    }

    // If KV is not configured, inform client to use local assignment
    return res.status(200).json({
      success: true,
      mode: 'client_local',
      message: 'KV not configured. Client will perform local assignment.',
    });
  } catch (err) {
    console.error('API /enroll error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
