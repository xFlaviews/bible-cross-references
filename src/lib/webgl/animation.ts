export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface AnimationState {
  drawOnProgress: number;    // 0-1, draw-on animation
  transitionProgress: number; // 0-1, drill-down transition
  breathingAlpha: number;     // small alpha modulation
  time: number;               // elapsed time in seconds
}

export class AnimationTimeline {
  private startTime: number = 0;
  private drawOnDuration: number = 3.0; // seconds
  private transitionStart: number = 0;
  private transitionDuration: number = 0.4;
  private transitioning: boolean = false;
  private transitionDirection: number = 1; // 1 = forward, -1 = reverse
  private _transitionProgress: number = 0;

  start() {
    this.startTime = performance.now() / 1000;
  }

  startTransition(forward: boolean = true) {
    this.transitioning = true;
    this.transitionStart = performance.now() / 1000;
    this.transitionDirection = forward ? 1 : -1;
    if (forward) {
      this._transitionProgress = 0;
    }
  }

  getState(): AnimationState {
    const now = performance.now() / 1000;
    const elapsed = now - this.startTime;

    // Draw-on: ease-out-cubic over 3 seconds
    const drawOnProgress = Math.min(easeOutCubic(Math.min(elapsed / this.drawOnDuration, 1)), 1);

    // Transition
    if (this.transitioning) {
      const tElapsed = now - this.transitionStart;
      const tRaw = Math.min(tElapsed / this.transitionDuration, 1);
      if (this.transitionDirection > 0) {
        this._transitionProgress = easeInOutCubic(tRaw);
      } else {
        this._transitionProgress = 1 - easeInOutCubic(tRaw);
      }
      if (tRaw >= 1) {
        this.transitioning = false;
      }
    }

    // Breathing: gentle alpha modulation in overview
    const breathingAlpha = Math.sin(elapsed * 0.5) * 0.01;

    return {
      drawOnProgress,
      transitionProgress: this._transitionProgress,
      breathingAlpha,
      time: elapsed,
    };
  }

  get isTransitioning(): boolean {
    return this.transitioning;
  }
}
