import { randomFrom } from "./utils";

export type Config = {
  durationMs: number;
  jitter: number;
  historySize: number;
};

export const DEFAULT_CONFIG: Config = {
  durationMs: 5000,
  jitter: 200,
  historySize: 12,
};

const CONFIG_KEY = "mtz-ads-playing-fetch:v1:config";
const HISTORY_KEY = "mtz-ads-playing-fetch:v1:history";

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
  const raw = getPersistentItem(CONFIG_KEY);
  if (!raw) return DEFAULT_CONFIG;

  try {
    const parsed = JSON.parse(raw) as Partial<Config> | null;
    const durationMs = sanitizeDurationMs(parsed?.durationMs, DEFAULT_CONFIG.durationMs);
    const historySize = sanitizeHistorySize(parsed?.historySize, DEFAULT_CONFIG.historySize);
    const jitter = sanitizeJitter(parsed?.jitter, DEFAULT_CONFIG.jitter);
    return { durationMs, jitter, historySize };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function persistConfig(config: Config): void {
  persistItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadHistory(): string[] {
  const raw = getPersistentItem(HISTORY_KEY);
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
  persistItem(HISTORY_KEY, JSON.stringify(history));
}

export function resetPersistentStorage(): void {
  removePersistentItem(CONFIG_KEY);
  removePersistentItem(HISTORY_KEY);
}

export function loadInitialState(): { config: Config; history: string[] } {
  const config = loadConfig();
  const rawHistory = loadHistory();
  const history = trimHistory(rawHistory, config.historySize);

  // Self-heal storage so it always contains sanitized values.
  persistConfig(config);
  persistHistory(history);

  return { config, history };
}
