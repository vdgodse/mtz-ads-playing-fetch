import { createContext, type ReactNode, useContext, type CSSProperties } from "react";

import { buttonStyle } from "./styles";

interface SettingsRootProps {
  onClose: () => void;
  onReset: () => void;
  children: ReactNode;
}

type SettingsContextValue = {
  onClose: () => void;
  onReset: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function useSettingsContext(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error("Settings compound components must be used within Settings.Root");
  }
  return value;
}

function SettingsRoot({ onClose, onReset, children }: SettingsRootProps) {
  const contextValue: SettingsContextValue = {
    onClose,
    onReset,
  };

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
}

function SettingsBackdrop() {
  const { onClose } = useSettingsContext();

  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close settings"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "brightness(0.85)",
        border: "none",
        padding: 0,
        margin: 0,
        cursor: "pointer",
      }}
    />
  );
}

function SettingsPanel({ children }: { children: ReactNode }) {
  return (
    <aside
      aria-label="Settings"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        zIndex: 21,
        height: "100vh",
        width: "min(420px, 92vw)",
        background: "rgba(15, 20, 40, 0.98)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.45)",
        padding: 18,
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: 14,
      }}
    >
      {children}
    </aside>
  );
}

function SettingsHeader() {
  const { onClose } = useSettingsContext();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ fontWeight: 700, letterSpacing: 0.2 }}>Settings</div>
      <button type="button" onClick={onClose} style={buttonStyle("secondary")}>
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
    <div style={{ display: "grid", gap: 6 }}>
      <label style={labelStyle} htmlFor={id}>
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
        style={inputStyle}
      />
    </div>
  );
}

function SettingsContent({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gap: 12, alignContent: "start" }}>{children}</div>;
}

function SettingsFootnote() {
  return (
    <div style={{ fontSize: 12, opacity: 0.7 }}>
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
      style={buttonStyle("danger")}
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

const labelStyle: CSSProperties = {
  fontSize: 12,
  opacity: 0.85,
};

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255, 255, 255, 0.14)",
  background: "rgba(0,0,0,0.25)",
  color: "#e7e9ee",
  outline: "none",
};
