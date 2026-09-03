// Vercel Serverless Function for /api/study/reset (Supports Vercel Blob & Vercel KV)
import { getStorageMode, getCloudStudyData, saveCloudStudyData } from '../_db.js';

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
    const mode = getStorageMode();
    if (mode === 'none') {
      return res.status(503).json({
        success: false,
        error: 'DATABASE_NOT_CONNECTED',
        message: 'Cannot reset: Central database is not connected in Vercel. Please connect Vercel Blob in your Vercel Dashboard Storage settings.',
      });
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { resetType } = payload;

    let current = await getCloudStudyData();
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
        await saveCloudStudyData(updated);
        return res.status(200).json({ success: true, data: updated, source: mode });
      }
    }

    return res.status(200).json({ success: true, message: 'Reset completed' });
  } catch (err) {
    console.error('API /reset error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
