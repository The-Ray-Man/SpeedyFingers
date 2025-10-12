// src/context/GestureContext.tsx
import  {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { gestureService, type TwoHandGestureState } from "./GestureService";
import { Progress } from "@chakra-ui/react";

// adjust import path

interface GestureContextType {
  enabled: boolean;
  gesture: TwoHandGestureState | null;
  toggleGesture: () => void;
  setGestureEnabled: (enabled: boolean) => void;
  loading: boolean;
}

const GestureContext = createContext<GestureContextType>({
  enabled: false,
  gesture: null,
  toggleGesture: () => {},
  setGestureEnabled: () => {},
  loading: false,
});

export const GestureProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [enabled, setEnabled] = useState(false);
  const [gesture, setGesture] = useState<TwoHandGestureState | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true); // ← for progress bar

  // Initialize the service once on app mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await gestureService.init(); // loads model & wasm once
        console.log("[GestureContext] Gesture service initialized ✅");
        setReady(true);
      } catch (err) {
        console.error("[GestureContext] Failed to initialize gesture service:", err);
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
    console.log("[GestureContext] Gesture detection:", enabled);
    console.log("[GestureContext] Ready state:", ready);
    if (!ready) return;
    let unsubscribe: (() => void) | undefined;

    if (enabled) {
      gestureService.start().then(() => {
        unsubscribe = gestureService.subscribe(setGesture);
        console.log("[GestureContext] Gesture service started 🎥");
      });
    } else {
      gestureService.stop();
      setGesture(null);
    }

    return () => {
      unsubscribe?.();
    };
  }, [enabled, ready]);

  const toggleGesture = useCallback(() => {
        console.log("[GestureContext] Toggling gesture:", !enabled);
        setEnabled(!enabled);
    }, [enabled]);

  const setGestureEnabled = useCallback((value: boolean) => {
    console.log("[GestureContext] Setting gesture enabled:", value);
    setEnabled(value);
  }, []);

  return (
    <GestureContext.Provider value={{ enabled, gesture, toggleGesture, setGestureEnabled, loading }}>
      {children}

      {/* Loading indicator while initializing */}
      {loading && (
        <div style={{ width: "100%", padding: "0.25rem 0.2rem", position: "fixed" }}>
          <Progress.Root value={null} width="100%" colorPalette="blue" size="sm">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </div>
      )}

      {/* Camera overlay */}
      {enabled && gestureService.videoElement && (
        <VideoOverlay video={gestureService.videoElement} />
      )}
    </GestureContext.Provider>
  );
};

// Video overlay remains unchanged
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
