// Single entry point for MediaPipe Tasks Vision.
//
// The WASM runtime is copied from the pinned npm package into
// `public/mediapipe/wasm` by the Vite plugin in `vite.config.ts`, and the
// `.task` models are committed under `public/mediapipe/models`. Nothing is
// loaded from a CDN at runtime, so the JS API and the WASM always match.
import {
  DrawingUtils,
  FilesetResolver,
  GestureRecognizer,
  HandLandmarker,
  type GestureRecognizerOptions,
  type HandLandmarkerOptions,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

const BASE = import.meta.env.BASE_URL;

export const MEDIAPIPE_WASM_PATH = `${BASE}mediapipe/wasm`;
export const HAND_LANDMARKER_MODEL_PATH = `${BASE}mediapipe/models/hand_landmarker.task`;
export const GESTURE_RECOGNIZER_MODEL_PATH = `${BASE}mediapipe/models/gesture_recognizer.task`;

export { DrawingUtils, GestureRecognizer, HandLandmarker };
export type { NormalizedLandmark };

/** Thrown when the WASM runtime or a model file can't be loaded. */
export class ModelLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ModelLoadError";
  }
}

let filesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;

function loadVisionFileset() {
  if (!filesetPromise) {
    filesetPromise = FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH).catch(error => {
      // Allow a retry (e.g. after a network hiccup) instead of caching the failure
      filesetPromise = null;
      throw error;
    });
  }
  return filesetPromise;
}

type Delegate = "CPU" | "GPU";

/**
 * Creates a task, falling back from the GPU to the CPU delegate if the GPU
 * isn't usable. Any failure is wrapped in a `ModelLoadError`.
 */
async function createTask<T>(
  label: string,
  delegate: Delegate,
  create: (fileset: Awaited<ReturnType<typeof loadVisionFileset>>, delegate: Delegate) => Promise<T>
): Promise<T> {
  try {
    const fileset = await loadVisionFileset();
    try {
      return await create(fileset, delegate);
    } catch (error) {
      if (delegate !== "GPU") throw error;
      console.warn(`[mediapipe] ${label}: GPU delegate failed, retrying on CPU`, error);
      return await create(fileset, "CPU");
    }
  } catch (error) {
    console.error(`[mediapipe] Failed to load ${label}:`, error);
    throw new ModelLoadError(`Failed to load ${label}`, { cause: error });
  }
}

export function createHandLandmarker(
  options: Omit<HandLandmarkerOptions, "baseOptions">,
  delegate: Delegate = "GPU"
) {
  return createTask("hand landmarker", delegate, (fileset, d) =>
    HandLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { modelAssetPath: HAND_LANDMARKER_MODEL_PATH, delegate: d },
    })
  );
}

export function createGestureRecognizer(
  options: Omit<GestureRecognizerOptions, "baseOptions">,
  delegate: Delegate = "GPU"
) {
  return createTask("gesture recognizer", delegate, (fileset, d) =>
    GestureRecognizer.createFromOptions(fileset, {
      ...options,
      baseOptions: { modelAssetPath: GESTURE_RECOGNIZER_MODEL_PATH, delegate: d },
    })
  );
}

/** Opens the user-facing camera, with a clear error if the API is missing. */
export async function openCamera(video: MediaTrackConstraints): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException(
      "navigator.mediaDevices.getUserMedia is unavailable",
      "CameraUnsupportedError"
    );
  }
  return navigator.mediaDevices.getUserMedia({ video, audio: false });
}

/** Turns camera and model errors into a message that can be shown to players. */
export function describeMediaError(error: unknown): string {
  if (error instanceof ModelLoadError) {
    return "The hand-tracking model couldn't be loaded. Check your internet connection and reload the page.";
  }
  const name = error instanceof Error || error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "Camera access was denied. Allow camera access for this site in your browser settings, then reload the page.";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "No camera was found. Connect a camera and reload the page.";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "The camera is in use by another application. Close it and reload the page.";
    case "CameraUnsupportedError":
      return window.isSecureContext
        ? "This browser doesn't support camera access. Try a current version of Chrome, Edge, Firefox or Safari."
        : "Camera access needs a secure (HTTPS) connection. Open the game over HTTPS.";
    default:
      return "Couldn't start the camera or hand tracking. Reload the page and try again.";
  }
}

export interface HandFrame {
  image: HTMLVideoElement;
  multiHandLandmarks: NormalizedLandmark[][];
}

/**
 * Runs a `HandLandmarker` on every new video frame and passes the result to
 * `onFrame`. Replaces the legacy `@mediapipe/hands` + `camera_utils` loop.
 */
export class HandTracker {
  private frameId: number | null = null;
  private lastVideoTime = -1;
  private busy = false;
  private reportedError = false;

  private readonly landmarker: HandLandmarker;

  private constructor(landmarker: HandLandmarker) {
    this.landmarker = landmarker;
  }

  static async create(options: Omit<HandLandmarkerOptions, "baseOptions" | "runningMode">) {
    return new HandTracker(await createHandLandmarker({ ...options, runningMode: "VIDEO" }));
  }

  start(
    video: HTMLVideoElement,
    onFrame: (frame: HandFrame) => void | Promise<void>,
    onError?: (error: unknown) => void
  ) {
    this.stop();
    const loop = () => {
      this.frameId = requestAnimationFrame(loop);
      if (this.busy || video.readyState < 2 || video.currentTime === this.lastVideoTime) {
        return;
      }
      this.lastVideoTime = video.currentTime;
      this.busy = true;
      Promise.resolve()
        .then(() => {
          const result = this.landmarker.detectForVideo(video, performance.now());
          return onFrame({ image: video, multiHandLandmarks: result.landmarks });
        })
        .catch(error => {
          console.error("[mediapipe] Hand tracking failed:", error);
          if (!this.reportedError) {
            this.reportedError = true;
            onError?.(error);
          }
        })
        .finally(() => {
          this.busy = false;
        });
    };
    loop();
  }

  stop() {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.lastVideoTime = -1;
  }

  close() {
    this.stop();
    this.landmarker.close();
  }
}

/** Draws hand skeletons with the same styling options as the legacy drawing_utils. */
export function drawHands(
  ctx: CanvasRenderingContext2D,
  hands: NormalizedLandmark[][],
  connectorStyle: { color: string; lineWidth: number },
  landmarkStyle: { color: string; lineWidth: number; radius: number }
) {
  const drawing = new DrawingUtils(ctx);
  for (const landmarks of hands) {
    drawing.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, connectorStyle);
    drawing.drawLandmarks(landmarks, landmarkStyle);
  }
}
