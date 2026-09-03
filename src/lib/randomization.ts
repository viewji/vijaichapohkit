import { AllocationSlot, Arm, StratumSex, StudyScheme, ValidationSummary } from '../types';

/**
 * Hash string to 32-bit integer seed for Mulberry32 PRNG
 */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277,
      h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

/**
 * Mulberry32 32-bit PRNG generator yielding floats in [0, 1)
 */
function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Get a random float [0, 1) either via seeded PRNG or Web Crypto API
 */
function createRng(seed?: string): () => number {
  if (seed && seed.trim().length > 0) {
    const seedInt = cyrb128(seed.trim())[0];
    return mulberry32(seedInt);
  }

  // Cryptographically secure random fallback
  return function() {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] / (0xffffffff + 1);
    }
    return Math.random();
  };
}

/**
 * Fisher-Yates shuffle on an array in-place using provided RNG
 */
function shuffle<T>(array: T[], rng: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Fixed trial constraints
 */
export const STUDY_PARAMS = {
  TOTAL_SAMPLE_SIZE: 32,
  STRATA_QUOTA: 16,
  BLOCK_SIZE: 4,
  BLOCKS_PER_STRATUM: 4, // 4 * 4 = 16
  ARMS_PER_BLOCK: {
    'Walking Bike': 2,
    'Control': 2,
  } as Record<Arm, number>,
  TARGET_PER_ARM: 16,
  TARGET_PER_STRATUM_ARM: 8,
};

/**
 * Generate a complete Stratified Permuted Block Randomization scheme
 * Total: 32 slots (16 Male: M01-M16, 16 Female: F01-F16)
 * Stratum: Male (4 blocks of 4), Female (4 blocks of 4)
 * Each block has exactly 2 Walking Bike and 2 Control
 */
export function generateRandomizationScheme(seed?: string): StudyScheme {
  const rng = createRng(seed);
  const slots: AllocationSlot[] = [];

  const strata: { sex: StratumSex; prefix: string }[] = [
    { sex: 'Male', prefix: 'M' },
    { sex: 'Female', prefix: 'F' },
  ];

  for (const stratum of strata) {
    let subjectSeq = 1;

    for (let blockNum = 1; blockNum <= STUDY_PARAMS.BLOCKS_PER_STRATUM; blockNum++) {
      // Create balanced block: 2 Walking Bike, 2 Control
      const blockTemplate: Arm[] = ['Walking Bike', 'Walking Bike', 'Control', 'Control'];
      
      // Permute block using Fisher-Yates
      const permutedBlock = shuffle(blockTemplate, rng);

      for (let pos = 1; pos <= STUDY_PARAMS.BLOCK_SIZE; pos++) {
        const id = `${stratum.prefix}${String(subjectSeq).padStart(2, '0')}`;
        slots.push({
          id,
          stratum: stratum.sex,
          blockNumber: blockNum,
          blockPosition: pos,
          arm: permutedBlock[pos - 1],
          status: 'Pending',
        });
        subjectSeq++;
      }
    }
  }

  const scheme: StudyScheme = {
    schemeId: `SCHEME-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    seed: seed ? seed.trim() : undefined,
    createdAt: new Date().toISOString(),
    slots,
  };

  // Run self-assertion to guarantee mathematical invariants
  const validation = validateSchemeIntegrity(scheme.slots);
  if (!validation.isValid) {
    throw new Error(`Randomization invariant violation: ${validation.errors.join('; ')}`);
  }

  return scheme;
}

/**
 * Assert strict mathematical balance and constraints
 */
export function validateSchemeIntegrity(slots: AllocationSlot[]): ValidationSummary {
  const errors: string[] = [];

  let maleWB = 0;
  let maleControl = 0;
  let femaleWB = 0;
  let femaleControl = 0;

  if (slots.length !== STUDY_PARAMS.TOTAL_SAMPLE_SIZE) {
    errors.push(`Expected exactly ${STUDY_PARAMS.TOTAL_SAMPLE_SIZE} slots, got ${slots.length}`);
  }

  // Validate Block-level balance (every block must have 2 WB, 2 Control)
  const blockMap = new Map<string, { wb: number; control: number; total: number }>();

  for (const slot of slots) {
    if (slot.stratum === 'Male') {
      if (slot.arm === 'Walking Bike') maleWB++;
      else maleControl++;
    } else if (slot.stratum === 'Female') {
      if (slot.arm === 'Walking Bike') femaleWB++;
      else femaleControl++;
    }

    const blockKey = `${slot.stratum}-Block-${slot.blockNumber}`;
    const current = blockMap.get(blockKey) || { wb: 0, control: 0, total: 0 };
    if (slot.arm === 'Walking Bike') current.wb++;
    if (slot.arm === 'Control') current.control++;
    current.total++;
    blockMap.set(blockKey, current);
  }

  let blocksBalanced = true;
  for (const [key, stats] of blockMap.entries()) {
    if (stats.total !== STUDY_PARAMS.BLOCK_SIZE) {
      blocksBalanced = false;
      errors.push(`${key} has ${stats.total} subjects, expected ${STUDY_PARAMS.BLOCK_SIZE}`);
    }
    if (stats.wb !== 2 || stats.control !== 2) {
      blocksBalanced = false;
      errors.push(`${key} is unbalanced (Walking Bike: ${stats.wb}, Control: ${stats.control})`);
    }
  }

  if (maleWB !== STUDY_PARAMS.TARGET_PER_STRATUM_ARM || maleControl !== STUDY_PARAMS.TARGET_PER_STRATUM_ARM) {
    errors.push(`Male Stratum imbalance: Walking Bike=${maleWB}/8, Control=${maleControl}/8`);
  }

  if (femaleWB !== STUDY_PARAMS.TARGET_PER_STRATUM_ARM || femaleControl !== STUDY_PARAMS.TARGET_PER_STRATUM_ARM) {
    errors.push(`Female Stratum imbalance: Walking Bike=${femaleWB}/8, Control=${femaleControl}/8`);
  }

  const totalWB = maleWB + femaleWB;
  const totalControl = maleControl + femaleControl;

  if (totalWB !== STUDY_PARAMS.TARGET_PER_ARM || totalControl !== STUDY_PARAMS.TARGET_PER_ARM) {
    errors.push(`Total study arm imbalance: Walking Bike=${totalWB}/16, Control=${totalControl}/16`);
  }

  return {
    isValid: errors.length === 0,
    maleWB,
    maleControl,
    femaleWB,
    femaleControl,
    totalWB,
    totalControl,
    totalSlots: slots.length,
    blocksBalanced,
    errors,
  };
}
