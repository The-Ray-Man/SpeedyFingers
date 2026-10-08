// src/context/GestureContext.tsx
import  {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { gestureService, type TwoHandGestureState } from "./GestureService";
import { describeMediaError } from "../mediapipe";

// adjust import path

interface GestureContextType {
  enabled: boolean;
  gesture: TwoHandGestureState | null;
  toggleGesture: () => void;
  setGestureEnabled: (enabled: boolean) => void;
  loading: boolean;
  /** User-facing message when the camera or model couldn't be started */
  error: string | null;
}

const GestureContext = createContext<GestureContextType>({
  enabled: false,
  gesture: null,
  toggleGesture: () => {},
  setGestureEnabled: () => {},
  loading: false,
  error: null,
});

export const GestureProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [enabled, setEnabled] = useState(false);
  const [gesture, setGesture] = useState<TwoHandGestureState | null>(null);
  const [loading, setLoading] = useState(true); // ← for progress bar
  const [error, setError] = useState<string | null>(null);

  // Initialize the service once on app mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await gestureService.init(); // loads model & wasm once
      } catch (err) {
        console.error("[GestureContext] Failed to initialize gesture service:", err);
        setError(describeMediaError(err));
      } finally {
        setLoading(false);
      }
    };
    init();

    return () => {
      gestureService.dispose();
    };
  }, []);

  // Start/stop the camera + detection loop
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    if (enabled) {
      // start() retries the model load if it failed on mount
      gestureService
        .start()
        .then(() => {
          if (cancelled) return;
          setError(null);
          unsubscribe = gestureService.subscribe(setGesture);
        })
        .catch((err) => {
          console.error("[GestureContext] Failed to start gesture control:", err);
          if (!cancelled) setError(describeMediaError(err));
        });
    } else {
      gestureService.stop();
      setGesture(null);
    }

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [enabled]);

  const toggleGesture = useCallback(() => {
      
        setEnabled(!enabled);
    }, [enabled]);

  const setGestureEnabled = useCallback((value: boolean) => {
  
    setEnabled(value);
  }, []);

  return (
    <GestureContext.Provider value={{ enabled, gesture, toggleGesture, setGestureEnabled, loading, error }}>
      {children}

      {enabled && error && (
        <GestureErrorBanner message={error} onDismiss={() => setEnabled(false)} />
      )}


      {/* Camera overlay */}
      {enabled && gestureService.videoElement && (
        <VideoOverlay video={gestureService.videoElement} />
      )}
    </GestureContext.Provider>
  );
};


const GestureErrorBanner: React.FC<{ message: string; onDismiss: () => void }> = ({
  message,
  onDismiss,
}) => (
  <div
    role="alert"
    style={{
      position: "fixed",
      bottom: "1rem",
      left: "1rem",
      zIndex: 9999,
      maxWidth: "min(360px, calc(100vw - 2rem))",
      display: "flex",
      gap: "0.75rem",
      alignItems: "flex-start",
      background: "rgba(60, 16, 22, 0.92)",
      color: "#ffd7d7",
      border: "1px solid rgba(255, 140, 140, 0.5)",
      padding: "0.75rem 1rem",
      borderRadius: "8px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
      fontSize: "0.9rem",
      lineHeight: 1.4,
    }}
  >
    <span>
      <strong>Gesture control unavailable.</strong> {message}
    </span>
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss"
      style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1.1rem" }}
    >
      ×
    </button>
  </div>
);

const VideoOverlay: React.FC<{ video: HTMLVideoElement }> = ({ video }) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container) return;
    container.appendChild(video);
    video.style.position = "static";
    video.style.width = "160px";
    video.style.height = "120px";
    video.style.objectFit = "cover";
    video.style.borderRadius = "8px";
    video.style.boxShadow = "0 2px 6px rgba(0,0,0,0.25)";
    // Mirror the preview horizontally for a more natural selfie view
    video.style.transform = "scaleX(-1)";
    video.style.transformOrigin = "center";

    return () => {
      try {
        container.removeChild(video);
      } catch {}
    };
  }, [container, video]);

  return (
    <div
      ref={setContainer}
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "1rem",
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.3)",
        padding: "4px",
        borderRadius: "8px",
      }}
    />
  );
};

export const useGesture = () => useContext(GestureContext);
