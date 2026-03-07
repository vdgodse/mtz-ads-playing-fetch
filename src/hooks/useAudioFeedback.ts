import { useEffect, useRef } from "react";

import { playLetterTick } from "../utils/playLetterTick";
import { speakLetter as speakLetterUtil, cancelSpeech } from "../utils/speechSynthesis";

const RUNNING_TICK_INTERVAL_S = 0.24;

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

interface UseAudioFeedbackOptions {
  soundEffectsEnabled: boolean;
}

export function useAudioFeedback({ soundEffectsEnabled }: UseAudioFeedbackOptions) {
  const lastTickAtRef = useRef(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const getAudioContext = () => {
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
  };

  // oxlint-disable-next-line react-hooks-js/exhaustive-deps - unlockAudioContext has a stable reference via React Compiler
  const unlockAudioContext = () => {
    const context = getAudioContext();
    if (!context) {
      return;
    }

    if (context.state !== "running") {
      void context.resume();
    }
  };

  const playRunningTick = (letter: string) => {
    if (!soundEffectsEnabled) {
      return;
    }

    const context = getAudioContext();
    if (!context || context.state !== "running") {
      return;
    }

    const now = context.currentTime;
    if (now - lastTickAtRef.current < RUNNING_TICK_INTERVAL_S) {
      return;
    }

    lastTickAtRef.current = now;

    playLetterTick(context, letter);
  };

  const speakLetter = (letter: string) => {
    if (!soundEffectsEnabled) {
      return;
    }
    speakLetterUtil(letter);
  };

  useEffect(() => {
    if (soundEffectsEnabled) {
      unlockAudioContext();
    }

    return () => {
      cancelSpeech();
    };
  }, [soundEffectsEnabled, unlockAudioContext]);

  return {
    unlockAudioContext,
    playRunningTick,
    speakLetter,
  };
}
