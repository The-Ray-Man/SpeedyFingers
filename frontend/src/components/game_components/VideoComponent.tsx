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
}

const VideoComponent: React.FC<VideoComponentProps> = ({ 
  scoreTrackable, 
  onScoreIncrement,
  currentShape,
  shapeOpacity = 0,
  onCollisionDetected,
  showControls = false,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const intervalRef = useRef<number | null>(null);
    const personTrackerRef = useRef<PersonTracker>(new PersonTracker());
    const [hasCollision, setHasCollision] = useState(false);
    const [currentPoses, setCurrentPoses] = useState<Pose[]>([]);

    // Pose detection state
    const [poseConfig, setPoseConfig] = useState<PoseDetectionConfig>({
      modelType: 'MultiPose.Lightning', // MultiPose for tracking multiple people
      maxPoses: 6, // Track up to 6 people
      minPoseScore: 0.25,
      minKeypointScore: 0.3,
    });

    const [drawOptions, setDrawOptions] = useState<DrawOptions>({
      showKeypoints: true,
      showSkeleton: true,
      keypointRadius: 4,
      lineWidth: 2,
      keypointColor: '#00ff00',
      skeletonColor: '#00ff00',
    });

    const [showPoseDetection, setShowPoseDetection] = useState(true);
    const [trackedPeople, setTrackedPeople] = useState<TrackedPerson[]>([]);

    const {
      detector,
      isLoading: isPoseLoading,
      error: poseError,
      detectPoses,
    } = usePoseDetection(poseConfig);


    // Start camera on mount
    useEffect(() => {
      let mounted = true;
      async function startCamera() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (mounted && videoRef.current) videoRef.current.srcObject = stream;
        } catch (err: any) {
          console.error("Failed to start camera:", err);
        }
      }
      startCamera();

      return () => {
        mounted = false;
        // stop tracks
        const stream = videoRef.current?.srcObject as MediaStream | null;
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
      };
    }, []);

    // Pose detection loop
    useEffect(() => {
      if (!detector || !showPoseDetection) return;
      if (!videoRef.current || !overlayCanvasRef.current) return;

      let animationId: number;
      let isActive = true;

      const detectAndDraw = async () => {
        if (!isActive) return;
        
        const video = videoRef.current;
        const canvas = overlayCanvasRef.current;
        
        if (!video || !canvas || video.readyState < 2) {
          animationId = requestAnimationFrame(detectAndDraw);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Update canvas size to match video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 480;
          canvas.height = video.videoHeight || 360;
        }

        // Clear previous drawings
        clearCanvas(canvas, ctx);

        try {
          // Detect poses
          const poses = await detectPoses(video);
          setCurrentPoses(poses);

          // Update person tracking
          const tracked = personTrackerRef.current.updatePoses(poses);
          setTrackedPeople(tracked);

          // Draw tracked persons with individual colors and labels
          drawTrackedPersons(ctx, tracked, {
            ...drawOptions,
            minKeypointScore: poseConfig.minKeypointScore,
          });
        } catch (err) {
          console.error('Error in pose detection:', err);
        }

        animationId = requestAnimationFrame(detectAndDraw);
      };

      detectAndDraw();

      return () => {
        isActive = false;
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    }, [detector, showPoseDetection, detectPoses, drawOptions, poseConfig.minKeypointScore]);

    // Collision detection
    useEffect(() => {
      if (!currentShape || shapeOpacity === 0 || !overlayCanvasRef.current || currentPoses.length === 0) {
        setHasCollision(false);
        return;
      }

      const canvas = overlayCanvasRef.current;
      const collision = checkAnyPoseCollision(
        currentPoses,
        currentShape,
        canvas.width,
        canvas.height
      );

      setHasCollision(collision);
      onCollisionDetected?.(collision);
    }, [currentPoses, currentShape, shapeOpacity, onCollisionDetected]);

    // Capture + send frames periodically (kept for future use)
    useEffect(() => {
      if (!scoreTrackable) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      let isActive = true;

      intervalRef.current = window.setInterval(async () => {
        if (!isActive) return;
        if (!videoRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // use natural video size
        canvas.width = video.videoWidth || 480;
        canvas.height = video.videoHeight || 360;

        // Mirror the canvas so the captured frames match the mirrored preview
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // // Convert frame to blob (JPEG)
        // canvas.toBlob(async (blob) => {
        //   if (!blob) return;

        //   try {
        //     const formData = new FormData();
        //     formData.append("image", blob, "frame.jpg");

        //     const res = await fetch("/api/score", {
        //       method: "POST",
        //       body: formData,
        //     });

        //     if (!res.ok) {
        //       console.warn("Scoring endpoint returned non-ok status", res.status);
        //       return;
        //     }

        //     const data = await res.json();
        //     if (data?.score !== undefined && onScoreIncrement) {
        //       onScoreIncrement();
        //     }
        //   } catch (err) {
        //     console.error("Error sending frame for scoring:", err);
        //   }
        // }, "image/jpeg", 0.7);
      }, 333);

      return () => {
        isActive = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [scoreTrackable, onScoreIncrement]);

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
            onClick={() => setShowPoseDetection(!showPoseDetection)}
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
              setPoseConfig({ ...poseConfig, modelType: e.target.value as any })
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
                  setPoseConfig({ ...poseConfig, maxPoses: parseInt(e.target.value) })
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
            onClick={() => setDrawOptions({ ...drawOptions, showKeypoints: !drawOptions.showKeypoints })}
            variant={drawOptions.showKeypoints ? "solid" : "outline"}
          >
            Keypoints
          </Button>

          <Button 
            size="sm" 
            onClick={() => setDrawOptions({ ...drawOptions, showSkeleton: !drawOptions.showSkeleton })}
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
