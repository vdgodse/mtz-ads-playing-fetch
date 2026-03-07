import { useEffect } from "react";

export function useKeydown({
  keys,
  when,
  onKeydown,
}: {
  keys: Set<string>;
  when: boolean;
  onKeydown: () => void;
}) {
  useEffect(() => {
    if (!when) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (keys.has(e.key)) {
        onKeydown();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keys, when, onKeydown]);
}
