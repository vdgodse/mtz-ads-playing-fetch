import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import { TopBar } from "./components/layout/TopBar";
import { AnimatedBackgroundCanvas } from "./components/layout/AnimatedBackgroundCanvas";
import { SettingsOverlay } from "./components/settings/SettingsOverlay";
import { LetterStage } from "./components/stage/LetterStage";
import { useAudioFeedback } from "./hooks/useAudioFeedback";
import { useKeydown } from "./hooks/useKeydown";
import { useFocusWhen } from "./hooks/useFocusWhen";
import { useRunningLoop } from "./hooks/useRunningLoop";
import { createInitialState, machineReducer } from "./state/machine";
import { loadInitialState, resetPersistentStorage } from "./state/storage";
import { getInitialLetterForRender } from "./utils/initialLetter";
import styles from "./styles/App.module.css";

function App() {
  const initialState = useMemo(() => loadInitialState(), []);
  const initialLetter = useMemo(() => getInitialLetterForRender(), []);

  const [state, dispatch] = useReducer(
    machineReducer,
    createInitialState(initialState.config, initialState.history, initialLetter),
  );

  const [isEnhancedBackgroundEnabled, setIsEnhancedBackgroundEnabled] = useState(false);

  const startButtonRef = useRef<HTMLButtonElement | null>(null);
  const currentLetterRef = useRef<HTMLDivElement | null>(null);
  const previousModeRef = useRef(state.mode);

  const { unlockAudioContext, playRunningTick, speakLetter } = useAudioFeedback({
    soundEffectsEnabled: state.context.config.soundEffectsEnabled,
  });

  useEffect(() => {
    const wasRunningToIdle = previousModeRef.current === "running" && state.mode === "idle";
    previousModeRef.current = state.mode;

    if (!wasRunningToIdle || !state.context.lastFinalLetter) {
      return;
    }

    speakLetter(state.context.lastFinalLetter.toLowerCase());

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const glyph = currentLetterRef.current;
    if (!glyph) {
      return;
    }

    const finalizedClass = styles.activeLetterGlyphFinalized;

    glyph.classList.remove(finalizedClass);

    const handleFinalizeAnimationEnd = () => {
      glyph.classList.remove(finalizedClass);
    };

    glyph.addEventListener("animationend", handleFinalizeAnimationEnd, { once: true });

    const rafId = window.requestAnimationFrame(() => {
      glyph.classList.add(finalizedClass);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      glyph.removeEventListener("animationend", handleFinalizeAnimationEnd);
    };
  }, [state.mode, state.context.lastFinalLetter, speakLetter]);

  // Handle running mode: RAF + timeout
  useRunningLoop({
    mode: state.mode,
    runToken: state.context.runToken,
    delayMs: state.context.runDelayMs,
    letterRef: currentLetterRef,
    dispatch,
    onLetterChange: playRunningTick,
  });

  useFocusWhen({ when: state.mode === "idle", targetRef: startButtonRef });
  useKeydown({
    keys: new Set(["Escape"]),
    when: state.mode === "settings",
    onKeydown: () => dispatch({ type: "CLOSE_SETTINGS" }),
  });

  function handleStart() {
    unlockAudioContext();
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
    dispatch({ type: "RESET", letter: getInitialLetterForRender() });
  }

  return (
    <div className={`app-shell ${isEnhancedBackgroundEnabled ? styles.appShellFallbackBg : ""}`}>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <AnimatedBackgroundCanvas onEnhancedModeChange={setIsEnhancedBackgroundEnabled} />
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
        currentLetter={state.context.lastFinalLetter}
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
