import { useEffect } from "react";

export function useVisibilityPause(onPause: () => void, onResume: () => void) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onPause();
      } else {
        onResume();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onPause, onResume]);
}
