/// <reference lib="webworker" />

import {
  applyCanvasSize,
  clearToBlack,
  createStars,
  Dot,
  MAX_RENDER_DPR,
  POINTER_MOVE_ACTIVE_MS,
  POINTER_TAP_ACTIVE_MS,
  renderFrame,
  spawnDotNearPointer,
  Star,
  TARGET_FRAME_MS,
} from "./drawingUtils";
import type { WorkerMessage } from "./types";

const workerScope = self as DedicatedWorkerGlobalScope;

let canvas: OffscreenCanvas | null = null;
let context: OffscreenCanvasRenderingContext2D | null = null;
let width = 1;
let height = 1;
let dpr = 1;
let renderDpr = 1;
let isRunning = false;
let rafTimer: number | null = null;
let lastFrameAtMs = 0;

let mouseX = 0;
let mouseY = 0;
let pointerActiveUntilMs = 0;

let stars: Star[] = [];
const dots: Array<Dot | null> = [];

function runLoop() {
  if (!isRunning) {
    return;
  }

  const frameStartMs = performance.now();
  if (lastFrameAtMs === 0 || frameStartMs - lastFrameAtMs >= TARGET_FRAME_MS) {
    renderFrame(
      context,
      width,
      height,
      renderDpr,
      stars,
      dots,
      mouseX,
      mouseY,
      pointerActiveUntilMs,
    );
    lastFrameAtMs = frameStartMs;
  }

  const untilNextFrame = Math.max(0, TARGET_FRAME_MS - (performance.now() - lastFrameAtMs));
  rafTimer = workerScope.setTimeout(runLoop, untilNextFrame);
}

function startLoop() {
  if (isRunning) {
    return;
  }

  isRunning = true;
  lastFrameAtMs = 0;
  runLoop();
}

function stopLoop() {
  isRunning = false;
  if (rafTimer !== null) {
    workerScope.clearTimeout(rafTimer);
    rafTimer = null;
  }
}

workerScope.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  switch (message.type) {
    case "init": {
      canvas = message.canvas;
      context = canvas.getContext("2d", { alpha: false });
      width = message.width;
      height = message.height;
      dpr = message.dpr;
      renderDpr = Math.max(1, Math.min(MAX_RENDER_DPR, dpr));
      mouseX = width / 2;
      mouseY = height / 2;
      pointerActiveUntilMs = 0;
      stars = createStars(width, height);
      dots.length = 0;

      applyCanvasSize(canvas, width, height, renderDpr);
      clearToBlack(context, canvas, width, height, renderDpr);
      startLoop();
      break;
    }

    case "resize": {
      width = message.width;
      height = message.height;
      dpr = message.dpr;
      renderDpr = Math.max(1, Math.min(MAX_RENDER_DPR, dpr));
      applyCanvasSize(canvas, width, height, renderDpr);
      clearToBlack(context, canvas, width, height, renderDpr);
      // Recreate stars to cover the new dimensions
      stars = createStars(width, height);
      break;
    }

    case "pointer-move": {
      mouseX = Math.max(0, Math.min(width, message.x));
      mouseY = Math.max(0, Math.min(height, message.y));
      pointerActiveUntilMs = performance.now() + POINTER_MOVE_ACTIVE_MS;
      break;
    }

    case "pointer-tap": {
      mouseX = Math.max(0, Math.min(width, message.x));
      mouseY = Math.max(0, Math.min(height, message.y));
      pointerActiveUntilMs = performance.now() + POINTER_TAP_ACTIVE_MS;
      spawnDotNearPointer(dots, mouseX, mouseY, true);
      break;
    }

    case "pause": {
      stopLoop();
      break;
    }

    case "resume": {
      startLoop();
      break;
    }
  }
};
