import type { ReactNode } from "react";
import { topBarActionsStyle, topBarStyle } from "../styles";

interface TopBarProps {
  children?: ReactNode;
}

export function TopBar({ children }: TopBarProps) {
  return (
    <header style={topBarStyle}>
      <div style={topBarActionsStyle}>{children}</div>
    </header>
  );
}
