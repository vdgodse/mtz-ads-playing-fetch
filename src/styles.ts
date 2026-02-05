import type React from "react";

export function buttonStyle(
  variant: "primary" | "secondary" | "danger",
  disabled?: boolean,
): React.CSSProperties {
  const base: React.CSSProperties = {
    appearance: "none",
    border: "1px solid rgba(255, 255, 255, 0.14)",
    borderRadius: 12,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.08)",
    color: "#e7e9ee",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    opacity: disabled ? 0.5 : 1,
    outline: "white thin",
  };

  if (variant === "primary") {
    return {
      ...base,
      border: "1px solid rgba(255, 255, 255, 0.45)",
    };
  }

  if (variant === "danger") {
    return {
      ...base,
      border: "1px solid rgba(255, 90, 90, 0.45)",
    };
  }

  return base;
}
