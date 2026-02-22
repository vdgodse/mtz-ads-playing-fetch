import {
  type Config,
  DEFAULT_CONFIG,
  pickFinalLetter,
  persistConfig,
  persistHistory,
  sanitizeDurationMs,
  sanitizeHistorySize,
  sanitizeJitter,
  trimHistory,
} from "./storage";

export type Mode = "idle" | "running" | "settings";

export type MachineContext = {
  config: Config;
  history: string[];
  lastFinalLetter: string | null;
  runDelayMs: number;
  inputs: {
    duration: string;
    jitter: string;
    historySize: string;
  };
  runToken: number;
};

export type MachineState = {
  mode: Mode;
  context: MachineContext;
};

export type MachineEvent =
  | { type: "START" }
  | { type: "STOP" }
  | { type: "OPEN_SETTINGS" }
  | { type: "CLOSE_SETTINGS" }
  | { type: "RESET" }
  | { type: "RUN_FINISHED" }
  | { type: "CHANGE_DURATION_INPUT"; value: string }
  | { type: "COMMIT_DURATION" }
  | { type: "CHANGE_JITTER_INPUT"; value: string }
  | { type: "COMMIT_JITTER" }
  | { type: "CHANGE_HISTORY_SIZE_INPUT"; value: string }
  | { type: "COMMIT_HISTORY_SIZE" };

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function computeRunDelayMs(config: Config): number {
  const jitterOffset = Math.floor(Math.random() * (config.jitter * 2 + 1)) - config.jitter;
  return Math.max(0, config.durationMs + jitterOffset);
}

export function createInitialState(config: Config, history: string[]): MachineState {
  return {
    mode: "idle",
    context: {
      config,
      history,
      lastFinalLetter: null,
      runDelayMs: 0,
      inputs: {
        duration: String(config.durationMs),
        jitter: String(config.jitter),
        historySize: String(config.historySize),
      },
      runToken: 0,
    },
  };
}

export function machineReducer(state: MachineState, event: MachineEvent): MachineState {
  switch (state.mode) {
    case "idle":
      switch (event.type) {
        case "START":
          return {
            ...state,
            mode: "running",
            context: {
              ...state.context,
              runDelayMs: computeRunDelayMs(state.context.config),
              runToken: state.context.runToken + 1,
            },
          };

        case "OPEN_SETTINGS":
          return {
            ...state,
            mode: "settings",
          };

        case "RESET":
          return {
            mode: "idle",
            context: {
              config: DEFAULT_CONFIG,
              history: [],
              lastFinalLetter: null,
              runDelayMs: 0,
              inputs: {
                duration: String(DEFAULT_CONFIG.durationMs),
                jitter: String(DEFAULT_CONFIG.jitter),
                historySize: String(DEFAULT_CONFIG.historySize),
              },
              runToken: state.context.runToken + 1,
            },
          };

        default:
          return state;
      }

    case "running":
      switch (event.type) {
        case "STOP":
        case "OPEN_SETTINGS":
          return {
            ...state,
            mode: event.type === "STOP" ? "idle" : "settings",
            context: {
              ...state.context,
              runToken: state.context.runToken + 1,
            },
          };

        case "RUN_FINISHED": {
          const { historySize } = state.context.config;
          const recentFinals = trimHistory(state.context.history, historySize);
          const chosen = pickFinalLetter(LETTERS, recentFinals);
          const nextHistory = trimHistory([...state.context.history, chosen], historySize);
          persistHistory(nextHistory);

          return {
            ...state,
            mode: "idle",
            context: {
              ...state.context,
              history: nextHistory,
              lastFinalLetter: chosen,
            },
          };
        }

        case "RESET":
          return {
            mode: "idle",
            context: {
              config: DEFAULT_CONFIG,
              history: [],
              lastFinalLetter: null,
              runDelayMs: 0,
              inputs: {
                duration: String(DEFAULT_CONFIG.durationMs),
                jitter: String(DEFAULT_CONFIG.jitter),
                historySize: String(DEFAULT_CONFIG.historySize),
              },
              runToken: state.context.runToken + 1,
            },
          };

        default:
          return state;
      }

    case "settings":
      switch (event.type) {
        case "CLOSE_SETTINGS":
          return {
            ...state,
            mode: "idle",
          };

        case "START":
          return {
            ...state,
            mode: "running",
            context: {
              ...state.context,
              runDelayMs: computeRunDelayMs(state.context.config),
              runToken: state.context.runToken + 1,
            },
          };

        case "RESET":
          return {
            mode: "idle",
            context: {
              config: DEFAULT_CONFIG,
              history: [],
              lastFinalLetter: null,
              runDelayMs: 0,
              inputs: {
                duration: String(DEFAULT_CONFIG.durationMs),
                jitter: String(DEFAULT_CONFIG.jitter),
                historySize: String(DEFAULT_CONFIG.historySize),
              },
              runToken: state.context.runToken + 1,
            },
          };

        case "CHANGE_DURATION_INPUT":
          return {
            ...state,
            context: {
              ...state.context,
              inputs: {
                ...state.context.inputs,
                duration: event.value,
              },
            },
          };

        case "COMMIT_DURATION": {
          const sanitized = sanitizeDurationMs(
            state.context.inputs.duration,
            DEFAULT_CONFIG.durationMs,
          );
          const nextConfig = { ...state.context.config, durationMs: sanitized };
          persistConfig(nextConfig);
          return {
            ...state,
            context: {
              ...state.context,
              config: nextConfig,
              inputs: {
                ...state.context.inputs,
                duration: String(sanitized),
              },
            },
          };
        }

        case "CHANGE_JITTER_INPUT":
          return {
            ...state,
            context: {
              ...state.context,
              inputs: {
                ...state.context.inputs,
                jitter: event.value,
              },
            },
          };

        case "COMMIT_JITTER": {
          const sanitized = sanitizeJitter(state.context.inputs.jitter, DEFAULT_CONFIG.jitter);
          const nextConfig = { ...state.context.config, jitter: sanitized };
          persistConfig(nextConfig);
          return {
            ...state,
            context: {
              ...state.context,
              config: nextConfig,
              inputs: {
                ...state.context.inputs,
                jitter: String(sanitized),
              },
            },
          };
        }

        case "CHANGE_HISTORY_SIZE_INPUT":
          return {
            ...state,
            context: {
              ...state.context,
              inputs: {
                ...state.context.inputs,
                historySize: event.value,
              },
            },
          };

        case "COMMIT_HISTORY_SIZE": {
          const sanitized = sanitizeHistorySize(
            state.context.inputs.historySize,
            DEFAULT_CONFIG.historySize,
          );
          const nextConfig = {
            ...state.context.config,
            historySize: sanitized,
          };
          persistConfig(nextConfig);

          const trimmedHistory = trimHistory(state.context.history, sanitized);
          persistHistory(trimmedHistory);

          return {
            ...state,
            context: {
              ...state.context,
              config: nextConfig,
              history: trimmedHistory,
              inputs: {
                ...state.context.inputs,
                historySize: String(sanitized),
              },
            },
          };
        }

        default:
          return state;
      }

    default:
      return state;
  }
}
