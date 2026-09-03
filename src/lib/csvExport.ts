import { AllocationSlot } from '../types';

/**
 * Cleanly format and escape CSV fields
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  const stringVal = String(val);
  if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return stringVal;
}

/**
 * Export complete study allocation sequence to CSV
 */
export function exportAllocationsToCsv(
  slots: AllocationSlot[],
  schemeMeta: { schemeId: string; seed?: string; createdAt: string }
): void {
  const headers = [
    'Subject_ID',
    'Stratum_Sex',
    'Block_Number',
    'Position_In_Block',
    'Assigned_Arm',
    'Enrollment_Status',
    'Participant_Reference',
    'Enrolled_At_Timestamp',
    'Clinical_Notes',
  ];

  const rows = slots.map((slot) => [
    escapeCsvValue(slot.id),
    escapeCsvValue(slot.stratum),
    escapeCsvValue(slot.blockNumber),
    escapeCsvValue(slot.blockPosition),
    escapeCsvValue(slot.arm),
    escapeCsvValue(slot.status),
    escapeCsvValue(slot.participantCode || ''),
    escapeCsvValue(slot.enrolledAt ? new Date(slot.enrolledAt).toLocaleString() : ''),
    escapeCsvValue(slot.notes || ''),
  ]);

  // Add metadata comments at the top of the file
  const metadataLines = [
    `# Randomized Controlled Trial (RCT) Stratified Block Allocation Record`,
    `# Scheme ID: ${schemeMeta.schemeId}`,
    `# Random Seed: ${schemeMeta.seed || 'Cryptographic Non-deterministic'}`,
    `# Generated At: ${schemeMeta.createdAt}`,
    `# Exported At: ${new Date().toISOString()}`,
    `# Total Sample N=32 (Male: 16, Female: 16 | 1:1 Walking Bike vs Control)`,
    '',
  ];

  const csvContent = [
    ...metadataLines,
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `RCT_Allocation_Matrix_N32_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
