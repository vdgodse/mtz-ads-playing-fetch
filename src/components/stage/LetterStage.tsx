import type { MutableRefObject } from "react";

import { ReloadIcon } from "../icons/ReloadIcon";

interface LetterStageProps {
  currentLetter: string;
  isRunning: boolean;
  onStart: () => void;
  startButtonRef: MutableRefObject<HTMLButtonElement | null>;
  currentLetterRef: MutableRefObject<HTMLDivElement | null>;
}

export function LetterStage({
  currentLetter,
  isRunning,
  onStart,
  startButtonRef,
  currentLetterRef,
}: LetterStageProps) {
  return (
    <main className="center-stage-layout">
      <section className="letter-board-container">
        <article className="letter-display-stage">
          <div ref={currentLetterRef} className="active-letter-glyph">
            {currentLetter}
          </div>
          <div className="reload-action-row">
            <button
              ref={startButtonRef}
              type="button"
              onClick={onStart}
              disabled={isRunning}
              className="app-button app-button--primary"
              aria-label="Reload"
            >
              <ReloadIcon />
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
