import { useEffect, useReducer, type RefObject } from "react";

type ActivityMode = "visible" | "hidden";

type ExitAnimationState = {
  activityMode: ActivityMode;
  isVisible: boolean;
};

type ExitAnimationAction =
  | { type: "OPEN" }
  | { type: "START_CLOSING" }
  | { type: "FINISH_CLOSING" };

function exitAnimationReducer(
  state: ExitAnimationState,
  action: ExitAnimationAction,
): ExitAnimationState {
  switch (action.type) {
    case "OPEN":
      return { activityMode: "visible", isVisible: true };
    case "START_CLOSING":
      return { ...state, isVisible: false };
    case "FINISH_CLOSING":
      return { activityMode: "hidden", isVisible: false };
    default:
      return state;
  }
}

/**
 * Manages the visibility and Activity mode state for animated overlays.
 *
 * This hook coordinates React's Activity component (for keeping DOM mounted)
 * with CSS animations. It waits for exit animations to complete before
 * transitioning the Activity mode to "hidden", preventing abrupt unmounting.
 *
 * @param isOpen - Whether the overlay should be open
 * @param panelRef - Ref to the animated panel element
 * @returns Object containing activityMode and isVisible states
 *
 * @example
 * ```tsx
 * const panelRef = useRef<HTMLElement>(null);
 * const { activityMode, isVisible } = useExitAnimation(isSettingsOpen, panelRef);
 *
 * return (
 *   <Activity mode={activityMode}>
 *     <Panel ref={panelRef} visible={isVisible}>...</Panel>
 *   </Activity>
 * );
 * ```
 */
export function useExitAnimation(
  isOpen: boolean,
  panelRef: RefObject<HTMLElement | null>,
): ExitAnimationState {
  const [state, dispatch] = useReducer(exitAnimationReducer, {
    activityMode: isOpen ? "visible" : "hidden",
    isVisible: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      dispatch({ type: "OPEN" });
      return;
    }

    dispatch({ type: "START_CLOSING" });

    let isCancelled = false;
    let stopWaiting: (() => void) | null = null;

    const waitForExitAnimation = async () => {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      await new Promise<void>((resolve) => {
        let settled = false;

        const settle = () => {
          if (settled) return;
          settled = true;
          panel.removeEventListener("animationend", handleAnimationEnd);
          panel.removeEventListener("animationcancel", handleAnimationCancel);
          resolve();
        };

        const handleAnimationEnd = (event: AnimationEvent) => {
          if (event.target === panel) {
            settle();
          }
        };

        const handleAnimationCancel = (event: AnimationEvent) => {
          if (event.target === panel) {
            settle();
          }
        };

        panel.addEventListener("animationend", handleAnimationEnd);
        panel.addEventListener("animationcancel", handleAnimationCancel);
        stopWaiting = settle;

        const computed = window.getComputedStyle(panel);
        const animationName = computed.animationName;

        if (!animationName || animationName === "none") {
          settle();
        }
      });
    };

    void waitForExitAnimation().finally(() => {
      if (!isCancelled) {
        dispatch({ type: "FINISH_CLOSING" });
      }
    });

    return () => {
      isCancelled = true;
      stopWaiting?.();
    };
  }, [isOpen, panelRef]);

  return state;
}
