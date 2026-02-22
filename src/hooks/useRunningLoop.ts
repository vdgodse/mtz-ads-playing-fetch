import { useEffect, type RefObject } from "react";

import type { MachineEvent, MachineState } from "../machine";
import { pickFinalLetter, persistHistory, trimHistory } from "../storage";
import { randomFrom } from "../utils";
import { useLatest } from "./useLatest";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface UseRunningLoopParams {
  mode: MachineState["mode"];
  runToken: number;
  config: MachineState["context"]["config"];
  history: string[];
  letterRef: RefObject<HTMLElement | null>;
  setCurrentLetter: (letter: string) => void;
  dispatch: (event: MachineEvent) => void;
}

export function useRunningLoop({
  mode,
  runToken,
  config,
  history,
  letterRef,
  setCurrentLetter,
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

    const { durationMs, jitter } = config;
    const delay = Math.max(
      0,
      durationMs + (Math.floor(Math.random() * (jitter * 2 + 1)) - jitter),
    );

    timeoutId = window.setTimeout(() => {
      if (runTokenRef.current !== myToken) return;

      const { historySize } = config;
      const recentFinals = trimHistory(history, historySize);
      const chosen = pickFinalLetter(LETTERS, recentFinals);

      if (letterRef.current) {
        letterRef.current.textContent = chosen;
      }
      setCurrentLetter(chosen);

      const nextHistory = trimHistory([...history, chosen], historySize);
      persistHistory(nextHistory);

      dispatch({ type: "RUN_FINISHED", finalLetter: chosen, nextHistory });
    }, delay);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [
    mode,
    runToken,
    config,
    history,
    letterRef,
    setCurrentLetter,
    dispatch,
    runTokenRef,
  ]);
}
