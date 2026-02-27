import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { TopBar } from "./components/layout/TopBar";
import { AnimatedBackgroundCanvas } from "./components/layout/AnimatedBackgroundCanvas";
import { SettingsOverlay } from "./components/settings/SettingsOverlay";
import { LetterStage } from "./components/stage/LetterStage";
import { LETTERS } from "./config/constants";
import { useEscapeKey } from "./hooks/useEscapeKey";
import { useRunningLoop } from "./hooks/useRunningLoop";
import { createInitialState, machineReducer } from "./state/machine";
import { loadInitialState, resetPersistentStorage } from "./state/storage";
import { randomFrom } from "./utils/random";
import { getInitialLetterForRender } from "./utils/initialLetter";
import styles from "./styles/App.module.css";

const RUNNING_TICK_INTERVAL_S = 0.24;

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [state, dispatch] = useReducer(
    machineReducer,
    createInitialState(initial.config, initial.history),
  );

  const [currentLetter, setCurrentLetter] = useState(getInitialLetterForRender);
  const [isEnhancedBackgroundEnabled, setIsEnhancedBackgroundEnabled] = useState(false);

  const startButtonRef = useRef<HTMLButtonElement | null>(null);
  const currentLetterRef = useRef<HTMLDivElement | null>(null);
  const previousModeRef = useRef(state.mode);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTickAtRef = useRef(0);

  const ensureAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    const AudioContextCtor =
      window.AudioContext ?? (window as WebkitWindow).webkitAudioContext ?? null;

    if (!AudioContextCtor) {
      return null;
    }

    audioContextRef.current = new AudioContextCtor();
    return audioContextRef.current;
  }, []);

  const unlockAudioContext = useCallback(() => {
    const context = ensureAudioContext();
    if (!context) {
      return;
    }

    if (context.state !== "running") {
      void context.resume();
    }
  }, [ensureAudioContext]);

  const playRunningTick = useCallback(
    (letter: string) => {
      if (!state.context.config.soundEffectsEnabled) {
        return;
      }

      const context = ensureAudioContext();
      if (!context || context.state !== "running") {
        return;
      }

      const now = context.currentTime;
      if (now - lastTickAtRef.current < RUNNING_TICK_INTERVAL_S) {
        return;
      }

      lastTickAtRef.current = now;

      const noteSteps = [0, 2, 4, 7, 9] as const;
      const letterIndex = (letter.charCodeAt(0) - 65 + 26) % 26;
      const step = noteSteps[letterIndex % noteSteps.length];
      const octave = Math.floor(letterIndex / noteSteps.length) % 2;
      const frequency = 880 * 2 ** ((step + octave * 12) / 12);

      const bodyOsc = context.createOscillator();
      const shimmerOsc = context.createOscillator();
      const bodyGain = context.createGain();
      const shimmerGain = context.createGain();
      const masterGain = context.createGain();
      const highpass = context.createBiquadFilter();

      bodyOsc.type = "sine";
      shimmerOsc.type = "triangle";
      bodyOsc.frequency.setValueAtTime(frequency, now);
      shimmerOsc.frequency.setValueAtTime(frequency * 2, now);

      highpass.type = "highpass";
      highpass.frequency.setValueAtTime(780, now);
      highpass.Q.setValueAtTime(0.7, now);

      bodyGain.gain.setValueAtTime(0.0001, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.013, now + 0.003);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      shimmerGain.gain.setValueAtTime(0.0001, now);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0045, now + 0.0025);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

      masterGain.gain.setValueAtTime(0.9, now);

      bodyOsc.connect(bodyGain);
      shimmerOsc.connect(shimmerGain);
      bodyGain.connect(masterGain);
      shimmerGain.connect(masterGain);
      masterGain.connect(highpass);
      highpass.connect(context.destination);

      bodyOsc.start(now);
      shimmerOsc.start(now);
      bodyOsc.stop(now + 0.034);
      shimmerOsc.stop(now + 0.028);
    },
    [ensureAudioContext, state.context.config.soundEffectsEnabled],
  );

  // Focus Start button when entering idle mode
  useEffect(() => {
    if (state.mode === "idle") {
      startButtonRef.current?.focus();
    }
  }, [state.mode]);

  useEffect(() => {
    const wasRunningToIdle = previousModeRef.current === "running" && state.mode === "idle";
    previousModeRef.current = state.mode;

    if (!wasRunningToIdle || !state.context.lastFinalLetter) {
      return;
    }

    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setCurrentLetter(state.context.lastFinalLetter);

    if (state.context.config.soundEffectsEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `${state.context.lastFinalLetter.toLowerCase()}`,
      );
      utterance.rate = 1;
      utterance.pitch = 1.02;
      window.speechSynthesis.speak(utterance);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const glyph = currentLetterRef.current;
    if (!glyph) {
      return;
    }

    glyph.classList.remove(styles.activeLetterGlyphFinalized);

    const handleFinalizeAnimationEnd = () => {
      glyph.classList.remove(styles.activeLetterGlyphFinalized);
    };

    glyph.addEventListener("animationend", handleFinalizeAnimationEnd, { once: true });

    const rafId = window.requestAnimationFrame(() => {
      glyph.classList.add(styles.activeLetterGlyphFinalized);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      glyph.removeEventListener("animationend", handleFinalizeAnimationEnd);
    };
  }, [state.mode, state.context.lastFinalLetter, state.context.config.soundEffectsEnabled]);

  // Handle running mode: RAF + timeout
  useRunningLoop({
    mode: state.mode,
    runToken: state.context.runToken,
    delayMs: state.context.runDelayMs,
    letterRef: currentLetterRef,
    dispatch,
    onLetterChange: playRunningTick,
  });

  useEffect(() => {
    if (state.context.config.soundEffectsEnabled) {
      unlockAudioContext();
    }

    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [state.context.config.soundEffectsEnabled, unlockAudioContext]);

  // Handle Escape key in settings
  useEscapeKey(state.mode === "settings", () => dispatch({ type: "CLOSE_SETTINGS" }));

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
    setCurrentLetter(randomFrom(LETTERS));
    dispatch({ type: "RESET" });
  }

  return (
    <div
      className={`app-shell ${styles.appShell}${isEnhancedBackgroundEnabled ? ` ${styles.appShellOffscreenBg}` : ""}`}
    >
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
