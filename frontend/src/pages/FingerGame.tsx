import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hands, type Results } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { getRandomGesture, matchGesture, type GestureDefinition } from "../gestureApi";
import { landmarksToArray } from "../advancedGestureRecognition";
import { submitScore } from "../leaderboardApi";
import { useUser } from "@/context/UserContext";
import { useRewardSound } from "../context/rewardSoundContext";
import { Toaster, toaster } from "@/components/ui/toaster";

const FINGER_GAME_STYLES = `
.finger-game-page {
  color-scheme: dark;
  font-family: "Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
  background: radial-gradient(circle at top, #1f1f2e, #0d0d15);
  color: #f5f7fb;
  min-height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  box-sizing: border-box;
}

.finger-game-page main {
  width: min(100%, 1360px);
  min-height: 95vh;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  padding-bottom: 2rem;
}

.finger-game-page .top-bar {
  display: flex;
  justify-content: center;
}

.finger-game-page .timebar {
  position: relative;
  width: min(100%, 640px);
  height: 45px;
  border-radius: 999px;
  background: rgba(55, 70, 120, 0.35);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.finger-game-page .timebar-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #18b5ff, #7b5eff);
  transform-origin: left center;
  z-index: 0;
}

.finger-game-page .timebar-label {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: rgba(245, 247, 255, 0.92);
  text-shadow: 0 0 24px rgba(120, 180, 255, 0.55);
  pointer-events: none;
}

.finger-game-page .game-layout {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 1.5rem;
  flex-wrap: nowrap;
}

.finger-game-page .side-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: clamp(320px, 26vw, 380px);
  flex: 0 0 clamp(320px, 26vw, 380px);
  min-height: clamp(420px, 72vh, 720px);
}

.finger-game-page .summary-card,
.finger-game-page .prompt-card,
.finger-game-page .metrics-card {
  position: relative;
  background: linear-gradient(160deg, rgba(40, 35, 80, 0.42), rgba(20, 30, 55, 0.32));
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 16px 30px rgba(15, 15, 30, 0.38);
  padding: 1.4rem 1.6rem;
}

.finger-game-page .prompt-card h2 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(245, 247, 251, 0.72);
}

.finger-game-page .prompt-emoji {
  font-size: 3rem;
  line-height: 1;
  color: #f9f9ff;
  margin-bottom: 0.75rem;
}

.finger-game-page .prompt-details {
  font-size: 1.05rem;
  line-height: 1.6;
  color: rgba(230, 235, 255, 0.82);
  word-break: keep-all;
}

.finger-game-page .summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.9rem;
}

.finger-game-page .summary-tile {
  background: rgba(15, 20, 38, 0.55);
  border-radius: 12px;
  padding: 0.95rem 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.finger-game-page .summary-tile span {
  display: block;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(210, 220, 255, 0.68);
  margin-bottom: 0.4rem;
}

.finger-game-page .summary-tile strong {
  font-size: 1.75rem;
  font-weight: 700;
  color: #ffe066;
  text-shadow: 0 0 12px rgba(255, 224, 102, 0.4);
}

.finger-game-page .metrics-card h3 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(220, 230, 255, 0.72);
}

.finger-game-page .metric-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.95rem;
  color: rgba(235, 240, 255, 0.82);
}

.finger-game-page .metric-row strong {
  font-size: 1.3rem;
  color: #7bffb2;
}

.finger-game-page .stage-wrapper {
  position: relative;
  flex: 1 1 clamp(760px, 60vw, 1080px);
  max-width: 1080px;
  min-height: clamp(420px, 72vh, 720px);
  display: flex;
}

.finger-game-page .stage {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  box-shadow: 0 30px 60px rgba(15, 15, 30, 0.6);
  background: linear-gradient(135deg, rgba(90, 80, 180, 0.35), rgba(25, 220, 250, 0.15));
  aspect-ratio: 16 / 9;
  width: 100%;
  min-height: inherit;
}

.finger-game-page .stage video,
.finger-game-page .stage canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  background: #000;
}

.finger-game-page .stage video {
  object-fit: contain;
  filter: saturate(1.05) contrast(1.08);
  transform: scaleX(-1);
  z-index: 1;
}

.finger-game-page .stage canvas {
  pointer-events: none;
  transform: scaleX(-1);
  z-index: 2;
}

.finger-game-page .ready-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.5rem;
  background: rgba(10, 14, 30, 0.45);
  backdrop-filter: blur(6px);
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.4;
  z-index: 3;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

.finger-game-page .ready-overlay.visible {
  opacity: 1;
}

.finger-game-page .countdown-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(5rem, 12vw, 8rem);
  font-weight: 800;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 0 30px rgba(120, 180, 255, 0.75);
  animation: countdownFade 0.6s ease forwards;
  z-index: 4;
}

.finger-game-page .countdown-overlay.final {
  color: #9dffb4;
  text-shadow: 0 0 36px rgba(120, 255, 180, 0.85);
}

@keyframes countdownFade {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
  10% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.85);
  }
}

.finger-game-page .controls-row {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.finger-game-page button {
  appearance: none;
  padding: 0.9rem 1.5rem;
  border-radius: 999px;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, #7b5eff, #18b5ff);
  color: #fff;
  box-shadow: 0 12px 24px rgba(13, 110, 253, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.finger-game-page button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(24, 181, 255, 0.45);
}

.finger-game-page button:disabled {
  opacity: 0.5;
  cursor: default;
  box-shadow: none;
}

.finger-game-page .back-button {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(251, 251, 251, 0.07));
  color: #f5f7fb;
  box-shadow: 0 12px 24px rgba(50, 50, 50, 0.38);
}

.finger-game-page .back-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(96, 96, 96, 0.45);
}

.finger-game-page .status-line {
  text-align: center;
  font-size: 1rem;
  color: rgba(225, 235, 255, 0.85);
  letter-spacing: 0.02em;
}

.finger-game-page .post-game-modal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: rgba(10, 14, 24, 0.55);
  backdrop-filter: blur(8px);
  z-index: 5;
}

.finger-game-page .post-game-card {
  width: min(100%, 520px);
  padding: 1.75rem 2rem;
  border-radius: 24px;
  background: linear-gradient(150deg, rgba(30, 32, 60, 0.9), rgba(45, 48, 88, 0.82));
  border: 1px solid rgba(140, 200, 255, 0.35);
  box-shadow: 0 24px 50px rgba(10, 15, 35, 0.6);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.finger-game-page .post-game-progress {
  position: relative;
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 80, 80, 0.2);
  overflow: hidden;
  border: 1px solid rgba(255, 120, 120, 0.45);
}

.finger-game-page .post-game-progress-bar {
  position: absolute;
  inset: 0;
  transform-origin: left;
  background: linear-gradient(90deg, #ff4d6d, #ff7849);
}

.finger-game-page .post-game-input {
  width: 100%;
  background: rgba(12, 16, 30, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  padding: 0.85rem 1rem;
  color: #fefefe;
  font-size: 1rem;
}

.finger-game-page .post-game-input::placeholder {
  color: rgba(210, 220, 255, 0.6);
}

.finger-game-page .post-game-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.finger-game-page .hidden-video {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .finger-game-page .game-layout {
    flex-direction: column;
    align-items: stretch;
  }

  .finger-game-page .side-panel {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .finger-game-page .prompt-card,
  .finger-game-page .summary-card,
  .finger-game-page .metrics-card {
    flex: 1 1 280px;
  }
}

@media (max-width: 640px) {
  .finger-game-page main {
    gap: 1.25rem;
  }

  .finger-game-page .stage {
    min-height: 300px;
  }

  .finger-game-page .side-panel {
    flex-direction: column;
    gap: 1rem;
  }
}
`;

const SIMILARITY_THRESHOLD = 0.55;
const GAME_DURATION_MS = 60_000;
const POST_GAME_TIMEOUT_MS = 30_000;

type PostGameState = {
  score: number;
  symbols: number;
  remainingMs: number;
  submitting: boolean;
  error?: string;
};

const FingerGame = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { playSound } = useRewardSound();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const statusMessageRef = useRef<HTMLDivElement>(null);
  const timebarFillRef = useRef<HTMLDivElement>(null);
  const timebarLabelRef = useRef<HTMLDivElement>(null);
  const readyOverlayRef = useRef<HTMLDivElement>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const matchCooldownRef = useRef(false);
  const postGamePromptRef = useRef<PostGameState | null>(null);
  const postGameDeadlineRef = useRef<number | null>(null);
  const postGameTimerRef = useRef<number | null>(null);
  const timerFrameRef = useRef<number | null>(null);
  const gameStartTimeRef = useRef<number>(0);
  const disposedRef = useRef(false);
  const currentSymbolRef = useRef<string | null>(null);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const symbolsRef = useRef(0);
  const cameraReadyRef = useRef(false);
  const thumbHoldStartRef = useRef<number | null>(null);
  const countdownActiveRef = useRef(false);

  const [currentSymbol, setCurrentSymbol] = useState<string | null>(null);
  const [currentDefinition, setCurrentDefinition] = useState<GestureDefinition | null>(null);
  const [score, setScore] = useState(0);
  const [symbolsCompleted, setSymbolsCompleted] = useState(0);
  const [similarity, setSimilarity] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdownText, setCountdownText] = useState<string | null>(null);
  const [postGamePrompt, setPostGamePrompt] = useState<PostGameState | null>(null);
  const [teamName, setTeamName] = useState(user?.username ?? "");
  const [statusMessage, setStatusMessage] = useState("Press Start or hold both thumbs up to begin.");
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [gameActive, setGameActive] = useState(false);

  currentSymbolRef.current = currentSymbol;
  gameActiveRef.current = gameActive;
  scoreRef.current = score;
  symbolsRef.current = symbolsCompleted;
  useEffect(() => {
    cameraReadyRef.current = cameraReady;
  }, [cameraReady]);

  useEffect(() => {
    setTeamName(user?.username ?? "");
  }, [user]);

  const updateStatusLine = (message: string) => {
    if (
      statusMessageRef.current?.textContent === message &&
      statusMessage === message
    ) {
      return;
    }
    setStatusMessage(message);
    if (statusMessageRef.current) {
      statusMessageRef.current.textContent = message;
    }
  };

  const describeCameraError = (error: unknown) => {
    let message = "Failed to access camera. ";
    if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        message += "Please allow camera permissions and try again.";
      } else if (error.name === "NotFoundError") {
        message += "No compatible camera was found.";
      } else if (error.name === "NotReadableError") {
        message += "Camera is currently in use by another application.";
      } else {
        message += error.message;
      }
    } else {
      message += "Please try again.";
    }
    return message;
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (videoRef.current?.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    cameraReadyRef.current = false;
    if (!disposedRef.current) {
      setCameraReady(false);
    }
  };

  const updateTimebar = (remainingMs: number) => {
    const fill = timebarFillRef.current;
    const label = timebarLabelRef.current;
    if (!fill || !label) {
      return;
    }
    const clamped = Math.max(0, Math.min(GAME_DURATION_MS, remainingMs));
    const ratio = clamped / GAME_DURATION_MS;
    fill.style.transform = `scaleX(${ratio})`;
    label.textContent = `${(clamped / 1000).toFixed(1)}s`;
  };

  const exitToMenu = () => {
    if (postGameTimerRef.current) {
      cancelAnimationFrame(postGameTimerRef.current);
      postGameTimerRef.current = null;
    }
    postGameDeadlineRef.current = null;
    postGamePromptRef.current = null;
    setPostGamePrompt(null);
    setTeamName(user?.username ?? "");
    setCountdownText(null);
    updateStatusLine("Returning to menu...");
    navigate("/play");
  };

  const handleSubmitScore = async () => {
    const prompt = postGamePromptRef.current;
    if (!prompt) {
      return;
    }

    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setPostGamePrompt(prev => (prev ? { ...prev, error: "Please enter a name before submitting." } : prev));
      return;
    }

    setPostGamePrompt(prev => (prev ? { ...prev, submitting: true, error: undefined } : prev));

    try {
      await submitScore({
        name: trimmedName,
        score: prompt.score,
        symbols: prompt.symbols,
        gameMode: "single",
        gameType: "finger"
      });
      setPostGamePrompt(prev => (prev ? { ...prev, submitting: false } : prev));
      updateStatusLine("Score submitted! Returning to menu...");
      setTimeout(() => exitToMenu(), 1500);
    } catch (error) {
      console.error(error);
      setPostGamePrompt(prev =>
        prev ? { ...prev, submitting: false, error: "Failed to submit score. Please try again." } : prev
      );
    }
  };

  const startPostGameCountdown = () => {
    if (!postGameDeadlineRef.current) {
      return;
    }
    if (postGameTimerRef.current) {
      cancelAnimationFrame(postGameTimerRef.current);
    }
    const tick = () => {
      if (disposedRef.current || !postGameDeadlineRef.current || !postGamePromptRef.current) {
        return;
      }
      const remaining = Math.max(0, postGameDeadlineRef.current - performance.now());
      setPostGamePrompt(prev => (prev ? { ...prev, remainingMs: remaining } : prev));
      if (remaining <= 0) {
        exitToMenu();
        return;
      }
      postGameTimerRef.current = requestAnimationFrame(tick);
    };
    postGameTimerRef.current = requestAnimationFrame(tick);
  };

  const triggerPostGamePrompt = (scoreValue: number, symbolCount: number) => {
    postGameDeadlineRef.current = performance.now() + POST_GAME_TIMEOUT_MS;
    const prompt: PostGameState = {
      score: scoreValue,
      symbols: symbolCount,
      remainingMs: POST_GAME_TIMEOUT_MS,
      submitting: false
    };
    postGamePromptRef.current = prompt;
    setPostGamePrompt(prompt);
    setTeamName(user?.username ?? "Player");
    startPostGameCountdown();
    updateStatusLine("Round complete! Submit your score or wait to return to the menu.");
  };

  const endGameSession = (options?: { aborted?: boolean }) => {
    if (!gameActiveRef.current) {
      return;
    }
    setGameActive(false);
    if (timerFrameRef.current) {
      cancelAnimationFrame(timerFrameRef.current);
      timerFrameRef.current = null;
    }
    updateTimebar(0);
    if (options?.aborted) {
      updateStatusLine("Round cancelled. Press Start to try again.");
      setCountdownText(null);
      return;
    }
    triggerPostGamePrompt(scoreRef.current, symbolsRef.current);
  };

  useEffect(() => {
    disposedRef.current = false;
    const styleEl = document.createElement("style");
    styleEl.textContent = FINGER_GAME_STYLES;
    document.head.appendChild(styleEl);

    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const startButton = startButtonRef.current;
    const resetButton = resetButtonRef.current;
    const timebarFillEl = timebarFillRef.current;
    const timebarLabelEl = timebarLabelRef.current;
    const readyOverlayEl = readyOverlayRef.current;

    if (
      !videoElement ||
      !canvasElement ||
      !startButton ||
      !timebarFillEl ||
      !timebarLabelEl ||
      !readyOverlayEl
    ) {
      return () => {
        disposedRef.current = true;
        document.head.removeChild(styleEl);
      };
    }

    const canvasCtx = canvasElement.getContext("2d", { willReadFrequently: false }) as
      | CanvasRenderingContext2D
      | null;
    if (!canvasCtx) {
      return () => {
        disposedRef.current = true;
        document.head.removeChild(styleEl);
      };
    }

    const showReadyOverlay = (message: string) => {
      readyOverlayEl.innerHTML = message;
      readyOverlayEl.classList.add("visible");
    };

    const hideReadyOverlay = () => {
      readyOverlayEl.classList.remove("visible");
    };

    const loadNextSymbol = async () => {
      setLoadingPrompt(true);
      try {
        const response = await getRandomGesture();
        setCurrentSymbol(response.symbol);
        setCurrentDefinition(response.definition);
        setSimilarity(0);
      } catch (error) {
        console.error("Failed to load random gesture:", error);
        toaster.create({
          title: "No Gestures",
          description: "No recorded gestures found. Capture some in Dev Mode first!",
          type: "error"
        });
        endGameSession({ aborted: true });
      } finally {
        setLoadingPrompt(false);
      }
    };

    const handleSymbolMatch = (matchSimilarity: number) => {
      const points = Math.round(matchSimilarity * 300);
      setScore(prev => prev + points);
      setSymbolsCompleted(prev => prev + 1);
      playSound();
      toaster.create({
        title: "Match!",
        description: `+${points} points`,
        type: "success"
      });
      void loadNextSymbol();
    };

    const updateGameClock = (now: number) => {
      if (!gameActiveRef.current) {
        return;
      }
      const elapsed = now - gameStartTimeRef.current;
      const remaining = Math.max(0, GAME_DURATION_MS - elapsed);
      updateTimebar(remaining);
      if (remaining <= 0) {
        endGameSession();
        return;
      }
      timerFrameRef.current = requestAnimationFrame(updateGameClock);
    };

    const loadHandsModule = async () => {
      if (handsRef.current) {
        return;
      }
      const hands = new Hands({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3
      });
      handsRef.current = hands;
    };

    const isThumbUpGesture = (landmarks: Array<{ x: number; y: number }>) => {
      if (!landmarks?.length) {
        return false;
      }
      const thumbTip = landmarks[4];
      const thumbMcp = landmarks[2];
      if (!thumbTip || !thumbMcp) {
        return false;
      }
      const thumbExtended = thumbTip.y < thumbMcp.y - 0.02;
      const foldedPairs: Array<[number, number]> = [
        [8, 6],
        [12, 10],
        [16, 14],
        [20, 18]
      ];
      const otherFingersFolded = foldedPairs.every(([tipIdx, pipIdx]) => {
        const tip = landmarks[tipIdx];
        const pip = landmarks[pipIdx];
        return tip && pip ? tip.y > pip.y + 0.015 : false;
      });
      return thumbExtended && otherFingersFolded;
    };

    const handleHandsResults = async (results: Results) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      if (results.image) {
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
      }

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        setHandDetected(true);
        const thumbsUpHands = results.multiHandLandmarks.filter(isThumbUpGesture).length;
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
        }

        if (gameActiveRef.current && currentSymbolRef.current && !matchCooldownRef.current) {
          try {
            const landmarksArray = results.multiHandLandmarks.map(hand => landmarksToArray(hand));
            const matchResponse = await matchGesture({
              symbol: currentSymbolRef.current,
              landmarks: landmarksArray
            });
            setSimilarity(matchResponse.similarity);
            if (matchResponse.similarity >= SIMILARITY_THRESHOLD) {
              matchCooldownRef.current = true;
              handleSymbolMatch(matchResponse.similarity);
              window.setTimeout(() => {
                matchCooldownRef.current = false;
              }, 1400);
            }
          } catch (error) {
            console.error("Error matching gesture:", error);
          }
        }

        if (
          !gameActiveRef.current &&
          !countdownActiveRef.current &&
          cameraReadyRef.current &&
          !postGamePromptRef.current
        ) {
          if (thumbsUpHands >= 2) {
            const now = performance.now();
            if (thumbHoldStartRef.current === null) {
              thumbHoldStartRef.current = now;
              updateStatusLine("Thumbs detected. Hold steady to begin…");
            } else if (now - thumbHoldStartRef.current > 1200) {
              thumbHoldStartRef.current = null;
              updateStatusLine("Starting round…");
              loadCountdown();
            }
          } else {
            thumbHoldStartRef.current = null;
            if (
              statusMessageRef.current &&
              statusMessageRef.current.textContent !==
                "Press Start or hold both thumbs up to begin."
            ) {
              updateStatusLine("Press Start or hold both thumbs up to begin.");
            }
          }
        }
      } else {
        setHandDetected(false);
        setSimilarity(prev => (gameActiveRef.current ? prev * 0.85 : 0));
        thumbHoldStartRef.current = null;
        if (!gameActiveRef.current && !postGamePromptRef.current) {
          if (
            statusMessageRef.current &&
            statusMessageRef.current.textContent !==
              "Press Start or hold both thumbs up to begin."
          ) {
            updateStatusLine("Press Start or hold both thumbs up to begin.");
          }
        }
      }

      canvasCtx.restore();
    };

    const startCameraStream = async () => {
      await loadHandsModule();
      const hands = handsRef.current;
      if (!hands) {
        throw new Error("Hands module not initialized");
      }

      hands.onResults(handleHandsResults);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 960, height: 540 },
        audio: false
      });

      videoElement.srcObject = stream;

      await new Promise<void>(resolve => {
        videoElement.onloadedmetadata = () => {
          videoElement.play().catch(() => undefined);
          const width = videoElement.videoWidth || 960;
          const height = videoElement.videoHeight || 540;
          canvasElement.width = width;
          canvasElement.height = height;
          resolve();
        };
      });

      const camera = new Camera(videoElement, {
        onFrame: async () => {
          if (!handsRef.current || !videoElement) {
            return;
          }
          try {
            await handsRef.current.send({ image: videoElement });
          } catch (err) {
            console.error("Error sending frame to hands:", err);
          }
        },
        width: 960,
        height: 540
      });

      await camera.start();
      cameraRef.current = camera;
      cameraReadyRef.current = true;
      setCameraReady(true);
    };

    const ensureCameraReady = async () => {
      if (cameraReadyRef.current) {
        return;
      }
      await startCameraStream();
      updateStatusLine("Camera ready. Press Start or hold both thumbs up to begin.");
      showReadyOverlay("Camera ready.<br/>Press Start or hold both thumbs up to begin.");
    };

    const loadCountdown = () => {
      if (countdownActiveRef.current) {
        return;
      }
      countdownActiveRef.current = true;
      const sequence = ["3", "2", "1", "Go!"];
      let index = 0;
      setCountdownText(sequence[index]);

      const advance = () => {
        index += 1;
        if (index < sequence.length) {
          setCountdownText(sequence[index]);
          const delay = index === sequence.length - 1 ? 500 : 700;
          countdownTimerRef.current = window.setTimeout(advance, delay);
        } else {
          setCountdownText(null);
          countdownActiveRef.current = false;
          beginMatch();
        }
      };

      countdownTimerRef.current = window.setTimeout(advance, 700);
    };

    const clearCountdown = () => {
      if (countdownTimerRef.current) {
        window.clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setCountdownText(null);
      countdownActiveRef.current = false;
      thumbHoldStartRef.current = null;
    };

    const beginMatch = () => {
      if (disposedRef.current || gameActiveRef.current || !cameraReadyRef.current) {
        return;
      }
      hideReadyOverlay();
      setScore(0);
      setSymbolsCompleted(0);
      setSimilarity(0);
      setLoadingPrompt(false);
      void loadNextSymbol();
      setGameActive(true);
      updateStatusLine("Round in progress. Match the prompts!");
      startButton.disabled = true;
      if (resetButton) {
        resetButton.disabled = false;
        resetButton.textContent = "Cancel";
      }
      gameStartTimeRef.current = performance.now();
      thumbHoldStartRef.current = null;
      updateTimebar(GAME_DURATION_MS);
      timerFrameRef.current = requestAnimationFrame(updateGameClock);
    };

    const handleStartClick = async () => {
      if (gameActiveRef.current) {
        return;
      }
      updateStatusLine("Starting round…");
      try {
        await ensureCameraReady();
        loadCountdown();
      } catch (error) {
        console.error(error);
        const message = describeCameraError(error);
        updateStatusLine(message);
        showReadyOverlay(message);
        if (resetButton) {
          resetButton.disabled = true;
        }
      }
    };

    const handleResetClick = () => {
      if (gameActiveRef.current) {
        clearCountdown();
        endGameSession({ aborted: true });
        showReadyOverlay("Round cancelled.<br/>Press Start to try again.");
        startButton.disabled = false;
        if (resetButton) {
          resetButton.disabled = true;
          resetButton.textContent = "Cancel";
        }
        return;
      }

      if (postGamePromptRef.current) {
        exitToMenu();
      }
    };

    const enterWaitingState = (message: string) => {
      showReadyOverlay(message);
      startButton.textContent = "Start";
      startButton.disabled = false;
      if (resetButton) {
        resetButton.disabled = true;
        resetButton.textContent = "Cancel";
      }
      updateStatusLine(message.replace(/<br\s*\/?>/gi, " ").trim());
    };

    startButton.addEventListener("click", handleStartClick);
    if (resetButton) {
      resetButton.addEventListener("click", handleResetClick);
    }

    enterWaitingState("Press Start or hold both thumbs up to begin.");
    void (async () => {
      try {
        await ensureCameraReady();
      } catch (error) {
        console.error("[FingerGame] Failed to prepare camera", error);
      }
    })();

    const beforeUnloadHandler = () => {
      stopCamera();
      handsRef.current?.close();
    };

    window.addEventListener("beforeunload", beforeUnloadHandler);

    return () => {
      disposedRef.current = true;
      clearCountdown();
      if (timerFrameRef.current) {
        cancelAnimationFrame(timerFrameRef.current);
        timerFrameRef.current = null;
      }
      if (postGameTimerRef.current) {
        cancelAnimationFrame(postGameTimerRef.current);
        postGameTimerRef.current = null;
      }
      stopCamera();
      handsRef.current?.close();
      startButton.removeEventListener("click", handleStartClick);
      if (resetButton) {
        resetButton.removeEventListener("click", handleResetClick);
      }
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      document.head.removeChild(styleEl);
    };
  }, []);

  return (
    <div className="finger-game-page">
      <main>
        <div className="top-bar">
          <div className="timebar">
            <div className="timebar-fill" ref={timebarFillRef} />
            <div className="timebar-label" ref={timebarLabelRef}>
              {`${(GAME_DURATION_MS / 1000).toFixed(1)}s`}
            </div>
          </div>
        </div>

        <div className="game-layout">
          <div className="side-panel" aria-label="Solo player panel">
            <section className="prompt-card">
              <h2>Current Prompt</h2>
              <div className="prompt-emoji">{currentSymbol ?? "…"}</div>
              <p className="prompt-details">
                {loadingPrompt
                  ? "Loading next gesture…"
                  : currentDefinition?.description ?? "Press Start to load a gesture."}
              </p>
            </section>

            <section className="summary-card">
              <div className="summary-grid">
                <div className="summary-tile">
                  <span>Score</span>
                  <strong>{score}</strong>
                </div>
                <div className="summary-tile">
                  <span>Completed</span>
                  <strong>{symbolsCompleted}</strong>
                </div>
                <div className="summary-tile">
                  <span>Similarity</span>
                  <strong>{Math.round(similarity * 100)}%</strong>
                </div>
                <div className="summary-tile">
                  <span>Hand</span>
                  <strong>{handDetected ? "✓" : "✗"}</strong>
                </div>
              </div>
            </section>
          </div>

          <div className="stage-wrapper">
            <section className="stage">
              <video ref={videoRef} playsInline muted />
              <canvas ref={canvasRef} />
              <div className="ready-overlay" ref={readyOverlayRef}>
                Press Start or hold both thumbs up to begin.
              </div>
              {countdownText && (
                <div
                  key={countdownText}
                  className={`countdown-overlay${countdownText === "Go!" ? " final" : ""}`}
                >
                  {countdownText}
                </div>
              )}
              {postGamePrompt && (
                <div className="post-game-modal">
                  <div className="post-game-card">
                    <div>
                      <h3 style={{ fontSize: "1.6rem", margin: 0, color: "#f5f7fb" }}>
                        Great run!
                      </h3>
                      <p style={{ margin: "0.35rem 0 0", color: "rgba(220, 230, 255, 0.8)" }}>
                        Score: {postGamePrompt.score} · Completed: {postGamePrompt.symbols}
                      </p>
                    </div>

                    <div className="post-game-progress">
                      <div
                        className="post-game-progress-bar"
                        style={{
                          transform: `scaleX(${Math.max(
                            0,
                            1 - postGamePrompt.remainingMs / POST_GAME_TIMEOUT_MS
                          )})`
                        }}
                      />
                    </div>
                    <p style={{ color: "rgba(255, 205, 205, 0.85)", fontSize: "0.9rem", margin: 0 }}>
                      Auto-return in {(postGamePrompt.remainingMs / 1000).toFixed(1)}s
                    </p>

                    <label style={{ fontSize: "0.95rem", color: "rgba(235, 245, 255, 0.85)" }}>
                      Player Name
                    </label>
                    <input
                      className="post-game-input"
                      value={teamName}
                      onChange={event => setTeamName(event.target.value)}
                      placeholder="Enter a name"
                      disabled={postGamePrompt.submitting}
                    />

                    {postGamePrompt.error && (
                      <p style={{ color: "#ff9a9a", margin: 0 }}>{postGamePrompt.error}</p>
                    )}

                    <div className="post-game-actions">
                      <button
                        type="button"
                        disabled={postGamePrompt.submitting}
                        onClick={handleSubmitScore}
                      >
                        {postGamePrompt.submitting ? "Submitting…" : "Submit to Leaderboard"}
                      </button>
                      <button type="button" onClick={exitToMenu} className="back-button">
                        Skip & Return
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="controls-row">
          <button ref={startButtonRef}>Start</button>
          <button ref={resetButtonRef} disabled>
            Cancel
          </button>
          <button type="button" className="back-button" onClick={() => navigate("/play")}>
            Back to Menu
          </button>
        </div>

        <div className="status-line" ref={statusMessageRef}>
          {statusMessage}
        </div>
      </main>
      <div className="hidden-video">
        <Toaster />
      </div>
    </div>
  );
};

export default FingerGame;
