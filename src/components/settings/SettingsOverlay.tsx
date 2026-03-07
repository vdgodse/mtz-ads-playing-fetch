import { Activity, useRef, type Dispatch } from "react";

import { useExitAnimation } from "../../hooks/useExitAnimation";
import type { MachineEvent, MachineState } from "../../state/machine";
import { Settings } from "./Settings";

interface SettingsOverlayProps {
  state: MachineState;
  dispatch: Dispatch<MachineEvent>;
  onReset: () => void;
}

export function SettingsOverlay({ state, dispatch, onReset }: SettingsOverlayProps) {
  const isSettingsOpen = state.mode === "settings";
  const panelRef = useRef<HTMLElement | null>(null);
  const { activityMode, isVisible } = useExitAnimation(isSettingsOpen, panelRef);

  return (
    <Activity mode={activityMode}>
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
              label="How long to spin (ms)"
              value={state.context.inputs.duration}
              min={1500}
              step={100}
              onChange={(value) => dispatch({ type: "CHANGE_INPUT", field: "duration", value })}
              onCommit={() => dispatch({ type: "COMMIT_INPUT", field: "duration" })}
            />
            <Settings.NumberInput
              id="jitter"
              label="Randomness (ms)"
              value={state.context.inputs.jitter}
              min={0}
              step={10}
              onChange={(value) => dispatch({ type: "CHANGE_INPUT", field: "jitter", value })}
              onCommit={() => dispatch({ type: "COMMIT_INPUT", field: "jitter" })}
            />
            <Settings.NumberInput
              id="historySize"
              label="Avoid repeating last X picks"
              value={state.context.inputs.historySize}
              min={0}
              step={1}
              onChange={(value) => dispatch({ type: "CHANGE_INPUT", field: "historySize", value })}
              onCommit={() => dispatch({ type: "COMMIT_INPUT", field: "historySize" })}
            />
            <Settings.ToggleInput
              id="soundEffects"
              label="Play sounds"
              checked={state.context.config.soundEffectsEnabled}
              onChange={() => dispatch({ type: "TOGGLE_SOUND_EFFECTS" })}
            />
            <Settings.ResetButton />
          </Settings.Content>
        </Settings.Panel>
      </Settings.Root>
    </Activity>
  );
}
