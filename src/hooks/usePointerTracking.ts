import { useEffect, useRef, type RefObject } from "react";
import { getLocalPointer } from "../utils/dom";

export function usePointerTracking(
  containerRef: RefObject<Element | null>,
  onPointerMove: (x: number, y: number) => void,
  onPointerTap: (x: number, y: number) => void,
) {
  const pointerRafIdRef = useRef<number | null>(null);
  const pointerPendingRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const currentContainer = containerRef.current;
      if (!currentContainer) {
        return;
      }

      const local = getLocalPointer(event.clientX, event.clientY, currentContainer);
      pointerPendingRef.current = local;

      if (pointerRafIdRef.current !== null) {
        return;
      }

      pointerRafIdRef.current = window.requestAnimationFrame(() => {
        pointerRafIdRef.current = null;
        const pending = pointerPendingRef.current;
        if (pending) {
          onPointerMove(pending.x, pending.y);
        }
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const currentContainer = containerRef.current;
      if (!currentContainer) {
        return;
      }

      const local = getLocalPointer(event.clientX, event.clientY, currentContainer);
      onPointerTap(local.x, local.y);
      onPointerMove(local.x, local.y);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      if (pointerRafIdRef.current !== null) {
        window.cancelAnimationFrame(pointerRafIdRef.current);
      }
    };
  }, [containerRef, onPointerMove, onPointerTap]);
}
