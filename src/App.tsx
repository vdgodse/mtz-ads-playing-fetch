import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import { useEscapeKey } from "./hooks/useEscapeKey";
import { useRunningLoop } from "./hooks/useRunningLoop";
import { createInitialState, machineReducer } from "./machine";
import { ReloadIcon } from "./ReloadIcon";
import { Settings } from "./Settings";
import { loadInitialState, resetPersistentStorage } from "./storage";
import { buttonStyle } from "./styles";
import { randomFrom } from "./utils";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function App() {
	const initial = useMemo(() => loadInitialState(), []);

	const [state, dispatch] = useReducer(
		machineReducer,
		createInitialState(initial.config, initial.history),
	);

	const [currentLetter, setCurrentLetter] = useState(() => randomFrom(LETTERS));

	const startButtonRef = useRef<HTMLButtonElement | null>(null);
	const currentLetterRef = useRef<HTMLDivElement | null>(null);

	// Focus Start button when entering idle mode
	useEffect(() => {
		if (state.mode === "idle") {
			startButtonRef.current?.focus();
		}
	}, [state.mode]);

	// Handle running mode: RAF + timeout
	useRunningLoop({
		mode: state.mode,
		runToken: state.context.runToken,
		config: state.context.config,
		history: state.context.history,
		letterRef: currentLetterRef,
		setCurrentLetter,
		dispatch,
	});

	// Handle Escape key in settings
	useEscapeKey(state.mode === "settings", () =>
		dispatch({ type: "CLOSE_SETTINGS" }),
	);

	function handleStart() {
		dispatch({ type: "START" });
	}

	function handleSettingsClick() {
		if (state.mode === "running") {
			dispatch({ type: "STOP" });
			dispatch({ type: "OPEN_SETTINGS" });
		} else if (state.mode === "settings") {
			dispatch({ type: "CLOSE_SETTINGS" });
		} else {
			dispatch({ type: "OPEN_SETTINGS" });
		}
	}

	function handleReset() {
		resetPersistentStorage();
		setCurrentLetter(randomFrom(LETTERS));
		dispatch({ type: "RESET" });
	}

	return (
		<div
			style={{
				minHeight: "100vh",
				display: "grid",
				gridTemplateRows: "auto 1fr",
				padding: 24,
				fontFamily:
					"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
				color: "#e7e9ee",
    			backgroundImage: "linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)",
    			animation: "gradientAnimation 12s ease infinite",
    			backgroundSize: "400% 400%",
			}}
		>
			<header
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "flex-end",
					gap: 12,
				}}
			>
				<div style={{ display: "flex", gap: 10, alignItems: "center" }}>
					<button
						type="button"
						onClick={handleSettingsClick}
						style={buttonStyle("secondary")}
						title="Settings"
					>
						Settings
					</button>
				</div>
			</header>

			<main
				style={{
					display: "grid",
					placeItems: "center",
					gap: 18,
				}}
			>
				<div
					style={{
						width: "min(720px, 100%)",
						padding: 18,
					}}
				>
					<div
						style={{
							display: "grid",
							placeItems: "center",
							padding: "28px 12px",
							contentVisibility: "auto",
						}}
					>
						<div
							ref={currentLetterRef}
							style={{
								fontSize: 320,
								fontWeight: 800,
								letterSpacing: 6,
								lineHeight: 1,
								textShadow: "0 12px 40px rgba(0,0,0,0.45)",
								userSelect: "none",
							}}
						>
							{currentLetter}
						</div>
						<div style={{ marginTop: 60 }}>
							<button
								ref={startButtonRef}
								type="button"
								onClick={handleStart}
								disabled={state.mode === "running"}
								style={buttonStyle("primary", state.mode === "running")}
								aria-label="Reload"
							>
								<ReloadIcon />
							</button>
						</div>
					</div>
				</div>
			</main>

			<Settings
				isOpen={state.mode === "settings"}
				isRunning={state.mode === "running"}
				durationInput={state.context.inputs.duration}
				jitterInput={state.context.inputs.jitter}
				historySizeInput={state.context.inputs.historySize}
				onClose={() => dispatch({ type: "CLOSE_SETTINGS" })}
				onDurationChange={(value) =>
					dispatch({ type: "CHANGE_DURATION_INPUT", value })
				}
				onDurationCommit={() => dispatch({ type: "COMMIT_DURATION" })}
				onJitterChange={(value) =>
					dispatch({ type: "CHANGE_JITTER_INPUT", value })
				}
				onJitterCommit={() => dispatch({ type: "COMMIT_JITTER" })}
				onHistorySizeChange={(value) =>
					dispatch({ type: "CHANGE_HISTORY_SIZE_INPUT", value })
				}
				onHistorySizeCommit={() => dispatch({ type: "COMMIT_HISTORY_SIZE" })}
				onReset={handleReset}
			/>
		</div>
	);
}

export default App;
