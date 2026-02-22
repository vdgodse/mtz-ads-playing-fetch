import { useEffect, type RefObject } from "react";

import type { MachineEvent, MachineState } from "../machine";
import { randomFrom } from "../utils";
import { useLatest } from "./useLatest";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface UseRunningLoopParams {
  mode: MachineState["mode"];
  runToken: number;
  delayMs: number;
  letterRef: RefObject<HTMLElement | null>;
  dispatch: (event: MachineEvent) => void;
}

export function useRunningLoop({
  mode,
  runToken,
  delayMs,
  letterRef,
  dispatch,
}: UseRunningLoopParams) {
  const runTokenRef = useLatest(runToken);

  useEffect(() => {
    if (mode !== "running") return;

    const myToken = runToken;
    let rafId: number | null = null;
    let timeoutId: number | null = null;

    const tick = () => {
      if (runTokenRef.current !== myToken) return;
      const next = randomFrom(LETTERS);
      if (letterRef.current) {
        letterRef.current.textContent = next;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    timeoutId = window.setTimeout(() => {
      if (runTokenRef.current !== myToken) return;
      dispatch({ type: "RUN_FINISHED" });
    }, delayMs);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [mode, runToken, delayMs, letterRef, dispatch, runTokenRef]);
}
