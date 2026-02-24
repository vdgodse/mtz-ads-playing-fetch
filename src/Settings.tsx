import { createContext, type ReactNode, type Ref, useContext } from "react";
import styles from "./Settings.module.scss";

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

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

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
  const className = cx(styles.settingsBackdrop, visible && styles.isVisible);

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
  const className = cx(styles.settingsPanel, visible && styles.isVisible);

  return (
    <aside aria-label="Settings" className={className} ref={panelRef}>
      {children}
    </aside>
  );
}

function SettingsHeader() {
  const { onClose } = useSettingsContext();

  return (
    <div className={styles.settingsHeader}>
      <div className={styles.settingsTitle}>Settings</div>
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
    <div className={styles.settingsField}>
      <label className={styles.settingsLabel} htmlFor={id}>
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
        className={styles.settingsInput}
      />
    </div>
  );
}

function SettingsContent({ children }: { children: ReactNode }) {
  return <div className={styles.settingsContent}>{children}</div>;
}

function SettingsFootnote() {
  return (
    <div className={styles.settingsFootnote}>
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
