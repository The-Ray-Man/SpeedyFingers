import { useEffect, useRef, useState } from "react";
import { Hands, HAND_CONNECTIONS, type Results } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import {
  saveGesture,
  getAllGestures,
  getGestureBySymbol,
  deleteGestureVariant,
  deleteGesture,
  updateGestureThreshold,
  matchGesture,
  type GestureSummary,
  type GestureDefinition
} from "../gestureApi";
import { landmarksToArray, getHandPoseDebugInfo } from "../advancedGestureRecognition";
import { Toaster, toaster } from "@/components/ui/toaster";

const ADMIN_PASSWORD = "admin123";

const DEV_MODE_STYLES = `
.dev-mode-page {
  color-scheme: dark;
  min-height: 100vh;
  width: 100%;
  background: radial-gradient(circle at top, #1f1f2e, #0d0d15);
  color: #f5f7fb;
  display: flex;
  justify-content: center;
  padding: 2rem calc(3vw + 1rem);
  box-sizing: border-box;
}

.dev-mode-page * {
  box-sizing: border-box;
}

.dev-shell {
  width: min(1280px, 100%);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.dev-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
}

.dev-hero h1 {
  font-size: clamp(2.5rem, 5vw, 3.2rem);
  margin: 0;
  font-weight: 800;
  text-shadow: 0 0 32px rgba(120, 180, 255, 0.55);
}

.dev-hero p {
  margin: 0.3rem 0 0;
  color: rgba(222, 232, 255, 0.78);
  font-size: clamp(1rem, 2.2vw, 1.2rem);
  line-height: 1.6;
  max-width: 640px;
}

.dev-hero-actions {
  display: flex;
  gap: 0.75rem;
}

.workspace {
  display: flex;
  gap: 1.75rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.stage-column {
  flex: 1 1 600px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.control-column {
  flex: 0 0 min(360px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.dev-card {
  background: linear-gradient(160deg, rgba(36, 32, 70, 0.72), rgba(20, 30, 55, 0.5));
  border: 1px solid rgba(130, 165, 255, 0.22);
  border-radius: 22px;
  box-shadow: 0 24px 45px rgba(13, 16, 35, 0.55);
  padding: clamp(1.25rem, 2vw, 1.75rem);
  backdrop-filter: blur(12px);
}

.stage-card .stage-wrapper {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  aspect-ratio: 16 / 9;
  background: #05070f;
}

.stage-card video,
.stage-card canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.stage-card video {
  filter: saturate(1.12) contrast(1.04);
  transform: scaleX(-1);
  z-index: 1;
}

.stage-card canvas {
  pointer-events: none;
  transform: scaleX(-1);
  z-index: 2;
}

.stage-status {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  z-index: 3;
}

.status-chip {
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  background: rgba(18, 24, 40, 0.72);
  border: 1px solid rgba(142, 158, 255, 0.28);
  color: rgba(230, 235, 255, 0.78);
}

.status-chip.ok {
  border-color: rgba(120, 255, 180, 0.65);
  color: #8cfbc8;
}

.status-chip.warn {
  border-color: rgba(255, 200, 115, 0.65);
  color: #ffcf8a;
}

.status-chip.idle {
  opacity: 0.65;
}

.stage-countdown {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(4rem, 12vw, 7rem);
  font-weight: 800;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 0 30px rgba(120, 180, 255, 0.75);
  z-index: 4;
  animation: countdownFlash 0.6s ease both;
}

@keyframes countdownFlash {
  0% { opacity: 0; transform: scale(0.6); }
  10% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.85); }
}

.stage-actions {
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.button-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.button {
  appearance: none;
  border: none;
  border-radius: 999px;
  padding: 0.8rem 1.6rem;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  color: #fefefe;
  background: linear-gradient(135deg, rgba(123, 94, 255, 0.95), rgba(24, 181, 255, 0.9));
  box-shadow: 0 16px 30px rgba(24, 140, 255, 0.35);
}

.button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 22px 38px rgba(24, 181, 255, 0.45);
}

.button:disabled {
  opacity: 0.55;
  cursor: default;
  box-shadow: none;
}

.button.outline {
  background: transparent;
  border: 1px solid rgba(150, 170, 255, 0.6);
  box-shadow: none;
}

.button.outline:hover:not(:disabled) {
  box-shadow: 0 12px 24px rgba(120, 140, 255, 0.28);
}

.button.ghost {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(245, 247, 255, 0.85);
  box-shadow: none;
}

.button.ghost:hover:not(:disabled) {
  box-shadow: 0 10px 24px rgba(255, 255, 255, 0.12);
}

.button.danger {
  background: linear-gradient(135deg, rgba(255, 110, 110, 0.95), rgba(255, 140, 90, 0.9));
  box-shadow: 0 16px 30px rgba(255, 110, 110, 0.32);
}

.button.sm {
  padding: 0.55rem 1.1rem;
  font-size: 0.82rem;
}

.button.back-button {
  align-self: center;
  padding-inline: 2.2rem;
  margin-top: 0.5rem;
}

.hint-text {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(210, 220, 255, 0.72);
}

.debug-panel {
  background: rgba(18, 24, 42, 0.78);
  border-radius: 14px;
  border: 1px solid rgba(120, 140, 220, 0.16);
  padding: 0.9rem 1rem;
  max-height: 180px;
  overflow: auto;
}

.debug-panel pre {
  margin: 0;
  white-space: pre-line;
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 0.78rem;
  color: rgba(190, 200, 255, 0.82);
}

.panel-title {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.78rem;
  color: rgba(210, 220, 255, 0.68);
  margin-bottom: 0.45rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: rgba(210, 220, 255, 0.6);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.card-header h3 {
  margin: 0.25rem 0 0;
  font-size: 2.4rem;
  font-weight: 700;
  color: rgba(240, 236, 255, 0.96);
}

.admin-active {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.similarity-block {
  margin: 1rem 0 1.2rem;
}

.similarity-meter {
  position: relative;
  width: 100%;
  height: 18px;
  border-radius: 999px;
  background: rgba(32, 36, 60, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.similarity-fill {
  position: absolute;
  inset: 0;
  width: var(--fill, 0%);
  background: linear-gradient(90deg, #7bffb2, #18b5ff);
  transition: width 0.2s ease;
}

.similarity-threshold {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  background: rgba(255, 120, 120, 0.9);
  left: var(--threshold, 70%);
}

.similarity-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.45rem;
  font-size: 0.7rem;
  color: rgba(190, 200, 255, 0.72);
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3rem 0.9rem;
  border-radius: 999px;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  background: rgba(123, 94, 255, 0.2);
  border: 1px solid rgba(123, 94, 255, 0.45);
  color: #cfd6ff;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.form-field label {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(210, 220, 255, 0.72);
}

.text-input {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(160, 190, 255, 0.28);
  background: rgba(14, 18, 36, 0.74);
  color: #f5f7fb;
  padding: 0.85rem 1rem;
  font-size: 1rem;
}

.text-input:focus {
  outline: none;
  border-color: rgba(136, 200, 255, 0.6);
  box-shadow: 0 0 0 2px rgba(80, 160, 255, 0.25);
}

.range-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.range-field input[type="range"] {
  width: 100%;
  accent-color: #7b5eff;
}

.library-card table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.library-card thead {
  background: rgba(46, 54, 96, 0.55);
}

.library-card th,
.library-card td {
  padding: 0.9rem 1rem;
  text-align: left;
  font-size: 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.library-card tbody tr:hover {
  background: rgba(46, 54, 92, 0.6);
}

.symbol-cell {
  font-size: 2rem;
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
}

.info-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: rgba(225, 230, 255, 0.8);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 12, 24, 0.6);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 20;
}

.modal-card {
  width: min(580px, 100%);
  max-height: min(600px, 90vh);
  overflow: auto;
  background: linear-gradient(150deg, rgba(26, 30, 52, 0.95), rgba(38, 40, 70, 0.92));
  border-radius: 24px;
  border: 1px solid rgba(120, 160, 255, 0.35);
  box-shadow: 0 32px 60px rgba(8, 12, 28, 0.65);
  padding: 1.75rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.modal-card h2 {
  margin: 0;
  font-size: 1.6rem;
}

.capture-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.capture-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1.1rem;
  border-radius: 14px;
  background: rgba(28, 32, 60, 0.82);
  border: 1px solid rgba(150, 170, 255, 0.18);
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.empty-state {
  background: rgba(44, 36, 86, 0.55);
  border-radius: 14px;
  padding: 1rem;
  text-align: center;
  color: rgba(220, 225, 255, 0.75);
}

@media (max-width: 1024px) {
  .workspace {
    flex-direction: column;
  }
  .control-column {
    flex: 1 1 auto;
  }
}

@media (max-width: 640px) {
  .dev-mode-page {
    padding-inline: 1.1rem;
  }
  .dev-hero {
    flex-direction: column;
    align-items: flex-start;
  }
  .button-row {
    width: 100%;
    flex-direction: column;
  }
  .actions-cell {
    flex-direction: column;
  }
}
`;

const DevMode: React.FC = () => {
  const [isModelReady, setIsModelReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [debugInfo, setDebugInfo] = useState("No hand detected");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [savedGestures, setSavedGestures] = useState<GestureSummary[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedGestureDetail, setSelectedGestureDetail] = useState<GestureDefinition | null>(null);
  const [liveSimilarity, setLiveSimilarity] = useState(0);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSymbolName, setNewSymbolName] = useState("");
  const [newSymbolThreshold, setNewSymbolThreshold] = useState(55);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [manageThreshold, setManageThreshold] = useState(55);
  const [adminMode, setAdminMode] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const currentLandmarksRef = useRef<any>(null);
  const selectedSymbolRef = useRef<string | null>(null);
  const lastMatchTimeRef = useRef<number>(0);
  const processingRef = useRef(false);

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = DEV_MODE_STYLES;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  useEffect(() => {
    selectedSymbolRef.current = selectedSymbol;
  }, [selectedSymbol]);

  useEffect(() => {
    const initializeHands = async () => {
      try {
        const hands = new Hands({
          locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults(onHandsResults);
        handsRef.current = hands;
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsModelReady(true);
      } catch (error) {
        console.error("Failed to initialize MediaPipe Hands:", error);
        toaster.create({
          title: "Error",
          description: "Failed to load hand detection model. Please refresh the page.",
          type: "error"
        });
      }
    };

    initializeHands();

    return () => {
      stopCamera();
      handsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    void loadSavedGestures();
  }, []);

  const loadSavedGestures = async () => {
    try {
      const response = await getAllGestures();
      setSavedGestures(response.symbols);
    } catch (error) {
      console.error("Failed to load gestures:", error);
    }
  };

  const handleAdminCodeSubmit = () => {
    if (adminCodeInput === ADMIN_PASSWORD) {
      setAdminMode(true);
      setAdminCodeInput("");
      toaster.create({
        title: "Admin Mode Activated",
        description: "You now have full editing access.",
        type: "success"
      });
    } else {
      toaster.create({
        title: "Access Denied",
        description: "Incorrect admin code.",
        type: "error"
      });
      setAdminCodeInput("");
    }
  };

  const handleAdminLogout = () => {
    setAdminMode(false);
    toaster.create({
      title: "Admin Mode Deactivated",
      description: "Editing functions disabled.",
      type: "info"
    });
  };

  const onHandsResults = async (results: Results) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) {
      return;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.image) {
      canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setHandDetected(true);
      currentLandmarksRef.current = results.multiHandLandmarks;

      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: "#7bffb2",
          lineWidth: 2
        });
        drawLandmarks(canvasCtx, landmarks, {
          color: "#ffe066",
          lineWidth: 1,
          radius: 3
        });

        setDebugInfo(getHandPoseDebugInfo(landmarks));
      }

      if (selectedSymbolRef.current) {
        const now = Date.now();
        const timeSinceLastMatch = now - lastMatchTimeRef.current;

        if (timeSinceLastMatch >= 200) {
          lastMatchTimeRef.current = now;
          try {
            const landmarksArray = results.multiHandLandmarks.map(hand => landmarksToArray(hand));
            const matchResponse = await matchGesture({
              symbol: selectedSymbolRef.current,
              landmarks: landmarksArray
            });
            setLiveSimilarity(matchResponse.similarity || 0);
          } catch (error) {
            setLiveSimilarity(0);
          }
        }
      }
    } else {
      setHandDetected(false);
      currentLandmarksRef.current = null;
      setDebugInfo("No hand detected");
      if (selectedSymbolRef.current) {
        setLiveSimilarity(0);
      }
    }

    canvasCtx.restore();
  };

  const startCamera = async () => {
    if (!handsRef.current) {
      toaster.create({
        title: "Error",
        description: "Hand detection model is still loading.",
        type: "error"
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 960, height: 540 },
        audio: false
      });

      if (!videoRef.current) {
        throw new Error("Video element not initialized");
      }

      videoRef.current.srcObject = stream;

      await new Promise<void>(resolve => {
        const video = videoRef.current;
        if (!video) {
          resolve();
          return;
        }
        video.onloadedmetadata = () => {
          const width = video.videoWidth || 960;
          const height = video.videoHeight || 540;
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = width;
            canvas.height = height;
          }
          video.play().catch(() => undefined);
          resolve();
        };
        if (video.readyState >= 1 && video.videoWidth > 0) {
          video.onloadedmetadata?.(new Event("loadedmetadata"));
        }
      });

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (!handsRef.current || !videoRef.current) {
            return;
          }
          if (processingRef.current) {
            return;
          }
          processingRef.current = true;
          try {
            await handsRef.current.send({ image: videoRef.current });
          } catch (err) {
            console.error("Error sending frame:", err);
          } finally {
            processingRef.current = false;
          }
        },
        width: 960,
        height: 540
      });

      await camera.start();
      cameraRef.current = camera;
      setCameraActive(true);
      setCameraReady(true);

      toaster.create({
        title: "Camera Started",
        description: "Camera is now active.",
        type: "success"
      });
    } catch (error) {
      console.error("Failed to start camera:", error);
      toaster.create({
        title: "Camera Error",
        description: "Failed to access camera.",
        type: "error"
      });
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    processingRef.current = false;
    if (videoRef.current?.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  };

  const handleCreateGesture = async () => {
    if (!newSymbolName.trim()) {
      toaster.create({
        title: "Error",
        description: "Please enter a symbol name!",
        type: "error"
      });
      return;
    }

    const existing = savedGestures.find(g => g.symbol === newSymbolName.trim());
    if (existing) {
      toaster.create({
        title: "Error",
        description: "This symbol already exists!",
        type: "error"
      });
      return;
    }

    setIsAddingNew(false);
    const symbol = newSymbolName.trim();
    setSelectedSymbol(symbol);
    setSelectedGestureDetail({ symbol, variants: [], threshold: newSymbolThreshold / 100 });
    setNewSymbolName("");

    toaster.create({
      title: "Gesture Created",
      description: `"${symbol}" created. Add captures now!`,
      type: "success"
    });
  };

  const handleAddCapture = () => {
    if (!selectedSymbol) {
      return;
    }
    if (!handDetected || !currentLandmarksRef.current) {
      toaster.create({
        title: "Error",
        description: "No hand detected!",
        type: "error"
      });
      return;
    }

    setCountdown(3);
    const countdownInterval = window.setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          window.clearInterval(countdownInterval);
          void captureGesture();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const captureGesture = async () => {
    if (!currentLandmarksRef.current || !selectedSymbol) {
      return;
    }

    try {
      const landmarksArray = currentLandmarksRef.current.map((hand: any) => landmarksToArray(hand));
      const threshold = selectedGestureDetail?.threshold || newSymbolThreshold / 100;

      const response = await saveGesture({
        symbol: selectedSymbol,
        handCount: landmarksArray.length,
        landmarks: landmarksArray,
        threshold
      });

      toaster.create({
        title: "Capture Added!",
        description: `Total captures: ${response.totalVariants}`,
        type: "success"
      });

      const updatedGesture = await getGestureBySymbol(selectedSymbol);
      setSelectedGestureDetail(updatedGesture);
      await loadSavedGestures();
    } catch (error) {
      console.error("Failed to save capture:", error);
      toaster.create({
        title: "Error",
        description: "Failed to save capture.",
        type: "error"
      });
    }
  };

  const handleSelectGesture = async (symbol: string) => {
    if (!cameraActive) {
      toaster.create({
        title: "Error",
        description: "Please start the camera first!",
        type: "error"
      });
      return;
    }

    try {
      const gestureDetail = await getGestureBySymbol(symbol);
      setSelectedSymbol(symbol);
      setSelectedGestureDetail(gestureDetail);
      setLiveSimilarity(0);
    } catch (error) {
      console.error("Failed to load gesture:", error);
    }
  };

  const handleDeselectGesture = () => {
    setSelectedSymbol(null);
    setSelectedGestureDetail(null);
    setLiveSimilarity(0);
  };

  const handleOpenManage = async (symbol: string) => {
    try {
      const gestureDetail = await getGestureBySymbol(symbol);
      setSelectedSymbol(symbol);
      setSelectedGestureDetail(gestureDetail);
      setManageThreshold(Math.round(gestureDetail.threshold * 100));
      setIsManageDialogOpen(true);
    } catch (error) {
      console.error("Failed to load gesture:", error);
    }
  };

  const handleUpdateThreshold = async () => {
    if (!selectedSymbol) {
      return;
    }

    try {
      await updateGestureThreshold(selectedSymbol, manageThreshold / 100);
      toaster.create({
        title: "Success",
        description: `Threshold updated to ${manageThreshold}%`,
        type: "success"
      });
      const updatedGesture = await getGestureBySymbol(selectedSymbol);
      setSelectedGestureDetail(updatedGesture);
      await loadSavedGestures();
    } catch (error) {
      console.error("Failed to update threshold:", error);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!selectedSymbol) {
      return;
    }

    const symbolName = selectedSymbol;
    const isLastVariant = selectedGestureDetail && selectedGestureDetail.variants.length === 1;

    if (isLastVariant) {
      if (!confirm("This is the last capture. Deleting it will remove the entire gesture. Continue?")) {
        return;
      }
      try {
        await deleteGesture(symbolName);
        setIsManageDialogOpen(false);
        setSelectedSymbol(null);
        setSelectedGestureDetail(null);
        setLiveSimilarity(0);
        await loadSavedGestures();
        toaster.create({
          title: "Gesture Deleted",
          description: "Last capture deleted. Symbol removed from library.",
          type: "info"
        });
      } catch (error) {
        console.error("Failed to delete gesture:", error);
        toaster.create({
          title: "Error",
          description: "Failed to delete gesture.",
          type: "error"
        });
      }
    } else {
      if (!confirm("Delete this capture?")) {
        return;
      }
      try {
        await deleteGestureVariant(symbolName, variantId);
        await loadSavedGestures();
        const updatedGesture = await getGestureBySymbol(symbolName);
        setSelectedGestureDetail(updatedGesture);
        toaster.create({
          title: "Success",
          description: "Capture deleted!",
          type: "success"
        });
      } catch (error) {
        console.error("Failed to delete variant:", error);
        toaster.create({
          title: "Error",
          description: "Failed to delete capture.",
          type: "error"
        });
      }
    }
  };

  const handleDeleteAll = async () => {
    if (!selectedSymbol) {
      return;
    }

    const symbolToDelete = selectedSymbol;
    const firstConfirm = confirm(
      `⚠️ WARNING: This will delete ALL captures and the symbol "${symbolToDelete}"!\n\nAre you sure you want to continue?`
    );
    if (!firstConfirm) {
      return;
    }
    const secondConfirm = confirm(
      `⚠️ FINAL CONFIRMATION: Delete "${symbolToDelete}" permanently?\n\nThis action CANNOT be undone!`
    );
    if (!secondConfirm) {
      return;
    }

    try {
      await deleteGesture(symbolToDelete);
      setIsManageDialogOpen(false);
      setSelectedSymbol(null);
      setSelectedGestureDetail(null);
      setLiveSimilarity(0);
      await loadSavedGestures();
      toaster.create({
        title: "Gesture Deleted",
        description: `"${symbolToDelete}" has been permanently deleted.`,
        type: "success"
      });
    } catch (error) {
      console.error("Failed to delete gesture:", error);
      toaster.create({
        title: "Error",
        description: "Failed to delete gesture.",
        type: "error"
      });
    }
  };

  const getThreshold = () => selectedGestureDetail?.threshold || 0.55;
  const thresholdPercent = Math.round(getThreshold() * 100);

  return (
    <div className="dev-mode-page">
      <Toaster />
      <main className="dev-shell">
        <header className="dev-hero">
          <div>
            <h1>Gesture Dev Lab</h1>
            <p>Record, tune, and manage custom gestures.</p>
          </div>
          <div className="dev-hero-actions">
            <button className="button outline" onClick={() => (window.location.href = "/")}
            >
              ← Back to Menu
            </button>
          </div>
        </header>

        <section className="workspace">
          <div className="stage-column">
            <div className="dev-card info-card">
              <div className="panel-title">Workflow Tips</div>
              <ul>
                <li>1. Record 2–3 captures per gesture for best results.</li>
                <li>2. Use consistent lighting and framing when capturing.</li>
                <li>3. Adjust the match threshold if recognition feels too strict or lenient.</li>
                <li>4. Need raw debugging data? Keep the camera running to inspect live metrics.</li>
              </ul>
            </div>
            <div className="dev-card stage-card">
              <div className="stage-wrapper">
                <video ref={videoRef} playsInline muted />
                <canvas ref={canvasRef} />
                <div className="stage-status">
                  <span className={`status-chip ${isModelReady ? "ok" : "warn"}`}>
                    {isModelReady ? "Model Ready" : "Loading Model"}
                  </span>
                  <span className={`status-chip ${cameraReady ? "ok" : "warn"}`}>
                    {cameraReady ? "Camera Ready" : "Camera Offline"}
                  </span>
                  <span className={`status-chip ${handDetected ? "ok" : "idle"}`}>
                    {handDetected ? "Hand Detected" : "No Hand"}
                  </span>
                </div>
                {countdown !== null && <div className="stage-countdown">{countdown}</div>}
              </div>

              <div className="stage-actions">
                <div className="button-row">
                  <button
                    className="button"
                    onClick={startCamera}
                    disabled={!isModelReady || cameraActive}
                  >
                    {cameraActive ? "Camera Running" : isModelReady ? "Start Camera" : "Loading Model…"}
                  </button>
                  <button className="button outline" onClick={stopCamera} disabled={!cameraActive}>
                    Stop Camera
                  </button>
                </div>
                <p className="hint-text">
                  {cameraActive
                    ? handDetected
                      ? "Camera streaming. Keep your hand inside the frame to preview landmarks."
                      : "Camera active. Show your hand to the lens to preview landmarks."
                    : "Start the camera to preview and capture gestures."}
                </p>
                {cameraActive && (
                  <div className="debug-panel">
                    <div className="panel-title">Debug Info</div>
                    <pre>{debugInfo}</pre>
                  </div>
                )}
              </div>
            </div>

            {selectedSymbol && (
              <div className="dev-card">
                <div className="card-header">
                  <div>
                    <span className="eyebrow">Editing Symbol</span>
                    <h3>{selectedSymbol}</h3>
                  </div>
                  <button className="button ghost" onClick={handleDeselectGesture}>
                    Done
                  </button>
                </div>

                {selectedGestureDetail && selectedGestureDetail.variants.length > 0 ? (
                  <div className="similarity-block">
                    <div className="panel-title">Live Similarity · {Math.round(liveSimilarity * 100)}%</div>
                    <div className="similarity-meter">
                      <div
                        className="similarity-fill"
                        style={{ width: `${Math.min(100, Math.max(0, liveSimilarity * 100))}%` }}
                      />
                      <div
                        className="similarity-threshold"
                        style={{ left: `${thresholdPercent}%` }}
                      />
                    </div>
                    <div className="similarity-labels">
                      <span>0%</span>
                      <span>Threshold {thresholdPercent}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">No captures yet. Add your first capture below.</div>
                )}

                <button
                  className="button"
                  onClick={handleAddCapture}
                  disabled={!adminMode || !cameraActive || !handDetected || countdown !== null}
                  title={
                    !adminMode
                      ? "Admin mode required"
                      : !cameraActive
                      ? "Start the camera first"
                      : !handDetected
                      ? "Show your hand to the camera"
                      : undefined
                  }
                >
                  {countdown !== null ? `Capturing in ${countdown}…` : "Add Capture (3s countdown)"}
                </button>
                <p className="hint-text">
                  {selectedGestureDetail?.variants.length ?? 0} capture(s) recorded
                </p>
              </div>
            )}
          </div>

          <aside className="control-column">
            <div className="dev-card">
              <div className="panel-title">Admin Code: </div>
              {adminMode ? (
                <div className="admin-active">
                  <p className="hint-text">Admin controls unlocked.</p>
                  <button className="button outline" onClick={handleAdminLogout}>
                    Disable Admin Mode
                  </button>
                </div>
              ) : (
                <form
                  className="form-field"
                  onSubmit={event => {
                    event.preventDefault();
                    handleAdminCodeSubmit();
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "row", gap: "0.6rem" }}>

                    <input
                      id="admin-code"
                      type="password"
                      className="text-input"
                      value={adminCodeInput}
                      onChange={event => setAdminCodeInput(event.target.value)}
                      placeholder="Enter admin code"
                    />
                    <div className="button-row">
                      <button className="button" type="submit" disabled={!adminCodeInput.trim()}>
                        Unlock
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="dev-card library-card">
              <div className="card-header">
                <div>
                  <div className="panel-title">Gestures</div>
                  <p className="hint-text">Select a symbol to edit captures.</p>
                </div>
                <button
                  className="button"
                  onClick={() => setIsAddingNew(true)}
                  disabled={!adminMode}
                  title={!adminMode ? "Admin mode required" : undefined}
                >
                  + Add
                </button>
              </div>
              {savedGestures.length === 0 ? (
                <div className="empty-state">No gestures yet. Create one above!</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Captures</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedGestures.map(gesture => (
                      <tr key={gesture.symbol}>
                        <td className="symbol-cell">{gesture.symbol}</td>
                        <td>
                          <span className="pill">{gesture.variantCount}</span>
                        </td>
                        <td className="actions-cell">
                          <button
                            className="button ghost sm"
                            onClick={() => handleSelectGesture(gesture.symbol)}
                            disabled={!cameraActive}
                            title={!cameraActive ? "Start the camera first" : undefined}
                          >
                            {selectedSymbol === gesture.symbol ? "Editing…" : "Edit"}
                          </button>
                          <button
                            className="button outline sm"
                            onClick={() => handleOpenManage(gesture.symbol)}
                            disabled={!adminMode}
                            title={!adminMode ? "Admin mode required" : undefined}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </aside>
        </section>
      </main>

      {isManageDialogOpen && selectedGestureDetail && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>
              Manage:&nbsp;
              <span>{selectedSymbol}</span>
            </h2>

            <div className="range-field">
              <div className="panel-title" style={{ marginBottom: 0 }}>
                Match Threshold · {manageThreshold}%
              </div>
              <input
                type="range"
                min={30}
                max={90}
                value={manageThreshold}
                onChange={event => setManageThreshold(Number(event.target.value))}
              />
              <div className="button-row">
                <button
                  className="button sm"
                  onClick={handleUpdateThreshold}
                  disabled={manageThreshold === thresholdPercent}
                >
                  Update Threshold
                </button>
              </div>
            </div>

            {selectedGestureDetail.variants.length === 0 ? (
              <div className="empty-state">No captures yet.</div>
            ) : (
              <div className="capture-list">
                {selectedGestureDetail.variants.map((variant, index) => (
                  <div className="capture-item" key={variant.id}>
                    <div>
                      <div className="pill">Capture {index + 1}</div>
                      <div className="hint-text">
                        {variant.handCount} hand{variant.handCount !== 1 ? "s" : ""} · {new Date(variant.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      className="button outline sm"
                      onClick={() => handleDeleteVariant(variant.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button className="button danger sm" onClick={handleDeleteAll}>
                Delete All Captures
              </button>
              <button className="button ghost sm" onClick={() => setIsManageDialogOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevMode;
