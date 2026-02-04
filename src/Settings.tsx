import type React from "react";

import { buttonStyle } from "./styles";

interface SettingsProps {
	isOpen: boolean;
	isRunning: boolean;
	durationInput: string;
	jitterInput: string;
	historySizeInput: string;
	onClose: () => void;
	onDurationChange: (value: string) => void;
	onDurationCommit: () => void;
	onJitterChange: (value: string) => void;
	onJitterCommit: () => void;
	onHistorySizeChange: (value: string) => void;
	onHistorySizeCommit: () => void;
	onReset: () => void;
}

export function Settings({
	isOpen,
	isRunning,
	durationInput,
	jitterInput,
	historySizeInput,
	onClose,
	onDurationChange,
	onDurationCommit,
	onJitterChange,
	onJitterCommit,
	onHistorySizeChange,
	onHistorySizeCommit,
	onReset,
}: SettingsProps) {
	if (!isOpen) return null;

	return (
		<>
			<button
				type="button"
				onClick={onClose}
				aria-label="Close settings"
				style={{
					position: "fixed",
					inset: 0,
					background: "rgba(0, 0, 0, 0.55)",
					backdropFilter: "blur(2px)",
					border: "none",
					padding: 0,
					margin: 0,
					cursor: "pointer",
				}}
			/>
			<aside
				aria-label="Settings"
				style={{
					position: "fixed",
					top: 0,
					right: 0,
					height: "100vh",
					width: "min(420px, 92vw)",
					background: "rgba(15, 20, 40, 0.98)",
					borderLeft: "1px solid rgba(255, 255, 255, 0.10)",
					boxShadow: "-20px 0 60px rgba(0,0,0,0.45)",
					padding: 18,
					display: "grid",
					gridTemplateRows: "auto 1fr",
					gap: 14,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 12,
					}}
				>
					<div style={{ fontWeight: 700, letterSpacing: 0.2 }}>Settings</div>
					<button
						type="button"
						onClick={onClose}
						style={buttonStyle("secondary")}
					>
						Close
					</button>
				</div>

				<div style={{ display: "grid", gap: 12, alignContent: "start" }}>
					<div style={{ display: "grid", gap: 6 }}>
						<label style={labelStyle} htmlFor="duration">
							Stop-after duration (ms) — min 1500
						</label>
						<input
							id="duration"
							type="number"
							min={1500}
							step={100}
							disabled={isRunning}
							value={durationInput}
							onChange={(e) => onDurationChange(e.target.value)}
							onBlur={onDurationCommit}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									(e.target as HTMLInputElement).blur();
								}
							}}
							style={inputStyle}
						/>
					</div>

					<div style={{ display: "grid", gap: 6 }}>
						<label style={labelStyle} htmlFor="jitter">
							Jitter (± ms) — default 200
						</label>
						<input
							id="jitter"
							type="number"
							min={0}
							step={10}
							disabled={isRunning}
							value={jitterInput}
							onChange={(e) => onJitterChange(e.target.value)}
							onBlur={onJitterCommit}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									(e.target as HTMLInputElement).blur();
								}
							}}
							style={inputStyle}
						/>
					</div>

					<div style={{ display: "grid", gap: 6 }}>
						<label style={labelStyle} htmlFor="historySize">
							Recent finals to avoid — min 0
						</label>
						<input
							id="historySize"
							type="number"
							min={0}
							step={1}
							disabled={isRunning}
							value={historySizeInput}
							onChange={(e) => onHistorySizeChange(e.target.value)}
							onBlur={onHistorySizeCommit}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									(e.target as HTMLInputElement).blur();
								}
							}}
							style={inputStyle}
						/>
					</div>

					<div style={{ fontSize: 12, opacity: 0.7 }}>
						Settings are saved to localStorage. Only the <b>final</b> letter is
						checked against recent history.
					</div>
					<button
						type="button"
						onClick={onReset}
						style={buttonStyle("danger")}
						title="Clear stored settings/history and reset"
					>
						Reset App Data
					</button>
				</div>
			</aside>
		</>
	);
}

const labelStyle: React.CSSProperties = {
	fontSize: 12,
	opacity: 0.85,
};

const inputStyle: React.CSSProperties = {
	padding: "10px 12px",
	borderRadius: 10,
	border: "1px solid rgba(255, 255, 255, 0.14)",
	background: "rgba(0,0,0,0.25)",
	color: "#e7e9ee",
	outline: "none",
};
