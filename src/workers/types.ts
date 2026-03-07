export type InitMessage = {
  type: "init";
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  dpr: number;
};

export type ResizeMessage = {
  type: "resize";
  width: number;
  height: number;
  dpr: number;
};

export type PointerMoveMessage = {
  type: "pointer-move";
  x: number;
  y: number;
};

export type PointerTapMessage = {
  type: "pointer-tap";
  x: number;
  y: number;
};

export type WorkerMessage =
  | InitMessage
  | ResizeMessage
  | PointerMoveMessage
  | PointerTapMessage
  | { type: "pause" }
  | { type: "resume" };
