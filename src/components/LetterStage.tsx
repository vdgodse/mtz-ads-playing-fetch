import type { MutableRefObject } from "react";

import { ReloadIcon } from "../ReloadIcon";
import {
	activeLetterGlyphStyle,
	buttonStyle,
	centerStageLayoutStyle,
	letterBoardContainerStyle,
	letterDisplayStageStyle,
	reloadActionRowStyle,
} from "../styles";

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
		<main style={centerStageLayoutStyle}>
			<section style={letterBoardContainerStyle}>
				<article style={letterDisplayStageStyle}>
					<div ref={currentLetterRef} style={activeLetterGlyphStyle}>
						{currentLetter}
					</div>
					<div style={reloadActionRowStyle}>
						<button
							ref={startButtonRef}
							type="button"
							onClick={onStart}
							disabled={isRunning}
							style={buttonStyle("primary", isRunning)}
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
