import { Activity, type Dispatch } from "react";

import type { MachineEvent, MachineState } from "../machine";
import { Settings } from "../Settings";

interface SettingsOverlayProps {
  state: MachineState;
  dispatch: Dispatch<MachineEvent>;
  onReset: () => void;
}

export function SettingsOverlay({ state, dispatch, onReset }: SettingsOverlayProps) {
  const isSettingsOpen = state.mode === "settings";

  return (
    <Activity mode={isSettingsOpen ? "visible" : "hidden"}>
      <Settings.Root
        onClose={() => dispatch({ type: "CLOSE_SETTINGS" })}
        onReset={onReset}
        visible={isSettingsOpen}
      >
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
    </Activity>
  );
}
