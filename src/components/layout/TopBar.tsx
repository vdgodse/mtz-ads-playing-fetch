import type { ReactNode } from "react";

interface TopBarProps {
  children?: ReactNode;
}

export function TopBar({ children }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar-actions">{children}</div>
    </header>
  );
}
