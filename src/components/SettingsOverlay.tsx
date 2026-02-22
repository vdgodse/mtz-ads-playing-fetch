import type { Dispatch } from "react";

import type { MachineEvent, MachineState } from "../machine";
import { Settings } from "../Settings";

interface SettingsOverlayProps {
  state: MachineState;
  dispatch: Dispatch<MachineEvent>;
  onReset: () => void;
}

export function SettingsOverlay({ state, dispatch, onReset }: SettingsOverlayProps) {
  if (state.mode !== "settings") return null;

  return (
    <Settings.Root onClose={() => dispatch({ type: "CLOSE_SETTINGS" })} onReset={onReset}>
      <Settings.Backdrop />
      <Settings.Panel>
        <Settings.Header />
        <Settings.Content>
          <Settings.NumberInput
            id="duration"
            label="Stop-after duration (ms) — min 1500"
            value={state.context.inputs.duration}
            min={1500}
            step={100}
            onChange={(value) => dispatch({ type: "CHANGE_DURATION_INPUT", value })}
            onCommit={() => dispatch({ type: "COMMIT_DURATION" })}
          />
          <Settings.NumberInput
            id="jitter"
            label="Jitter (± ms) — default 200"
            value={state.context.inputs.jitter}
            min={0}
            step={10}
            onChange={(value) => dispatch({ type: "CHANGE_JITTER_INPUT", value })}
            onCommit={() => dispatch({ type: "COMMIT_JITTER" })}
          />
          <Settings.NumberInput
            id="historySize"
            label="Recent finals to avoid — min 0"
            value={state.context.inputs.historySize}
            min={0}
            step={1}
            onChange={(value) => dispatch({ type: "CHANGE_HISTORY_SIZE_INPUT", value })}
            onCommit={() => dispatch({ type: "COMMIT_HISTORY_SIZE" })}
          />
          <Settings.Footnote />
          <Settings.ResetButton />
        </Settings.Content>
      </Settings.Panel>
    </Settings.Root>
  );
}
