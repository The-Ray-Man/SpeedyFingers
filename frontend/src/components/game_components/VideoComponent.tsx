import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Box, Button, HStack, VStack, Text } from "@chakra-ui/react";
import { usePoseDetection, type PoseDetectionConfig } from "../../hooks/usePoseDetection";
import { drawTrackedPersons, clearCanvas, type DrawOptions } from "../../utils/poseDrawing";
import { PersonTracker, type TrackedPerson } from "../../utils/personTracking";
import ShapeOverlay, { type Shape } from "./ShapeOverlay";
import { checkAnyPoseCollision } from "@/utils/collisionDetection";
import type { Pose } from '@tensorflow-models/pose-detection';

interface VideoComponentProps {
  scoreTrackable: boolean;
  onScoreIncrement?: (incrementValue: number) => void;
  currentShape?: Shape | null;
  shapeOpacity?: number;
  onCollisionDetected?: (hasCollision: boolean) => void;
  showControls?: boolean;
  preloadCamera?: boolean; // Whether to start camera early (for preloading)
}

const DEFAULT_POSE_CONFIG: PoseDetectionConfig = {
  modelType: 'MultiPose.Lightning',
  maxPoses: 6,
  minPoseScore: 0.25,
  minKeypointScore: 0.3,
};

const DEFAULT_DRAW_OPTIONS: DrawOptions = {
  showKeypoints: true,
  showSkeleton: true,
  keypointRadius: 4,
  lineWidth: 2,
  keypointColor: '#00ff00',
  skeletonColor: '#00ff00',
};

function posesShallowEqual(a: Pose[], b: Pose[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  // quick shallow compare: lengths + first few keypoint coordinates
  for (let i = 0; i < a.length; i++) {
    const ak = a[i].keypoints ?? [];
    const bk = b[i].keypoints ?? [];
    if (ak.length !== bk.length) return false;
    // compare up to first 5 keypoints coordinates to detect meaningful change
    const limit = Math.min(5, ak.length);
    for (let j = 0; j < limit; j++) {
      const ap = ak[j];
      const bp = bk[j];
      if (!ap || !bp) return false;
      if (Math.abs((ap.x ?? 0) - (bp.x ?? 0)) > 1) return false;
      if (Math.abs((ap.y ?? 0) - (bp.y ?? 0)) > 1) return false;
      if (Math.abs((ap.score ?? 0) - (bp.score ?? 0)) > 0.05) return false;
    }
  }
  return true;
}

const VideoComponent: React.FC<VideoComponentProps> = ({
  scoreTrackable,
  onScoreIncrement,
  currentShape,
  shapeOpacity = 0,
  onCollisionDetected,
  showControls = false,
  preloadCamera = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const personTrackerRef = useRef<PersonTracker>(new PersonTracker());

  // keep latest callbacks/values in refs to avoid effect deps cycling
  const detectPosesRef = useRef<((video: HTMLVideoElement) => Promise<Pose[]>) | null>(null);
  const onScoreIncrementRef = useRef<typeof onScoreIncrement | undefined>(onScoreIncrement);
  const onCollisionDetectedRef = useRef<typeof onCollisionDetected | undefined>(onCollisionDetected);

  useEffect(() => { onScoreIncrementRef.current = onScoreIncrement; }, [onScoreIncrement]);
  useEffect(() => { onCollisionDetectedRef.current = onCollisionDetected; }, [onCollisionDetected]);

  // state
  const [hasCollision, setHasCollision] = useState(false);
  const [currentPoses, setCurrentPoses] = useState<Pose[]>([]);
  const [poseConfig, setPoseConfig] = useState<PoseDetectionConfig>(DEFAULT_POSE_CONFIG);
  const [drawOptions, setDrawOptions] = useState<DrawOptions>(DEFAULT_DRAW_OPTIONS);
  const [showPoseDetection, setShowPoseDetection] = useState(true);
  const [trackedPeople, setTrackedPeople] = useState<TrackedPerson[]>([]);

  // pose detection hook
  const {
    detector,
    isLoading: isPoseLoading,
    error: poseError,
    detectPoses,
  } = usePoseDetection(poseConfig);

  // keep detectPoses function in a ref and update minKeypointScore separately
  const minKeypointScoreRef = useRef<number>(poseConfig.minKeypointScore ?? 0.3);
  useEffect(() => { minKeypointScoreRef.current = poseConfig.minKeypointScore ?? 0.3; }, [poseConfig.minKeypointScore]);

  useEffect(() => {
    detectPosesRef.current = detectPoses;
  }, [detectPoses]);

  // --------------------
  // Start / stop camera
  // --------------------
  useEffect(() => {
    if (!preloadCamera) return;

    let mounted = true;
    let localStream: MediaStream | null = null;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        localStream = stream;
        if (mounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          // Autoplay sometimes requires load call
          try { await videoRef.current.play(); } catch { /* ignore autoplay failures */ }
        }
      } catch (err: any) {
        console.error("Failed to start camera:", err);
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      } else {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        if (stream) stream.getTracks().forEach(t => t.stop());
      }
    };
    // preloadCamera intentionally not included as dependency beyond initial mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadCamera]);

  // --------------------
  // Pose detection loop (animation frame)
  // - uses refs to avoid re-creating the loop on every render
  // - only depends on the detector being available and showPoseDetection toggle
  // --------------------
  useEffect(() => {
    if (!detector || !showPoseDetection) return;

    let animationId = 0;
    let isActive = true;

    const detectAndDraw = async () => {
      if (!isActive) return;

      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      if (!video || !canvas) {
        animationId = requestAnimationFrame(detectAndDraw);
        return;
      }

      if (video.readyState < 2) {
        // not ready yet
        animationId = requestAnimationFrame(detectAndDraw);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationId = requestAnimationFrame(detectAndDraw);
        return;
      }

      // update canvas size to match actual video dimensions (only when changed)
      const w = video.videoWidth || 480;
      const h = video.videoHeight || 360;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      clearCanvas(canvas, ctx);

      try {
        const runner = detectPosesRef.current;
        if (!runner) {
          animationId = requestAnimationFrame(detectAndDraw);
          return;
        }
        const poses = await runner(video);

        // Only set state if poses meaningfully changed
        if (!posesShallowEqual(poses, currentPoses)) {
          setCurrentPoses(poses);
        }

        // update person tracking and only set tracked people if changed
        const tracked = personTrackerRef.current.updatePoses(poses);
        // shallow compare tracked people by ids and representative keypoint positions
        const prevTracked = trackedPeople;
        let same = prevTracked.length === tracked.length;
        if (same) {
          for (let i = 0; i < tracked.length; i++) {
            if (prevTracked[i].id !== tracked[i].id) { same = false; break; }
            // Compare first keypoint position if available
            const prevKeypoint = prevTracked[i].pose?.keypoints?.[0];
            const currKeypoint = tracked[i].pose?.keypoints?.[0];
            if (prevKeypoint && currKeypoint) {
              if (Math.abs(prevKeypoint.x - currKeypoint.x) > 1 ||
                  Math.abs(prevKeypoint.y - currKeypoint.y) > 1) { same = false; break; }
            }
          }
        }
        if (!same) setTrackedPeople(tracked);

        // draw using latest draw options & minKeypointScore
        drawTrackedPersons(ctx, tracked, {
          ...drawOptions,
          minKeypointScore: minKeypointScoreRef.current,
        });
      } catch (err) {
        console.error('Error in pose detection loop:', err);
      }

      animationId = requestAnimationFrame(detectAndDraw);
    };

    detectAndDraw();

    return () => {
      isActive = false;
      if (animationId) cancelAnimationFrame(animationId);
    };
    // intentionally depends only on detector and showPoseDetection - other live values are read through refs
  }, [detector, showPoseDetection]); // stable deps

  // --------------------
  // Collision detection
  // - compute collision on pose updates, but only update React state if collision changed
  // --------------------
  const lastCollisionRef = useRef<boolean>(false);
  useEffect(() => {
    if (!currentShape || shapeOpacity === 0 || !overlayCanvasRef.current || currentPoses.length === 0) {
      if (lastCollisionRef.current !== false) {
        lastCollisionRef.current = false;
        setHasCollision(false);
        onCollisionDetectedRef.current?.(false);
      }
      return;
    }

    const canvas = overlayCanvasRef.current;
    let collision = false;
    try {
      collision = checkAnyPoseCollision(
        currentPoses,
        currentShape,
        canvas.width,
        canvas.height
      );
    } catch (err) {
      console.error("Collision check error:", err);
      collision = false;
    }

    if (collision !== lastCollisionRef.current) {
      lastCollisionRef.current = collision;
      setHasCollision(collision);
      onCollisionDetectedRef.current?.(collision);
    }
    // run whenever poses or shape change - but we read currentPoses directly
  }, [currentShape, shapeOpacity, currentPoses /* minor: currentPoses array reference changes only when posesShallowEqual fails */]);

  // --------------------
  // Capture + send frames periodically (score)
  // - stable interval controlled by scoreTrackable
  // --------------------
  useEffect(() => {
    if (!scoreTrackable) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // ensure existing interval cleared
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const sendFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 360;

      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // If you want to send the frame uncomment toBlob block.
      // For now we call onScoreIncrementRef as a placeholder example:
      try {
        // Placeholder: directly call onScoreIncrement (consumer decides)
        onScoreIncrementRef.current?.(1);
      } catch (err) {
        console.error("Error during score callback:", err);
      }
    };

    // set interval to every 333ms (approx 3fps)
    intervalRef.current = window.setInterval(() => {
      void sendFrame();
    }, 333);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [scoreTrackable]); // onScoreIncrement is read from ref

  // --------------------
  // Reset person tracker when user explicitly resets via controls
  // (handler is in UI below)
  // --------------------

  return (
    <VStack width="100%" height="100%" gap={showControls ? 2 : 0}>
      {/* Controls */}
      {showControls && (
        <HStack
          width="100%"
          padding={2}
          bg="blackAlpha.700"
          borderRadius="md"
          flexWrap="wrap"
          gap={2}
        >
          <Button
            size="sm"
            onClick={() => setShowPoseDetection((s) => !s)}
            colorScheme={showPoseDetection ? "green" : "gray"}
          >
            {showPoseDetection ? "Hide" : "Show"} Skeleton
          </Button>

          <select
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              background: '#2D3748',
              color: 'white',
              border: '1px solid #4A5568',
              fontSize: '0.875rem'
            }}
            value={poseConfig.modelType}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setPoseConfig((prev) => ({ ...prev, modelType: e.target.value as any }))
            }
          >
            <option value="SinglePose.Lightning">Single Pose (Fast)</option>
            <option value="SinglePose.Thunder">Single Pose (Accurate)</option>
            <option value="MultiPose.Lightning">Multi Pose</option>
          </select>

          {poseConfig.modelType?.startsWith('MultiPose') && (
            <>
              <Text fontSize="sm" color="white">Max Poses:</Text>
              <select
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  background: '#2D3748',
                  color: 'white',
                  border: '1px solid #4A5568',
                  fontSize: '0.875rem',
                  width: '70px'
                }}
                value={poseConfig.maxPoses}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setPoseConfig((prev) => ({ ...prev, maxPoses: parseInt(e.target.value) }))
                }
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </>
          )}

          <Button
            size="sm"
            onClick={() => setDrawOptions((d) => ({ ...d, showKeypoints: !d.showKeypoints }))}
            variant={drawOptions.showKeypoints ? "solid" : "outline"}
          >
            Keypoints
          </Button>

          <Button
            size="sm"
            onClick={() => setDrawOptions((d) => ({ ...d, showSkeleton: !d.showSkeleton }))}
            variant={drawOptions.showSkeleton ? "solid" : "outline"}
          >
            Skeleton
          </Button>

          <Button
            size="sm"
            onClick={() => {
              personTrackerRef.current.reset();
              setTrackedPeople([]);
            }}
            colorScheme="red"
            variant="outline"
          >
            Reset IDs
          </Button>

          {/* Show tracked people badges */}
          {trackedPeople.map(person => (
            <Box
              key={person.id}
              px={2}
              py={1}
              borderRadius="md"
              fontSize="xs"
              fontWeight="bold"
              style={{
                backgroundColor: person.color + '40',
                color: person.color,
                border: `2px solid ${person.color}`
              }}
            >
              {person.label}
            </Box>
          ))}

          {isPoseLoading && <Text fontSize="sm" color="yellow.300">Loading model...</Text>}
          {poseError && <Text fontSize="sm" color="red.300">Error: {poseError}</Text>}
        </HStack>
      )}

      {/* Video with overlay */}
      <Box
        position="relative"
        overflow="hidden"
        bg="#000"
        width="100%"
        flex="1"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            transform: "scaleX(-1)",
            objectFit: "cover"
          }}
        />
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            transform: "scaleX(-1)",
            objectFit: "cover",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
        {/* Shape collision overlay */}
        {currentShape && overlayCanvasRef.current && shapeOpacity > 0 && (
          <ShapeOverlay
            shape={currentShape}
            isVisible={true}
            hasCollision={hasCollision}
            opacity={shapeOpacity}
            canvasWidth={overlayCanvasRef.current.width || 640}
            canvasHeight={overlayCanvasRef.current.height || 480}
          />
        )}
      </Box>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </VStack>
  );
};

VideoComponent.displayName = "VideoComponent";

export default VideoComponent;
