import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import { LetterStage } from "./components/LetterStage";
import { SettingsOverlay } from "./components/SettingsOverlay";
import { TopBar } from "./components/TopBar";
import { useEscapeKey } from "./hooks/useEscapeKey";
import { useRunningLoop } from "./hooks/useRunningLoop";
import { createInitialState, machineReducer } from "./machine";
import { loadInitialState, resetPersistentStorage } from "./storage";
import { ambientNoiseOverlayStyle, appViewportShellStyle } from "./styles";
import { randomFrom } from "./utils";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [state, dispatch] = useReducer(
    machineReducer,
    createInitialState(initial.config, initial.history),
  );

  const [currentLetter, setCurrentLetter] = useState(() => randomFrom(LETTERS));

  const startButtonRef = useRef<HTMLButtonElement | null>(null);
  const currentLetterRef = useRef<HTMLDivElement | null>(null);

  // Focus Start button when entering idle mode
  useEffect(() => {
    if (state.mode === "idle") {
      startButtonRef.current?.focus();
    }
  }, [state.mode]);

  useEffect(() => {
    if (state.context.lastFinalLetter) {
      setCurrentLetter(state.context.lastFinalLetter);
    }
  }, [state.context.lastFinalLetter]);

  // Handle running mode: RAF + timeout
  useRunningLoop({
    mode: state.mode,
    runToken: state.context.runToken,
    delayMs: state.context.runDelayMs,
    letterRef: currentLetterRef,
    dispatch,
  });

  // Handle Escape key in settings
  useEscapeKey(state.mode === "settings", () => dispatch({ type: "CLOSE_SETTINGS" }));

  function handleStart() {
    dispatch({ type: "START" });
  }

  function handleSettingsClick() {
    const actionByMode: Record<typeof state.mode, () => void> = {
      idle: () => dispatch({ type: "OPEN_SETTINGS" }),
      running: () => {
        dispatch({ type: "STOP" });
        dispatch({ type: "OPEN_SETTINGS" });
      },
      settings: () => dispatch({ type: "CLOSE_SETTINGS" }),
    };

    actionByMode[state.mode]();
  }

  function handleReset() {
    resetPersistentStorage();
    setCurrentLetter(randomFrom(LETTERS));
    dispatch({ type: "RESET" });
  }

  return (
    <div style={appViewportShellStyle}>
      <div aria-hidden="true" style={ambientNoiseOverlayStyle} />
      <TopBar isSettingsOpen={state.mode === "settings"} onSettingsClick={handleSettingsClick} />
      <LetterStage
        currentLetter={currentLetter}
        isRunning={state.mode === "running"}
        onStart={handleStart}
        startButtonRef={startButtonRef}
        currentLetterRef={currentLetterRef}
      />
      <SettingsOverlay state={state} dispatch={dispatch} onReset={handleReset} />
    </div>
  );
}

export default App;
