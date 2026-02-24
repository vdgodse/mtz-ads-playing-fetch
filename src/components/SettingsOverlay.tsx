import { useEffect, useRef, useState, type Dispatch } from "react";

import type { MachineEvent, MachineState } from "../machine";
import { Settings } from "../Settings";

interface SettingsOverlayProps {
  state: MachineState;
  dispatch: Dispatch<MachineEvent>;
  onReset: () => void;
}

export function SettingsOverlay({ state, dispatch, onReset }: SettingsOverlayProps) {
  const isSettingsOpen = state.mode === "settings";
  const [shouldRender, setShouldRender] = useState(isSettingsOpen);
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isSettingsOpen) {
      setShouldRender(true);
      const raf = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => window.cancelAnimationFrame(raf);
    } else {
      setIsVisible(false);

      let isCancelled = false;
      let stopWaiting: (() => void) | null = null;

      const waitForExitAnimation = async () => {
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });

        const panel = panelRef.current;
        if (!panel) {
          return;
        }

        await new Promise<void>((resolve) => {
          let settled = false;

          const settle = () => {
            if (settled) return;
            settled = true;
            panel.removeEventListener("animationend", handleAnimationEnd);
            panel.removeEventListener("animationcancel", handleAnimationCancel);
            resolve();
          };

          const handleAnimationEnd = (event: AnimationEvent) => {
            if (event.target === panel) {
              settle();
            }
          };

          const handleAnimationCancel = (event: AnimationEvent) => {
            if (event.target === panel) {
              settle();
            }
          };

          panel.addEventListener("animationend", handleAnimationEnd);
          panel.addEventListener("animationcancel", handleAnimationCancel);
          stopWaiting = settle;

          const computed = window.getComputedStyle(panel);
          const animationName = computed.animationName;

          if (!animationName || animationName === "none") {
            settle();
          }
        });
      };

      void waitForExitAnimation().finally(() => {
        if (!isCancelled) {
          setShouldRender(false);
        }
      });

      return () => {
        isCancelled = true;
        stopWaiting?.();
      };
    }
  }, [isSettingsOpen]);

  if (!shouldRender) return null;

  return (
    <Settings.Root
      onClose={() => dispatch({ type: "CLOSE_SETTINGS" })}
      onReset={onReset}
      visible={isVisible}
    >
      <Settings.Backdrop />
      <Settings.Panel panelRef={panelRef}>
        <Settings.Header />
        <Settings.Content>
          <Settings.NumberInput
            id="duration"
            label="Stop-after duration (ms) — min 1500"
            value={state.context.inputs.duration}
            min={1500}
            step={100}
            onChange={(value) => dispatch({ type: "CHANGE_INPUT", field: "duration", value })}
            onCommit={() => dispatch({ type: "COMMIT_INPUT", field: "duration" })}
          />
          <Settings.NumberInput
            id="jitter"
            label="Jitter (± ms) — default 200"
            value={state.context.inputs.jitter}
            min={0}
            step={10}
            onChange={(value) => dispatch({ type: "CHANGE_INPUT", field: "jitter", value })}
            onCommit={() => dispatch({ type: "COMMIT_INPUT", field: "jitter" })}
          />
          <Settings.NumberInput
            id="historySize"
            label="Recent finals to avoid — min 0"
            value={state.context.inputs.historySize}
            min={0}
            step={1}
            onChange={(value) => dispatch({ type: "CHANGE_INPUT", field: "historySize", value })}
            onCommit={() => dispatch({ type: "COMMIT_INPUT", field: "historySize" })}
          />
          <Settings.Footnote />
          <Settings.ResetButton />
        </Settings.Content>
      </Settings.Panel>
    </Settings.Root>
  );
}
