import { useRef } from "react";

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

export type { WorkerMessage };

export function useBackgroundWorker() {
  const workerRef = useRef<Worker | null>(null);

  const createWorker = () => {
    const worker = new Worker(new URL("../workers/background.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;
    return worker;
  };

  const terminateWorker = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  };

  const postMessage = (message: WorkerMessage, transfer?: Transferable[]) => {
    if (transfer) {
      workerRef.current?.postMessage(message, transfer);
    } else {
      workerRef.current?.postMessage(message);
    }
  };

  return { createWorker, terminateWorker, postMessage, workerRef };
}
