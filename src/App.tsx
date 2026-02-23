import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import { LetterStage } from "./components/LetterStage";
import { SettingsOverlay } from "./components/SettingsOverlay";
import { TopBar } from "./components/TopBar";
import { useEscapeKey } from "./hooks/useEscapeKey";
import { useRunningLoop } from "./hooks/useRunningLoop";
import { createInitialState, machineReducer } from "./machine";
import { loadInitialState, resetPersistentStorage } from "./storage";
import { ambientNoiseOverlayStyle, appViewportShellStyle, settingsToggleButtonStyle } from "./styles";
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
      <svg aria-hidden="true" style={ambientNoiseOverlayStyle}>
        <rect width="100%" height="100%" filter="url(#noise-filter)" />
      </svg>
      <TopBar>
        <button
          type="button"
          onClick={handleSettingsClick}
          style={settingsToggleButtonStyle(state.mode === "settings")}
          title="Settings"
          aria-hidden={state.mode === "settings"}
          tabIndex={state.mode === "settings" ? -1 : 0}
        >
          Settings
        </button>
      </TopBar>
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
