import { useEffect, useRef, type RefObject } from "react";
import { getDimensions, getDpr } from "../utils/dom";

export function useResizeObserver(
  containerRef: RefObject<Element | null>,
  onResize: (width: number, height: number, dpr: number) => void,
) {
  const rafIdRef = useRef<number | null>(null);
  const lastSignatureRef = useRef("");

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const handleResize = () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;

        const currentElement = containerRef.current;
        if (!currentElement) {
          return;
        }

        const { width, height } = getDimensions(currentElement);
        const dpr = getDpr();
        const signature = `${width}x${height}@${dpr}`;

        if (signature === lastSignatureRef.current) {
          return;
        }

        lastSignatureRef.current = signature;
        onResize(width, height, dpr);
      });
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [containerRef, onResize]);
}
