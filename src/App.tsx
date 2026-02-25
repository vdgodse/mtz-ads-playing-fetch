import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import { TopBar } from "./components/layout/TopBar";
import { SettingsOverlay } from "./components/settings/SettingsOverlay";
import { LetterStage } from "./components/stage/LetterStage";
import { LETTERS } from "./config/constants";
import { useEscapeKey } from "./hooks/useEscapeKey";
import { useRunningLoop } from "./hooks/useRunningLoop";
import { createInitialState, machineReducer } from "./state/machine";
import { loadInitialState, resetPersistentStorage } from "./state/storage";
import { randomFrom } from "./utils/random";
import { getInitialLetterForRender } from "./utils/initialLetter";

function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [state, dispatch] = useReducer(
    machineReducer,
    createInitialState(initial.config, initial.history),
  );

  const [currentLetter, setCurrentLetter] = useState(getInitialLetterForRender);

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
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
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
    <div className="app-shell">
      <svg aria-hidden="true" className="ambient-noise-overlay">
        <rect width="100%" height="100%" filter="url(#noise-filter)" />
      </svg>
      <TopBar>
        <button
          type="button"
          onClick={handleSettingsClick}
          className={`app-button app-button--secondary settings-toggle-button${state.mode === "settings" ? " is-hidden" : ""}`}
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
