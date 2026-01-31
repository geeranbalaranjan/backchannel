const BLOCKLIST = [
  "admin",
  "instructor",
  "prof",
  "professor",
  "ta",
  "teacher",
  "mod",
  "moderator",
  "system",
  "support",
];

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const ALIAS_REGEX = /^[\w\s]+$/;

export function validateAlias(
  alias: string,
  instructorDisplayName?: string | null
): { ok: true } | { ok: false; error: string } {
  const trimmed = alias.trim();
  if (trimmed.length < MIN_LENGTH)
    return { ok: false, error: `Alias must be at least ${MIN_LENGTH} characters` };
  if (trimmed.length > MAX_LENGTH)
    return { ok: false, error: `Alias must be at most ${MAX_LENGTH} characters` };
  if (!ALIAS_REGEX.test(trimmed))
    return { ok: false, error: "Alias can only contain letters, numbers, spaces, and underscores" };
  const lower = trimmed.toLowerCase();
  for (const word of BLOCKLIST) {
    if (lower === word || lower.startsWith(word + " ") || lower.endsWith(" " + word))
      return { ok: false, error: "That alias is not allowed" };
  }
  if (instructorDisplayName) {
    const instructorLower = instructorDisplayName.trim().toLowerCase();
    if (instructorLower && (lower === instructorLower || lower.includes(instructorLower)))
      return { ok: false, error: "Cannot impersonate the instructor" };
  }
  return { ok: true };
}

export function sanitizeAlias(alias: string): string {
  return alias.trim().slice(0, MAX_LENGTH);
}
