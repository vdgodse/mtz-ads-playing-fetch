export const MAX_RENDER_DPR = 1.25;
export const TARGET_FRAME_MS = 1000 / 45;
export const INIT_STARS_POPULATION = 80;
export const DOTS_MIN_DIST = 2;
export const MAX_DOTS = 180;
export const POINTER_MOVE_ACTIVE_MS = 100;
export const POINTER_TAP_ACTIVE_MS = 260;
export const HUE_CYCLE_DEGREES_PER_MS = 0.00015;
export const OVERLAY_PULSE_MS = 30_000;
export const BASE_HUE = 245;
export const HUE_SWING = 8;
export const STAR_HUE_VARIATION = 14;
export const DOT_HUE_VARIATION = 20;

export const params = {
  maxDistFromCursor: 50,
  dotsSpeed: 0,
  backgroundSpeed: 0,
};

export function toRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

export function hueInBluePurpleBand(base: number, offset = 0) {
  const hue = base + offset;
  if (hue < 0) {
    return hue + 360;
  }
  if (hue >= 360) {
    return hue - 360;
  }
  return hue;
}

export function applyCanvasSize(
  canvas: OffscreenCanvas | null,
  width: number,
  height: number,
  renderDpr: number,
) {
  if (!canvas) {
    return;
  }

  canvas.width = Math.max(1, Math.floor(width * renderDpr));
  canvas.height = Math.max(1, Math.floor(height * renderDpr));
}

export function clearToBlack(
  context: OffscreenCanvasRenderingContext2D | null,
  canvas: OffscreenCanvas | null,
  width: number,
  height: number,
  renderDpr: number,
) {
  if (!context || !canvas) {
    return;
  }

  context.setTransform(renderDpr, 0, 0, renderDpr, 0, 0);
  context.globalCompositeOperation = "source-over";
  context.shadowBlur = 0;
  context.fillStyle = "hsl(245, 52%, 12%)";
  context.fillRect(0, 0, Math.max(1, width), Math.max(1, height));
}

export function drawCircle(
  context: OffscreenCanvasRenderingContext2D | null,
  x: number,
  y: number,
  r: number,
) {
  if (!context) {
    return;
  }

  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2, false);
  context.closePath();
  context.fill();
}

export class Star {
  private x = 0;
  private y = 0;
  private r = 1;
  private alpha = 0.2;
  private hueOffset = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.r = Math.floor(Math.random() * 2) + 1;
    this.alpha = (Math.floor(Math.random() * 10) + 1) / 20;
    this.hueOffset = Math.random() * STAR_HUE_VARIATION * 2 - STAR_HUE_VARIATION;
  }

  move(context: OffscreenCanvasRenderingContext2D | null, baseHue: number, height: number) {
    if (!context) {
      return;
    }

    this.y -= 0.15 + params.backgroundSpeed / 100;
    if (this.y <= -10) {
      this.y = height + 10;
      this.x = Math.random() * height; // Note: This uses the passed width
    }

    const hue = (baseHue + this.hueOffset + 360) % 360;
    context.fillStyle = `hsla(${hue},70%,74%,${this.alpha})`;
    context.shadowColor = `hsla(${hue},72%,68%,${Math.min(1, this.alpha + 0.1)})`;
    context.shadowBlur = this.r * 1.5;
    drawCircle(context, this.x, this.y, this.r);
  }

  resetPosition(width: number, height: number) {
    this.y = height + 10;
    this.x = Math.random() * width;
  }
}

export class Dot {
  private x = 0;
  private y = 0;
  private r = 1;
  private speed = 0.5;
  private a = 0.5;
  private aReduction = 0.005;
  private dir = 0;
  private hueOffset = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.r = Math.floor(Math.random() * 5) + 1;
    this.dir = Math.floor(Math.random() * 140) + 200;
    this.hueOffset = Math.random() * DOT_HUE_VARIATION * 2 - DOT_HUE_VARIATION;
  }

  get isDead() {
    return this.a <= 0;
  }

  get position() {
    return { x: this.x, y: this.y };
  }

  moveAndDraw(
    context: OffscreenCanvasRenderingContext2D | null,
    previous1: Dot | null,
    previous2: Dot | null,
    previous3: Dot | null,
    baseHue: number,
  ) {
    if (!context) {
      return;
    }

    this.a -= this.aReduction;
    if (this.a <= 0) {
      return;
    }

    this.x += Math.cos(toRadians(this.dir)) * (this.speed + params.dotsSpeed / 100);
    this.y += Math.sin(toRadians(this.dir)) * (this.speed + params.dotsSpeed / 100);

    const hue = (baseHue + this.hueOffset + 360) % 360;
    const color = `hsla(${hue},76%,62%,${this.a})`;
    const linkColor = `hsla(${hueInBluePurpleBand(hue, 10)},64%,60%,${this.a / 4.2})`;

    context.fillStyle = color;
    context.shadowColor = `hsla(${hue},70%,58%,${Math.min(1, this.a + 0.12)})`;
    context.shadowBlur = this.r * 1.5;
    drawCircle(context, this.x, this.y, this.r);

    if (!previous1) {
      return;
    }

    context.shadowBlur = 0;
    context.strokeStyle = linkColor;
    context.beginPath();
    context.moveTo(previous1.x, previous1.y);
    context.lineTo(this.x, this.y);
    if (previous2) {
      context.lineTo(previous2.x, previous2.y);
    }
    if (previous3) {
      context.lineTo(previous3.x, previous3.y);
    }
    context.stroke();
    context.closePath();
  }
}

export function createStars(width: number, height: number): Star[] {
  const stars: Star[] = [];
  const areaScale = Math.min(1.2, Math.max(0.7, (width * height) / (1280 * 720)));
  const starCount = Math.max(50, Math.floor(INIT_STARS_POPULATION * areaScale));

  for (let i = 0; i < starCount; i += 1) {
    stars.push(new Star(Math.random() * width, Math.random() * height));
  }

  return stars;
}

export function spawnDotNearPointer(
  dots: Array<Dot | null>,
  mouseX: number,
  mouseY: number,
  force: boolean,
): void {
  if (dots.length >= MAX_DOTS) {
    dots.shift();
  }

  if (dots.length === 0) {
    dots.push(new Dot(mouseX, mouseY));
    return;
  }

  const previousDot = dots[dots.length - 1];
  if (!previousDot) {
    dots.push(new Dot(mouseX, mouseY));
    return;
  }

  const { x: prevX, y: prevY } = previousDot.position;
  const diffX = Math.abs(prevX - mouseX);
  const diffY = Math.abs(prevY - mouseY);
  if (!force && (diffX < DOTS_MIN_DIST || diffY < DOTS_MIN_DIST)) {
    return;
  }

  const xVariation =
    (Math.random() > 0.5 ? -1 : 1) * (Math.floor(Math.random() * params.maxDistFromCursor) + 1);
  const yVariation =
    (Math.random() > 0.5 ? -1 : 1) * (Math.floor(Math.random() * params.maxDistFromCursor) + 1);
  dots.push(new Dot(mouseX + xVariation, mouseY + yVariation));
}

export function renderFrame(
  context: OffscreenCanvasRenderingContext2D | null,
  width: number,
  height: number,
  renderDpr: number,
  stars: Star[],
  dots: Array<Dot | null>,
  mouseX: number,
  mouseY: number,
  pointerActiveUntilMs: number,
): void {
  if (!context) {
    return;
  }

  const nowMs = performance.now();
  const baseHue = hueInBluePurpleBand(
    BASE_HUE,
    Math.sin(nowMs * HUE_CYCLE_DEGREES_PER_MS) * HUE_SWING,
  );
  const pulsePhase = (nowMs % OVERLAY_PULSE_MS) / OVERLAY_PULSE_MS;
  const overlayOpacity = 0.02 + 0.08 * Math.sin(pulsePhase * Math.PI);

  context.setTransform(renderDpr, 0, 0, renderDpr, 0, 0);
  context.globalCompositeOperation = "source-over";

  const backgroundGradient = context.createLinearGradient(0, 0, 0, Math.max(1, height));
  backgroundGradient.addColorStop(0, `hsl(${hueInBluePurpleBand(baseHue, -8)}, 50%, 4%)`);
  backgroundGradient.addColorStop(1, `hsl(${hueInBluePurpleBand(baseHue, 8)}, 52%, 20%)`);
  context.fillStyle = backgroundGradient;
  context.fillRect(0, 0, Math.max(1, width), Math.max(1, height));

  context.globalCompositeOperation = "overlay";
  context.fillStyle = `hsla(${hueInBluePurpleBand(baseHue, 14)}, 48%, 40%, ${overlayOpacity})`;
  context.fillRect(0, 0, Math.max(1, width), Math.max(1, height));

  context.globalCompositeOperation = "source-over";

  for (const star of stars) {
    star.move(context, baseHue, height);
  }

  // Try spawn dot if pointer is active
  if (performance.now() <= pointerActiveUntilMs) {
    spawnDotNearPointer(dots, mouseX, mouseY, false);
  }

  for (let i = 0; i < dots.length; i += 1) {
    const dot = dots[i];
    if (!dot) {
      continue;
    }

    const previous1 = i - 1 >= 0 ? (dots[i - 1] ?? null) : null;
    const previous2 = i - 2 >= 0 ? (dots[i - 2] ?? null) : null;
    const previous3 = i - 3 >= 0 ? (dots[i - 3] ?? null) : null;

    dot.moveAndDraw(context, previous1, previous2, previous3, baseHue);
    if (dot.isDead) {
      dots[i] = null;
    }
  }

  for (let i = dots.length - 1; i >= 0; i -= 1) {
    if (dots[i] === null) {
      dots.splice(i, 1);
    }
  }
}
