// src/utils/reportId.ts
// Utility for generating and validating human-readable, unique, searchable Report IDs
// Example format: WR-2026-8F4K29

const PREFIX = "WR";
const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Exclude ambiguous chars like 0, O, 1, I

/**
 * Generates a unique, human-readable Report ID.
 * Format: WR-<YEAR>-<6 RANDOM ALPHANUMERIC CHARACTERS>
 * Example: WR-2026-8F4K29
 */
export function generateReportId(year: number = new Date().getFullYear()): string {
  let randomPart = "";
  const randomBytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 6; i++) {
      randomPart += CHARSET[randomBytes[i] % CHARSET.length];
    }
  } else {
    for (let i = 0; i < 6; i++) {
      randomPart += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }
  }

  return `${PREFIX}-${year}-${randomPart}`;
}

/**
 * Checks if a string matches the standard Report ID format (WR-YYYY-XXXXXX).
 */
export function isValidReportId(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  const clean = id.trim().toUpperCase();
  // Support both WR-YYYY-XXXXXX and existing RPT-XXXXXX formats
  const wrRegex = /^WR-\d{4}-[A-Z0-9]{6}$/i;
  const rptRegex = /^RPT-[A-Z0-9]+$/i;
  return wrRegex.test(clean) || rptRegex.test(clean);
}

/**
 * Formats user input into clean uppercase trimmed Report ID.
 */
export function formatReportId(input: string): string {
  if (!input) return "";
  return input.trim().toUpperCase();
}
