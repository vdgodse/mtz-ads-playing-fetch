import { topBarActionsStyle, topBarStyle, settingsToggleButtonStyle } from "../styles";

interface TopBarProps {
  isSettingsOpen: boolean;
  onSettingsClick: () => void;
}

export function TopBar({ isSettingsOpen, onSettingsClick }: TopBarProps) {
  return (
    <header style={topBarStyle}>
      <div style={topBarActionsStyle}>
        <button
          type="button"
          onClick={onSettingsClick}
          style={settingsToggleButtonStyle(isSettingsOpen)}
          title="Settings"
          aria-hidden={isSettingsOpen}
          tabIndex={isSettingsOpen ? -1 : 0}
        >
          Settings
        </button>
      </div>
    </header>
  );
}
