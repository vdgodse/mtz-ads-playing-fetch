export function getDpr(): number {
  return Math.max(1, Math.min(2, window.devicePixelRatio || 1));
}

export function getDimensions(element: Element): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  return {
    width: Math.max(1, Math.floor(rect.width)),
    height: Math.max(1, Math.floor(rect.height)),
  };
}

export function getLocalPointer(
  clientX: number,
  clientY: number,
  container: Element,
): { x: number; y: number } {
  const rect = container.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
    y: Math.max(0, Math.min(rect.height, clientY - rect.top)),
  };
}

export function isOffscreenCanvasSupported(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    "transferControlToOffscreen" in HTMLCanvasElement.prototype
  );
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
