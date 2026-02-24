import { createContext, type ReactNode, type Ref, useContext } from "react";

interface SettingsRootProps {
  onClose: () => void;
  onReset: () => void;
  visible?: boolean;
  children: ReactNode;
}

type SettingsContextValue = {
  onClose: () => void;
  onReset: () => void;
  visible: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function useSettingsContext(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error("Settings compound components must be used within Settings.Root");
  }
  return value;
}

function SettingsRoot({ onClose, onReset, visible = true, children }: SettingsRootProps) {
  const contextValue: SettingsContextValue = {
    onClose,
    onReset,
    visible,
  };

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
}

function SettingsBackdrop() {
  const { onClose, visible } = useSettingsContext();
  const className = visible ? "settings-backdrop is-visible" : "settings-backdrop";

  return (
    <button type="button" onClick={onClose} aria-label="Close settings" className={className} />
  );
}

interface SettingsPanelProps {
  children: ReactNode;
  panelRef?: Ref<HTMLElement>;
}

function SettingsPanel({ children, panelRef }: SettingsPanelProps) {
  const { visible } = useSettingsContext();
  const className = visible ? "settings-panel is-visible" : "settings-panel";

  return (
    <aside aria-label="Settings" className={className} ref={panelRef}>
      {children}
    </aside>
  );
}

function SettingsHeader() {
  const { onClose } = useSettingsContext();

  return (
    <div className="settings-header">
      <div className="settings-title">Settings</div>
      <button type="button" onClick={onClose} className="app-button app-button--secondary">
        Close
      </button>
    </div>
  );
}

interface SettingsNumberInputProps {
  id: string;
  label: string;
  value: string;
  min: number;
  step: number;
  onChange: (value: string) => void;
  onCommit: () => void;
}

function SettingsNumberInput({
  id,
  label,
  value,
  min,
  step,
  onChange,
  onCommit,
}: SettingsNumberInputProps) {
  return (
    <div className="settings-field">
      <label className="settings-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="settings-input"
      />
    </div>
  );
}

function SettingsContent({ children }: { children: ReactNode }) {
  return <div className="settings-content">{children}</div>;
}

function SettingsFootnote() {
  return (
    <div className="settings-footnote">
      Settings are saved to localStorage. Only the <b>final</b> letter is checked against recent
      history.
    </div>
  );
}

function SettingsResetButton() {
  const { onReset } = useSettingsContext();

  return (
    <button
      type="button"
      onClick={onReset}
      className="app-button app-button--danger"
      title="Clear stored settings/history and reset"
    >
      Reset App Data
    </button>
  );
}

export const Settings = {
  Root: SettingsRoot,
  Backdrop: SettingsBackdrop,
  Panel: SettingsPanel,
  Header: SettingsHeader,
  Content: SettingsContent,
  NumberInput: SettingsNumberInput,
  Footnote: SettingsFootnote,
  ResetButton: SettingsResetButton,
};
