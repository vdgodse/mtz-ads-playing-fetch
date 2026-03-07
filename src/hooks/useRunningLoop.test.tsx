import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useRef, useReducer, useEffect } from "react";
import { useRunningLoop } from "./useRunningLoop";
import { machineReducer, createInitialState } from "../state/machine";
import type { MachineState } from "../state/machine";
import { DEFAULT_CONFIG } from "../state/storage";

/**
 * Test suite for useRunningLoop race conditions.
 *
 * The original bug: RAF ticks could fire AFTER RUN_FINISHED was dispatched,
 * overwriting the final letter that the state machine had picked via pickFinalLetter().
 *
 * The fix: Cancel the RAF tick BEFORE dispatching RUN_FINISHED to prevent
 * any pending animation frame from running after the state transition.
 */

// Mock randomFrom to return predictable values
let mockRandomIndex = 0;
const mockLetterSequence = ["X", "Y", "Z", "W", "V", "U", "T", "S", "R", "Q"];

vi.mock("../utils/random", () => ({
  randomFrom: vi.fn(() => {
    const letter = mockLetterSequence[mockRandomIndex % mockLetterSequence.length];
    mockRandomIndex++;
    return letter;
  }),
}));

// Mock localStorage for state persistence
vi.mock("../state/storage", async (importOriginal) => {
  const original = await importOriginal<typeof import("../state/storage")>();
  return {
    ...original,
    persistState: vi.fn(),
  };
});

interface TestHarnessProps {
  startRunning?: boolean;
  delayMs?: number;
  onLetterChange?: (letter: string) => void;
  onStateChange?: (state: MachineState) => void;
}

/**
 * Test harness component that integrates useRunningLoop with the real state machine.
 * This mirrors how App.tsx uses the hook.
 */
function TestHarness({
  startRunning = false,
  delayMs = 100,
  onLetterChange,
  onStateChange,
}: TestHarnessProps) {
  const letterRef = useRef<HTMLDivElement>(null);

  const [state, dispatch] = useReducer(machineReducer, undefined, () => {
    const initial = createInitialState(DEFAULT_CONFIG, [], "A");
    // If we need to start running, apply START event
    if (startRunning) {
      return machineReducer(initial, { type: "START" });
    }
    return initial;
  });

  // Report state changes to test
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  useRunningLoop({
    mode: state.mode,
    runToken: state.context.runToken,
    delayMs,
    letterRef,
    dispatch,
    ...(onLetterChange && { onLetterChange }),
  });

  return (
    <div>
      <div ref={letterRef} data-testid="letter-display">
        {state.context.lastFinalLetter}
      </div>
      <div data-testid="mode">{state.mode}</div>
      <button type="button" data-testid="start-btn" onClick={() => dispatch({ type: "START" })}>
        Start
      </button>
      <button type="button" data-testid="stop-btn" onClick={() => dispatch({ type: "STOP" })}>
        Stop
      </button>
    </div>
  );
}

describe("useRunningLoop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockRandomIndex = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should not animate when mode is idle", async () => {
      const onLetterChange = vi.fn();

      render(<TestHarness startRunning={false} onLetterChange={onLetterChange} />);

      // Advance time and RAF
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(onLetterChange).not.toHaveBeenCalled();
      expect(screen.getByTestId("mode").textContent).toBe("idle");
    });

    it("should animate letters when mode is running", async () => {
      const onLetterChange = vi.fn();

      render(<TestHarness startRunning={true} delayMs={1000} onLetterChange={onLetterChange} />);

      expect(screen.getByTestId("mode").textContent).toBe("running");

      // Advance time to allow RAF ticks
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(onLetterChange).toHaveBeenCalled();
    });

    it("should update the DOM element with random letters during animation", async () => {
      render(<TestHarness startRunning={true} delayMs={1000} />);

      const letterDisplay = screen.getByTestId("letter-display");
      const initialContent = letterDisplay.textContent;

      // Advance time to trigger RAF updates
      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      // The textContent should have been updated by RAF to a letter from mock sequence
      expect(letterDisplay.textContent).not.toBe(initialContent);
      expect(mockLetterSequence).toContain(letterDisplay.textContent);
    });

    it("should dispatch RUN_FINISHED when delay expires", async () => {
      render(<TestHarness startRunning={true} delayMs={100} />);

      expect(screen.getByTestId("mode").textContent).toBe("running");

      // Advance past the delay
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(screen.getByTestId("mode").textContent).toBe("idle");
    });
  });

  describe("race condition prevention: RAF tick after RUN_FINISHED", () => {
    /**
     * Critical test: This is the exact race condition that was fixed.
     *
     * Scenario:
     * 1. RAF tick schedules itself via requestAnimationFrame
     * 2. Timeout fires, state machine picks final letter via pickFinalLetter()
     * 3. A pending RAF tick fires AFTER dispatch
     * 4. RAF tick overwrites DOM with random letter
     * 5. User sees wrong letter - MISMATCH!
     *
     * The fix ensures RAF is cancelled BEFORE dispatch.
     */
    it("should not overwrite final letter after RUN_FINISHED dispatch", async () => {
      const letterChanges: string[] = [];
      const onLetterChange = (letter: string) => {
        letterChanges.push(letter);
      };

      render(<TestHarness startRunning={true} delayMs={100} onLetterChange={onLetterChange} />);

      // Let animation run for a bit
      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      const changesBeforeFinish = letterChanges.length;
      expect(changesBeforeFinish).toBeGreaterThan(0);

      // Fire the timeout (RUN_FINISHED)
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // State should be idle now
      expect(screen.getByTestId("mode").textContent).toBe("idle");

      // Record letter changes at this point
      const changesAtFinish = letterChanges.length;

      // Try to trigger more RAF ticks after dispatch
      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      // No additional letter changes should have occurred after RUN_FINISHED
      expect(letterChanges.length).toBe(changesAtFinish);
    });

    it("should cancel RAF before dispatching to prevent stale updates", async () => {
      const rafUpdateTimes: number[] = [];
      let currentTime = 0;

      const onLetterChange = () => {
        rafUpdateTimes.push(currentTime);
      };

      render(<TestHarness startRunning={true} delayMs={100} onLetterChange={onLetterChange} />);

      // Advance in small increments to track timing precisely
      for (let i = 0; i < 20; i++) {
        await act(async () => {
          vi.advanceTimersByTime(10);
          currentTime += 10;
        });
      }

      // All RAF updates should have stopped at or before 100ms (the timeout)
      const updatesAfterTimeout = rafUpdateTimes.filter((t) => t > 100);
      expect(updatesAfterTimeout.length).toBe(0);
    });

    it("should ensure displayed letter matches state letter after completion", async () => {
      let capturedState: MachineState | undefined;

      render(
        <TestHarness
          startRunning={true}
          delayMs={50}
          onStateChange={(s) => {
            capturedState = s;
          }}
        />,
      );

      // Complete the run
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode").textContent).toBe("idle");

      const letterDisplay = screen.getByTestId("letter-display");
      const displayedLetter = letterDisplay.textContent;
      const stateLetter = capturedState?.context.lastFinalLetter;

      // This is the key assertion - after RUN_FINISHED, displayed letter must match state
      // If RAF overwrote after dispatch, these would mismatch
      expect(displayedLetter).toBe(stateLetter);
    });
  });

  describe("cleanup and mode transitions", () => {
    it("should stop animation when stopped via STOP action", async () => {
      const onLetterChange = vi.fn();

      render(<TestHarness startRunning={true} delayMs={1000} onLetterChange={onLetterChange} />);

      // Let it animate
      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      const callsBeforeStop = onLetterChange.mock.calls.length;
      expect(callsBeforeStop).toBeGreaterThan(0);

      // Click stop
      await act(async () => {
        screen.getByTestId("stop-btn").click();
      });

      expect(screen.getByTestId("mode").textContent).toBe("idle");

      // Clear the call count tracking
      onLetterChange.mockClear();

      // Advance time - no more updates should occur
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(onLetterChange).not.toHaveBeenCalled();
    });

    it("should handle rapid start/stop cycles without race conditions", async () => {
      render(<TestHarness startRunning={false} delayMs={50} />);

      const startBtn = screen.getByTestId("start-btn");
      const stopBtn = screen.getByTestId("stop-btn");

      // Rapid cycle: start -> stop -> start
      await act(async () => {
        startBtn.click();
      });

      expect(screen.getByTestId("mode").textContent).toBe("running");

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      await act(async () => {
        stopBtn.click();
      });

      expect(screen.getByTestId("mode").textContent).toBe("idle");

      await act(async () => {
        startBtn.click();
      });

      expect(screen.getByTestId("mode").textContent).toBe("running");

      // Let the final run complete
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Should be back to idle after completion
      expect(screen.getByTestId("mode").textContent).toBe("idle");
    });

    it("should not dispatch RUN_FINISHED from stale timeout after stop", async () => {
      const transitions: string[] = [];

      render(
        <TestHarness
          startRunning={true}
          delayMs={100}
          onStateChange={(state) => {
            transitions.push(state.mode);
          }}
        />,
      );

      // Advance partially
      await act(async () => {
        vi.advanceTimersByTime(30);
      });

      // Stop manually (this increments runToken, invalidating old timeout)
      await act(async () => {
        screen.getByTestId("stop-btn").click();
      });

      const transitionsAtStop = transitions.length;

      // Advance past original timeout time
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // No additional transitions should have occurred from stale timeout
      expect(transitions.length).toBe(transitionsAtStop);
    });
  });

  describe("edge cases", () => {
    it("should handle zero delay without errors", async () => {
      render(<TestHarness startRunning={true} delayMs={0} />);

      // Advance minimally
      await act(async () => {
        vi.advanceTimersByTime(16); // One frame
      });

      expect(screen.getByTestId("mode").textContent).toBe("idle");
    });

    it("should handle very short delay without RAF overwriting final letter", async () => {
      const letterChanges: string[] = [];

      render(
        <TestHarness
          startRunning={true}
          delayMs={5}
          onLetterChange={(l) => letterChanges.push(l)}
        />,
      );

      // Fire timeout
      await act(async () => {
        vi.advanceTimersByTime(20);
      });

      expect(screen.getByTestId("mode").textContent).toBe("idle");

      const changesAtFinish = letterChanges.length;

      // Try to trigger more RAF
      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      // No additional changes after finish
      expect(letterChanges.length).toBe(changesAtFinish);
    });

    it("should handle component unmount during animation", async () => {
      const onLetterChange = vi.fn();

      const { unmount } = render(
        <TestHarness startRunning={true} delayMs={1000} onLetterChange={onLetterChange} />,
      );

      // Let it animate briefly
      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      const callsBeforeUnmount = onLetterChange.mock.calls.length;

      // Unmount
      unmount();

      // Advance time
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // No more calls after unmount
      expect(onLetterChange.mock.calls.length).toBe(callsBeforeUnmount);
    });
  });

  describe("state machine integration", () => {
    it("should pick a final letter via pickFinalLetter when run completes", async () => {
      let capturedState: MachineState | undefined;

      render(
        <TestHarness
          startRunning={true}
          delayMs={50}
          onStateChange={(s) => {
            capturedState = s;
          }}
        />,
      );

      // Complete the run
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // State should have a final letter (picked by mocked randomFrom)
      expect(capturedState?.context.lastFinalLetter).toBeDefined();
      expect(capturedState?.context.lastFinalLetter.length).toBe(1);
    });

    it("should add final letter to history after run completes", async () => {
      let capturedState: MachineState | undefined;

      render(
        <TestHarness
          startRunning={true}
          delayMs={50}
          onStateChange={(s) => {
            capturedState = s;
          }}
        />,
      );

      // Complete the run
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode").textContent).toBe("idle");

      // History should have the final letter
      expect(capturedState?.context.history.length).toBe(1);
      expect(capturedState?.context.history[0]).toBe(capturedState?.context.lastFinalLetter);
    });
  });
});
