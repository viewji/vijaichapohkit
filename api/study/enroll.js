// Vercel Serverless Function for /api/study/enroll (Supports Vercel Blob & Vercel KV)
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
        message: 'Cannot enroll: Central database is not connected in Vercel. Please connect Vercel Blob in your Vercel Dashboard Storage settings.',
      });
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { stratum, participantCode, notes } = payload;

    if (!stratum || (stratum !== 'Male' && stratum !== 'Female')) {
      return res.status(400).json({ success: false, error: 'Invalid stratum (Must be Male or Female)' });
    }

    let studyData = await getCloudStudyData();
    if (!studyData || !Array.isArray(studyData.slots)) {
      return res.status(400).json({ success: false, error: 'Central study scheme not initialized in cloud database' });
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

    // Atomically persist to cloud storage so all users immediately see it
    await saveCloudStudyData(studyData);

    return res.status(200).json({
      success: true,
      slot: assignedSlot,
      data: studyData,
      source: mode,
    });
  } catch (err) {
    console.error('API /enroll error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
