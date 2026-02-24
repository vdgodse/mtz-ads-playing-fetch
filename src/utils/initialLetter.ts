import { HISTORY_STORAGE_KEY, INITIAL_LETTER } from "../constants";

function sanitizeLetter(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return /^[A-Z]$/.test(normalized) ? normalized : null;
}

function resolveClientInitialLetter(): string {
  const bootstrapLetter = sanitizeLetter(
    (window as Window & { __MTZ_INITIAL_LETTER__?: unknown }).__MTZ_INITIAL_LETTER__,
  );
  if (bootstrapLetter) return bootstrapLetter;

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return INITIAL_LETTER;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_LETTER;
    const last = sanitizeLetter(parsed[parsed.length - 1]);
    return last ?? INITIAL_LETTER;
  } catch {
    return INITIAL_LETTER;
  }
}

export function getInitialLetterForRender(): string {
  if (typeof window === "undefined") {
    return INITIAL_LETTER;
  }

  return resolveClientInitialLetter();
}