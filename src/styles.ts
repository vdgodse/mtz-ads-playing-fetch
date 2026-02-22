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

export function settingsToggleButtonStyle(isHidden: boolean): React.CSSProperties {
  return {
    ...buttonStyle("secondary"),
    visibility: isHidden ? "hidden" : "visible",
  };
}

export const appViewportShellStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateRows: "auto 1fr",
  padding: 24,
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
  color: "#e7e9ee",
  backgroundImage: "linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)",
  animation: "gradientAnimation 16s linear infinite",
  backgroundSize: "400% 400%",
};

export const ambientNoiseOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 0,
  opacity: 0.11,
  mixBlendMode: "overlay",
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='128' height='128' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
  backgroundRepeat: "repeat",
  backgroundSize: "128px 128px",
};

export const topBarStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 12,
};

export const topBarActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
};

export const centerStageLayoutStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  placeItems: "center",
  gap: 18,
};

export const letterBoardContainerStyle: React.CSSProperties = {
  width: "min(720px, 100%)",
  padding: 18,
};

export const letterDisplayStageStyle: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  padding: "28px 12px",
  contentVisibility: "auto",
};

export const activeLetterGlyphStyle: React.CSSProperties = {
  fontSize: 320,
  fontWeight: 800,
  letterSpacing: 6,
  lineHeight: 1,
  textShadow: "0 12px 40px rgba(0,0,0,0.45)",
  userSelect: "none",
};

export const reloadActionRowStyle: React.CSSProperties = {
  marginTop: 60,
};
