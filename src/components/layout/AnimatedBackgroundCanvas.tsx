import { useEffect, useRef } from "react";

type WorkerMessage =
  | {
      type: "init";
      canvas: OffscreenCanvas;
      width: number;
      height: number;
      dpr: number;
    }
  | {
      type: "resize";
      width: number;
      height: number;
      dpr: number;
    }
  | {
      type: "pointer-move";
      x: number;
      y: number;
    }
  | {
      type: "pointer-tap";
      x: number;
      y: number;
    }
  | { type: "pause" }
  | { type: "resume" };

type AnimatedBackgroundCanvasProps = {
  onEnhancedModeChange: (isEnhanced: boolean) => void;
};

export function AnimatedBackgroundCanvas({ onEnhancedModeChange }: AnimatedBackgroundCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    const isOffscreenSupported =
      typeof Worker !== "undefined" &&
      typeof OffscreenCanvas !== "undefined" &&
      "transferControlToOffscreen" in HTMLCanvasElement.prototype;

    if (!isOffscreenSupported) {
      return;
    }

    const worker = new Worker(new URL("../../workers/background.worker.ts", import.meta.url), {
      type: "module",
    });

    let resizeRafId: number | null = null;
    let pointerRafId: number | null = null;
    let lastResizeSignature = "";
    let pointerPending: { x: number; y: number } | null = null;

    const postResize = () => {
      const parent = canvas.parentElement;
      if (!parent) {
        return;
      }

      const rect = parent.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      const resizeMessage: WorkerMessage = {
        type: "resize",
        width,
        height,
        dpr,
      };

      const signature = `${width}x${height}@${dpr}`;
      if (signature === lastResizeSignature) {
        return;
      }

      lastResizeSignature = signature;

      worker.postMessage(resizeMessage);
    };

    const offscreenCanvas = canvas.transferControlToOffscreen();
    const parent = canvas.parentElement;
    const parentRect = parent?.getBoundingClientRect();

    const initMessage: WorkerMessage = {
      type: "init",
      canvas: offscreenCanvas,
      width: Math.max(1, Math.floor(parentRect?.width ?? window.innerWidth)),
      height: Math.max(1, Math.floor(parentRect?.height ?? window.innerHeight)),
      dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    };

    worker.postMessage(initMessage, [offscreenCanvas]);
    onEnhancedModeChange(true);

    const postPointerMove = (x: number, y: number) => {
      const pointerMessage: WorkerMessage = {
        type: "pointer-move",
        x,
        y,
      };
      worker.postMessage(pointerMessage);
    };

    const postPointerTap = (x: number, y: number) => {
      const pointerMessage: WorkerMessage = {
        type: "pointer-tap",
        x,
        y,
      };
      worker.postMessage(pointerMessage);
    };

    const getLocalPointer = (clientX: number, clientY: number) => {
      const parent = canvas.parentElement;
      if (!parent) {
        return null;
      }

      const rect = parent.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, clientY - rect.top)),
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const local = getLocalPointer(event.clientX, event.clientY);
      if (!local) {
        return;
      }

      pointerPending = local;

      if (pointerRafId !== null) {
        return;
      }

      pointerRafId = window.requestAnimationFrame(() => {
        pointerRafId = null;
        if (!pointerPending) {
          return;
        }
        postPointerMove(pointerPending.x, pointerPending.y);
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const local = getLocalPointer(event.clientX, event.clientY);
      if (!local) {
        return;
      }

      postPointerTap(local.x, local.y);
      postPointerMove(local.x, local.y);
    };

    const resizeObserver = new ResizeObserver(() => {
      if (resizeRafId !== null) {
        window.cancelAnimationFrame(resizeRafId);
      }

      resizeRafId = window.requestAnimationFrame(() => {
        resizeRafId = null;
        postResize();
      });
    });

    if (parent) {
      resizeObserver.observe(parent);
    }

    const handleVisibilityChange = () => {
      const message: WorkerMessage = {
        type: document.hidden ? "pause" : "resume",
      };
      worker.postMessage(message);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    return () => {
      onEnhancedModeChange(false);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      if (resizeRafId !== null) {
        window.cancelAnimationFrame(resizeRafId);
      }
      if (pointerRafId !== null) {
        window.cancelAnimationFrame(pointerRafId);
      }
      resizeObserver.disconnect();
      worker.terminate();
    };
  }, [onEnhancedModeChange]);

  return <canvas aria-hidden="true" className="animated-background-canvas" ref={canvasRef} />;
}
