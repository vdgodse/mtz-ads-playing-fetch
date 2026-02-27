import { CONFIG_STORAGE_KEY, HISTORY_STORAGE_KEY } from "../config/constants";
import { randomFrom } from "../utils/random";

export type Config = {
  durationMs: number;
  jitter: number;
  historySize: number;
  soundEffectsEnabled: boolean;
};

export const DEFAULT_CONFIG: Config = {
  durationMs: 5000,
  jitter: 200,
  historySize: 12,
  soundEffectsEnabled: true,
};

export function sanitizeSoundEffectsEnabled(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") {
    return raw;
  }

  return fallback;
}

function getPersistentItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function persistItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore (private mode / quota / disabled)
  }
}

function removePersistentItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function sanitizeDurationMs(raw: unknown, fallback: number): number {
  const n = typeof raw === "string" ? Number(raw) : (raw as number);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1500, Math.floor(n));
}

export function sanitizeHistorySize(raw: unknown, fallback: number): number {
  const n = typeof raw === "string" ? Number(raw) : (raw as number);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

export function sanitizeJitter(raw: unknown, fallback: number): number {
  const n = typeof raw === "string" ? Number(raw) : (raw as number);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

export function trimHistory(history: string[], historySize: number): string[] {
  if (historySize <= 0) return [];
  if (history.length <= historySize) return history;
  return history.slice(history.length - historySize);
}
export function pickFinalLetter(allLetters: string[], recentFinals: string[]): string {
  const recentSet = new Set(recentFinals);
  const pool = allLetters.filter((l) => !recentSet.has(l));
  return randomFrom(pool.length > 0 ? pool : allLetters);
}

export function loadConfig(): Config {
  const raw = getPersistentItem(CONFIG_STORAGE_KEY);
  if (!raw) return DEFAULT_CONFIG;

  try {
    const parsed = JSON.parse(raw) as Partial<Config> | null;
    const durationMs = sanitizeDurationMs(parsed?.durationMs, DEFAULT_CONFIG.durationMs);
    const historySize = sanitizeHistorySize(parsed?.historySize, DEFAULT_CONFIG.historySize);
    const jitter = sanitizeJitter(parsed?.jitter, DEFAULT_CONFIG.jitter);
    const soundEffectsEnabled = sanitizeSoundEffectsEnabled(
      parsed?.soundEffectsEnabled,
      DEFAULT_CONFIG.soundEffectsEnabled,
    );
    return { durationMs, jitter, historySize, soundEffectsEnabled };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function persistConfig(config: Config): void {
  persistItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function loadHistory(): string[] {
  const raw = getPersistentItem(HISTORY_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.toUpperCase())
      .filter((x) => x.length === 1);
  } catch {
    return [];
  }
}

export function persistHistory(history: string[]): void {
  persistItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

type PersistStateInput =
  | { config: Config; history?: string[] }
  | { config?: Config; history: string[] };

export function persistState(state: PersistStateInput): void {
  if (state.config) {
    persistConfig(state.config);
  }

  if (state.history) {
    persistHistory(state.history);
  }
}

export function resetPersistentStorage(): void {
  removePersistentItem(CONFIG_STORAGE_KEY);
  removePersistentItem(HISTORY_STORAGE_KEY);
}

export function loadInitialState(): { config: Config; history: string[] } {
  const config = loadConfig();
  const rawHistory = loadHistory();
  const history = trimHistory(rawHistory, config.historySize);

  // Self-heal storage so it always contains sanitized values.
  persistState({ config, history });

  return { config, history };
}
