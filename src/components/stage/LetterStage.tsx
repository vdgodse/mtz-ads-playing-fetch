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
    <main id="main-content" className="center-stage-layout" role="main">
      <section className="letter-board-container" aria-labelledby="letter-display-heading">
        <h1 id="letter-display-heading" className="visually-hidden">
          Letter Display
        </h1>
        <div className="letter-display-stage">
          <div
            ref={currentLetterRef}
            className="active-letter-glyph"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={isRunning ? "Shuffling letters" : `Current letter: ${currentLetter}`}
          >
            {currentLetter}
          </div>
          <div className="reload-action-row">
            <button
              ref={startButtonRef}
              type="button"
              onClick={onStart}
              disabled={isRunning}
              className="app-button app-button--primary"
              aria-label={isRunning ? "Shuffling in progress" : "Shuffle to pick a new letter"}
              aria-busy={isRunning}
            >
              <ReloadIcon />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
