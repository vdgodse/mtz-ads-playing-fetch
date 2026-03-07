export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const INITIAL_LETTER = "A";

/**
 * Storage schema version for localStorage data.
 * Increment this when making breaking changes to the stored data structure.
 * The migration system in storage.ts will handle upgrades from older versions.
 */
export const STORAGE_SCHEMA_VERSION = 1;

export const CONFIG_STORAGE_KEY = `mtz-ads-playing-fetch:v${STORAGE_SCHEMA_VERSION}:config`;
export const HISTORY_STORAGE_KEY = `mtz-ads-playing-fetch:v${STORAGE_SCHEMA_VERSION}:history`;
