import { useEffect, type RefObject } from "react";

export function useFocusWhen({
  when,
  targetRef,
}: {
  when: boolean;
  targetRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    if (!when) return;

    targetRef.current?.focus();
  }, [when, targetRef]);
}
