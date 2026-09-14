import { WatchlistEntry } from '../types/index.ts';

export interface PlateMatchResult {
  isMatch: boolean;
  matchType: 'exact' | 'possible' | 'none';
  matchedEntry?: WatchlistEntry;
  targetPlate?: string;
  detectedPlate: string;
  distance: number;
  similarity: number;
  reason?: string;
  diffDescription?: string;
}

/**
 * Standard Levenshtein distance calculation between two plate strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const a = (str1 || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const b = (str2 || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  const dp: number[][] = Array(a.length + 1)
    .fill(null)
    .map(() => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[a.length][b.length];
}

/**
 * Normalize plate number for comparison
 */
export function normalizePlate(plate: string): string {
  return (plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Character by character comparison to explain OCR digit/character fumbles
 */
export function describePlateDiff(detected: string, target: string): string {
  const dNorm = normalizePlate(detected);
  const tNorm = normalizePlate(target);

  if (dNorm === tNorm) return 'Exact character-for-character match';

  if (dNorm.length === tNorm.length) {
    const diffs: string[] = [];
    for (let i = 0; i < dNorm.length; i++) {
      if (dNorm[i] !== tNorm[i]) {
        diffs.push(`pos ${i + 1}: '${dNorm[i]}' instead of '${tNorm[i]}'`);
      }
    }
    if (diffs.length === 1) {
      return `Single character fumble (${diffs[0]})`;
    }
    return `${diffs.length} characters differ (${diffs.join(', ')})`;
  }

  return `Length mismatch (${dNorm.length} vs ${tNorm.length} chars)`;
}

/**
 * Evaluate a detected plate against the active Watchlist
 * Returns exact matches first; if no exact match, checks for Possible Matches (edit distance <= 1 or 2 with high similarity)
 */
export function matchPlateAgainstWatchlist(
  rawDetectedPlate: string,
  watchlist: WatchlistEntry[]
): PlateMatchResult {
  const detectedNorm = normalizePlate(rawDetectedPlate);

  if (!detectedNorm || !watchlist || watchlist.length === 0) {
    return {
      isMatch: false,
      matchType: 'none',
      detectedPlate: rawDetectedPlate,
      distance: 99,
      similarity: 0,
    };
  }

  const activeEntries = watchlist.filter((w) => w.status === 'active');

  // 1. Check for Exact Match (Distance = 0)
  for (const entry of activeEntries) {
    const targetNorm = normalizePlate(entry.plateNumber);
    if (detectedNorm === targetNorm) {
      return {
        isMatch: true,
        matchType: 'exact',
        matchedEntry: entry,
        targetPlate: entry.plateNumber,
        detectedPlate: rawDetectedPlate,
        distance: 0,
        similarity: 100,
        reason: entry.reason,
        diffDescription: 'Exact 100% plate match',
      };
    }
  }

  // 2. Check for Possible Match (Fuzzy OCR Fumble, Distance = 1 or 2)
  let bestMatch: PlateMatchResult | null = null;
  let minDistance = 99;

  for (const entry of activeEntries) {
    const targetNorm = normalizePlate(entry.plateNumber);
    const dist = levenshteinDistance(detectedNorm, targetNorm);
    const maxLen = Math.max(detectedNorm.length, targetNorm.length);
    const similarity = maxLen > 0 ? Math.round(((maxLen - dist) / maxLen) * 100) : 0;

    // A Possible Match is considered if:
    // - Edit distance is 1 (e.g. DL3CAM123A vs DL3CAM1234, or 1 character substituted/dropped)
    // - Or edit distance is 2 if the plate is long (>= 9 chars) and similarity >= 80%
    const isPossible = dist === 1 || (dist === 2 && maxLen >= 9 && similarity >= 80);

    if (isPossible && dist < minDistance) {
      minDistance = dist;
      const diffDesc = describePlateDiff(detectedNorm, targetNorm);
      bestMatch = {
        isMatch: true,
        matchType: 'possible',
        matchedEntry: entry,
        targetPlate: entry.plateNumber,
        detectedPlate: rawDetectedPlate,
        distance: dist,
        similarity,
        reason: `Possible Watchlist Match (${dist} char discrepancy with '${entry.plateNumber}'). Suspected OCR fumble.`,
        diffDescription: diffDesc,
      };
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  return {
    isMatch: false,
    matchType: 'none',
    detectedPlate: rawDetectedPlate,
    distance: minDistance,
    similarity: 0,
  };
}
