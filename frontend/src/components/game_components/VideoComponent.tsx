import { useEffect, useRef } from "react";
import { Box } from "@chakra-ui/react";

interface VideoComponentProps {
  scoreTrackable: boolean;
  onScoreIncrement?: (incrementValue: number) => void;
}

const VideoComponent: React.FC<VideoComponentProps> = ({ scoreTrackable, onScoreIncrement }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const intervalRef = useRef<number | null>(null);


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

    // Capture + send frames periodically
    useEffect(() => {
      if (!scoreTrackable) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      let isActive = true;

      intervalRef.current = setInterval(async () => {
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
    }, [scoreTrackable]);

    return (
      <>
        <Box
          overflow="hidden"
          bg="#000"
          width="100%"
          height="100%"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "100%", transform: "scaleX(-1)", objectFit: "cover" }}
          />
        </Box>

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </>
    );
};

VideoComponent.displayName = "VideoComponent";

export default VideoComponent;
