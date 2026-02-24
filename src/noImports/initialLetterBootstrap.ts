export function initialLetterBootstrap(storageKey: string): void {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    const last = String(parsed[parsed.length - 1] || "").toUpperCase();
    if (!/^[A-Z]$/.test(last)) return;
    window.__MTZ_INITIAL_LETTER__ = last;

    const el = document.querySelector(".active-letter-glyph");
    if (el) el.textContent = last;
  } catch (_e) {}
}
