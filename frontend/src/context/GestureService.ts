// src/services/GestureService.ts
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";

export type HandGesture =
  | { type: "FINGERS_UP"; count: number }
  | { type: "HEART" }
  | { type: "THUMBS_DOWN" }
  | { type: "THUMBS_UP" }
  | { type: "ILOVEYOU" }
  | { type: "TRIPLE_BLINK" }
  | null;

export interface TwoHandGestureState {
  firstHand: HandGesture;
  secondHand: HandGesture;
  confirm: boolean;
}

type Listener = (state: TwoHandGestureState | null) => void;

export class GestureService {
    private lastDetectionTime = 0;
private detectionInterval = 300; // run every 200ms (~5 times/sec)
  private handLandmarker: HandLandmarker | null = null;
  public videoElement: HTMLVideoElement | null = null;
  private running = false;
  private listeners = new Set<Listener>();
  private initialized = false;

  private modelUrl =
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

  private wasmBase =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    const vision = await FilesetResolver.forVisionTasks(this.wasmBase);

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: this.modelUrl,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });

    const video = document.createElement("video");
    video.style.position = "fixed";
    video.style.left = "-9999px";
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    document.body.appendChild(video);
    this.videoElement = video;
  }

  async start() {
    
    if (this.running) return;
    if (!this.handLandmarker) await this.init();
    if (!this.videoElement) throw new Error("video element missing after init");
    

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
      audio: false,
    });

    this.videoElement.srcObject = stream;

    await new Promise<void>((resolve) => {
      this.videoElement!.onloadedmetadata = () => resolve();
      setTimeout(() => resolve(), 1000);
    });

    this.running = true;
    this.loopDetect();
  }

  stop() {
    this.running = false;
    if (this.videoElement?.srcObject) {
      const tracks = (this.videoElement.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      this.videoElement.srcObject = null;
    }
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notifyListeners(state: TwoHandGestureState| null) {
    for (const l of this.listeners) l(state);
  }

  private async loopDetect() {
  if (!this.running) return;
  if (!this.handLandmarker || !this.videoElement) {
    requestAnimationFrame(() => this.loopDetect());
    return;
  }

  const now = performance.now();
  if (now - this.lastDetectionTime < this.detectionInterval) {
    requestAnimationFrame(() => this.loopDetect());
    return;
  }
  this.lastDetectionTime = now;

  try {
    const result: HandLandmarkerResult = await this.handLandmarker.detectForVideo(
      this.videoElement,
      now
    );
    if (this.running) {
        const state = this.interpretGesture(result);
        console.log("[GestureService] detected state:", state);
        this.notifyListeners(state);
    }
  } catch (err) {
    console.error(err);
  }

  requestAnimationFrame(() => this.loopDetect());
}

private interpretGesture(result: HandLandmarkerResult): TwoHandGestureState | null {
    const multiLandmarks = result.landmarks; // Array<Array<landmark>>
    if (!multiLandmarks || multiLandmarks.length === 0) return null;

    const hands: HandGesture[] = [];

    for (let i = 0; i < multiLandmarks.length && i < 2; i++) {
        const landmarks = multiLandmarks[i] as Array<{ x: number; y: number }>;
        hands[i] = this.detectHandGesture(landmarks);
    }

    const firstHand = hands[0] || null;
    const secondHand = hands[1] || null;

    let confirm = false;
    if (firstHand && secondHand) {
      if (firstHand.type === secondHand.type) {
        if (firstHand.type === "FINGERS_UP" && secondHand.type === "FINGERS_UP") {
          // confirm only if the same number of fingers are up
          confirm = firstHand.count === secondHand.count;
        } else {
          // for other gestures, just matching type is enough
          confirm = true;
        }
      }
    }

    return { firstHand, secondHand, confirm };
}

  private detectHandGesture(
    landmarks: Array<{ x: number; y: number }>
  ): HandGesture {
    // 1) Priority gestures: Thumbs Down, I Love You (ASL ILY)
    if (this.isThumbsDown(landmarks)) {
      return { type: "THUMBS_DOWN" };
    }
    if (this.isILoveYou(landmarks)) {
      return { type: "ILOVEYOU" };
    }
    // Detect thumbs up
    if (this.isThumbsUp(landmarks)) {
      return { type: "THUMBS_UP" } as any; // Add "THUMBS_UP" to HandGesture type if needed
    }

    // 2) Default: fingers-up count
    // per request: ignore thumb for finger-count fallback
    const count = this.countRaisedFingersNoThumb(landmarks);
    return { type: "FINGERS_UP", count };
  }

  // ---- Landmark helpers ----
  private readonly L = {
    WRIST: 0,
    THUMB_CMC: 1,
    THUMB_MCP: 2,
    THUMB_IP: 3,
    THUMB_TIP: 4,
    INDEX_MCP: 5,
    INDEX_PIP: 6,
    INDEX_TIP: 8,
    MIDDLE_MCP: 9,
    MIDDLE_PIP: 10,
    MIDDLE_TIP: 12,
    RING_MCP: 13,
    RING_PIP: 14,
    RING_TIP: 16,
    PINKY_MCP: 17,
    PINKY_PIP: 18,
    PINKY_TIP: 20,
  } as const;

  private isFingerExtended(
    lm: Array<{ x: number; y: number }>,
    tip: number,
    pip: number,
    mcp: number
  ) {
    const t = lm[tip], p = lm[pip], m = lm[mcp];
    if (!t || !p || !m) return false;
    // y grows downward; raised if tip is above pip and pip above mcp
    return t.y < p.y && p.y < m.y;
  }

  private isThumbExtended(lm: Array<{ x: number; y: number }>) {
    const tip = lm[this.L.THUMB_TIP];
    const ip = lm[this.L.THUMB_IP];
    const indexMcp = lm[this.L.INDEX_MCP];
    if (!tip || !ip || !indexMcp) return false;
    const horiz = Math.abs(tip.x - indexMcp.x);
    // Check if thumb is extended in either direction (left or right hand)
    const dirOK = tip.x < ip.x || tip.x > ip.x;
    return horiz > 0.05 && dirOK;
  }

  private countRaisedFingersNoThumb(lm: Array<{ x: number; y: number }>) {
    let c = 0;
    if (this.isFingerExtended(lm, this.L.INDEX_TIP, this.L.INDEX_PIP, this.L.INDEX_MCP)) c++;
    if (this.isFingerExtended(lm, this.L.MIDDLE_TIP, this.L.MIDDLE_PIP, this.L.MIDDLE_MCP)) c++;
    if (this.isFingerExtended(lm, this.L.RING_TIP, this.L.RING_PIP, this.L.RING_MCP)) c++;
    if (this.isFingerExtended(lm, this.L.PINKY_TIP, this.L.PINKY_PIP, this.L.PINKY_MCP)) c++;
    return c;
  }

  private isThumbsDown(lm: Array<{ x: number; y: number }>) {
    const wrist = lm[this.L.WRIST];
    const thumbTip = lm[this.L.THUMB_TIP];
    if (!wrist || !thumbTip) return false;
    const pointingDown = thumbTip.y > wrist.y + 0.1;
    // Other fingers not extended
    const idx = this.isFingerExtended(lm, this.L.INDEX_TIP, this.L.INDEX_PIP, this.L.INDEX_MCP);
    const mid = this.isFingerExtended(lm, this.L.MIDDLE_TIP, this.L.MIDDLE_PIP, this.L.MIDDLE_MCP);
    return pointingDown && !idx && !mid;
  }

  private isILoveYou(lm: Array<{ x: number; y: number }>) {
    const thumb = this.isThumbExtended(lm);
    const index = this.isFingerExtended(lm, this.L.INDEX_TIP, this.L.INDEX_PIP, this.L.INDEX_MCP);
    const middle = this.isFingerExtended(lm, this.L.MIDDLE_TIP, this.L.MIDDLE_PIP, this.L.MIDDLE_MCP);
    const ring = this.isFingerExtended(lm, this.L.RING_TIP, this.L.RING_PIP, this.L.RING_MCP);
    const pinky = this.isFingerExtended(lm, this.L.PINKY_TIP, this.L.PINKY_PIP, this.L.PINKY_MCP);
    // ASL ILY: thumb + index + pinky extended, middle & ring folded
    return thumb && index && pinky && !middle && !ring;
  }

  private isThumbsUp(lm: Array<{ x: number; y: number }>) {
    const wrist = lm[this.L.WRIST];
    const thumbTip = lm[this.L.THUMB_TIP];
    if (!wrist || !thumbTip) return false;
    const pointingUp = thumbTip.y < wrist.y - 0.1;
    // Other fingers not extended
    const idx = this.isFingerExtended(lm, this.L.INDEX_TIP, this.L.INDEX_PIP, this.L.INDEX_MCP);
    const mid = this.isFingerExtended(lm, this.L.MIDDLE_TIP, this.L.MIDDLE_PIP, this.L.MIDDLE_MCP);
    return pointingUp && !idx && !mid;
  }

  // countRaisedFingers removed (superseded by countRaisedFingersWithThumb)

  async dispose() {
    this.stop();
    if (this.handLandmarker) {
      try {
        (this.handLandmarker as any)?.close?.();
      } catch {}
      this.handLandmarker = null;
    }
    if (this.videoElement) {
      try {
        document.body.removeChild(this.videoElement);
      } catch {}
      this.videoElement = null;
    }
    this.initialized = false;
  }
}

// Singleton
export const gestureService = new GestureService();
