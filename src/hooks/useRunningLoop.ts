import { useEffect } from "react";

import type { MachineState } from "../machine";
import { pickFinalLetter, saveHistory, trimHistory } from "../storage";
import { randomFrom } from "../utils";
import { useLatest } from "./useLatest";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface UseRunningLoopParams {
  mode: MachineState["mode"];
  runToken: number;
  config: MachineState["context"]["config"];
  history: string[];
  setCurrentLetter: (letter: string) => void;
  dispatch: (event: {
    type: "RUN_FINISHED";
    finalLetter: string;
    nextHistory: string[];
  }) => void;
}

export function useRunningLoop({
  mode,
  runToken,
  config,
  history,
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
      setCurrentLetter(randomFrom(LETTERS));
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

      setCurrentLetter(chosen);

      const nextHistory = trimHistory([...history, chosen], historySize);
      saveHistory(nextHistory);

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
    setCurrentLetter,
    dispatch,
    runTokenRef,
  ]);
}
