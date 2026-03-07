import { useEffect, useRef } from "react";
import { useBackgroundWorker } from "../../hooks/useBackgroundWorker";
import { usePointerTracking } from "../../hooks/usePointerTracking";
import { useResizeObserver } from "../../hooks/useResizeObserver";
import { useVisibilityPause } from "../../hooks/useVisibilityPause";
import {
  getDimensions,
  getDpr,
  isOffscreenCanvasSupported,
  prefersReducedMotion,
} from "../../utils/dom";

type AnimatedBackgroundCanvasProps = {
  onEnhancedModeChange: (isEnhanced: boolean) => void;
};

export function AnimatedBackgroundCanvas({ onEnhancedModeChange }: AnimatedBackgroundCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<Element | null>(null);
  const offscreenTransferredRef = useRef(false);
  const isInitializedRef = useRef(false);

  const { createWorker, terminateWorker, postMessage } = useBackgroundWorker();

  // Initialize worker and transfer canvas control
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    // transferControlToOffscreen can only be called once per canvas element.
    // In React Strict Mode (dev), effects run twice, so we need to guard against this.
    if (offscreenTransferredRef.current) {
      return;
    }

    if (prefersReducedMotion() || !isOffscreenCanvasSupported()) {
      return;
    }

    const parent = canvas.parentElement;
    if (!parent) {
      return;
    }

    offscreenTransferredRef.current = true;
    isInitializedRef.current = true;
    containerRef.current = parent;

    const worker = createWorker();
    const offscreenCanvas = canvas.transferControlToOffscreen();
    const { width, height } = getDimensions(parent);

    worker.postMessage(
      {
        type: "init",
        canvas: offscreenCanvas,
        width,
        height,
        dpr: getDpr(),
      },
      [offscreenCanvas],
    );
    onEnhancedModeChange(true);

    return () => {
      onEnhancedModeChange(false);
      terminateWorker();
      isInitializedRef.current = false;
    };
  }, [createWorker, terminateWorker, onEnhancedModeChange]);

  // Resize handling
  const handleResize = (width: number, height: number, dpr: number) => {
    if (!isInitializedRef.current) return;
    postMessage({ type: "resize", width, height, dpr });
  };

  useResizeObserver(containerRef, handleResize);

  // Pointer tracking
  const handlePointerMove = (x: number, y: number) => {
    if (!isInitializedRef.current) return;
    postMessage({ type: "pointer-move", x, y });
  };

  const handlePointerTap = (x: number, y: number) => {
    if (!isInitializedRef.current) return;
    postMessage({ type: "pointer-tap", x, y });
  };

  usePointerTracking(containerRef, handlePointerMove, handlePointerTap);

  // Visibility pause/resume
  const handlePause = () => {
    if (!isInitializedRef.current) return;
    postMessage({ type: "pause" });
  };

  const handleResume = () => {
    if (!isInitializedRef.current) return;
    postMessage({ type: "resume" });
  };

  useVisibilityPause(handlePause, handleResume);

  return <canvas aria-hidden="true" className="animated-background-canvas" ref={canvasRef} />;
}
