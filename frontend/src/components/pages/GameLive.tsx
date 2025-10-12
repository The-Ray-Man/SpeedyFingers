import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitScore } from "@/leaderboardApi";
import { useRewardSound } from "../../context/rewardSoundContext";
import { number } from "framer-motion";

const GAME_LIVE_STYLES = `
.game-live-page {
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

.game-live-page main {
  width: min(100%, 1440px);
  min-height: 95vh;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  padding-bottom: 2rem;
}

.game-live-page .top-bar {
  display: flex;
  justify-content: center;
}

.game-live-page .game-layout {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 1.5rem;
  flex-wrap: nowrap;
}

.game-live-page .stage-wrapper {
  position: relative;
  flex: 1 1 clamp(760px, 60vw, 1080px);
  max-width: 1080px;
  min-height: clamp(420px, 72vh, 720px);
  display: flex;
}

.game-live-page .stage {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  box-shadow: 0 30px 60px rgba(15, 15, 30, 0.6);
  background: linear-gradient(135deg, rgba(90, 80, 180, 0.35), rgba(25, 220, 250, 0.15));
  aspect-ratio: 16 / 9;
  width: 100%;
  min-height: inherit;
}

.game-live-page .stage::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-1px);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.75) 30%,
    rgba(255, 255, 255, 0.75) 70%,
    rgba(255, 255, 255, 0) 100%
  );
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.35);
  pointer-events: none;
  z-index: 3;
}

.game-live-page .stage video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(1.1) contrast(1.1);
  transform: scaleX(-1);
  position: relative;
  z-index: 1;
}

.game-live-page .stage canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform: scaleX(-1);
  z-index: 2;
}

.game-live-page .ready-overlay {
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

.game-live-page .ready-overlay.visible {
  opacity: 1;
}

.game-live-page .countdown-overlay {
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

.game-live-page .countdown-overlay.final {
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

.game-live-page .side-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  width: 260px;
  flex: 0 0 260px;
  min-height: clamp(420px, 72vh, 720px);
}

.game-live-page .player-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.75rem;
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(40, 35, 80, 0.42), rgba(20, 30, 55, 0.32));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 16px 30px rgba(15, 15, 30, 0.38);
  min-height: 0;
  position: relative;
}

.game-live-page .player-panel h2 {
  margin: 0;
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(245, 247, 251, 0.72);
}

.game-live-page .target-emoji {
  font-size: 3.2rem;
  line-height: 1;
  color: #f9f9ff;
}

.game-live-page .target-emoji.satisfied {
  color: #88ffd2;
  text-shadow: 0 0 18px rgba(120, 255, 210, 0.6);
}

.game-live-page .score-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0.75rem;
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(40, 35, 80, 0.42), rgba(20, 30, 55, 0.32));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 16px 30px rgba(15, 15, 30, 0.38);
  position: relative;
}

.game-live-page .player-panel,
.game-live-page .score-block {
  width: 100%;
  max-width: 240px;
}

.game-live-page .panel-highlight {
  position: absolute;
  inset: -4px;
  border-radius: 18px;
  border: 2px solid rgba(120, 255, 180, 0.85);
  box-shadow: 0 0 24px rgba(120, 255, 180, 0.45);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s ease;
}

.game-live-page .panel-highlight.visible {
  opacity: 1;
}

.game-live-page .score-label {
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(220, 230, 255, 0.72);
}

.game-live-page .score-value {
  font-size: 2.2rem;
  font-weight: 700;
  color: #ffe066;
  text-shadow: 0 0 12px rgba(255, 224, 102, 0.4);
}

.game-live-page .controls-row {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.game-live-page button {
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

.game-live-page button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(24, 181, 255, 0.45);
}

.game-live-page button:disabled {
  opacity: 0.5;
  cursor: default;
  box-shadow: none;
}

.game-live-page .back-button {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(251, 251, 251, 0.07));
  color: #f5f7fb;
  box-shadow: 0 12px 24px rgba(50, 50, 50, 0.38);
}

.game-live-page .back-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(96, 96, 96, 0.45);
}

.game-live-page .timebar {
  position: relative;
  width: min(100%, 640px);
  height: 45px;
  border-radius: 999px;
  background: rgba(55, 70, 120, 0.35);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.game-live-page .timebar-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #18b5ff, #7b5eff);
  transform-origin: left center;
  z-index: 0;
}

.game-live-page .timebar-label {
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

.game-live-page .hidden-audio {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
}

.game-live-page .overlay {
  position: absolute;
  padding: 0.7rem 1rem;
  background: rgba(12, 12, 18, 0.65);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.9rem;
  line-height: 1.4;
  max-width: 320px;
  z-index: 4;
}

.game-live-page .instructions {
  max-width: 720px;
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgba(235, 240, 255, 0.85);
  font-style: italic;
  text-align: center;
  margin: 0 auto;
}

.game-live-page .status-line {
  text-align: center;
  font-size: 1rem;
  color: rgba(225, 235, 255, 0.85);
  letter-spacing: 0.02em;
}

.game-live-page .post-game-modal {
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

.game-live-page .post-game-card {
  width: min(100%, 620px);
  padding: 1.75rem 2rem;
  border-radius: 24px;
  background: linear-gradient(150deg, rgba(30, 32, 60, 0.9), rgba(45, 48, 88, 0.82));
  border: 1px solid rgba(140, 200, 255, 0.35);
  box-shadow: 0 24px 50px rgba(10, 15, 35, 0.6);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.game-live-page .post-game-input {
  width: 100%;
  background: rgba(12, 16, 30, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  padding: 0.85rem 1rem;
  color: #fefefe;
  font-size: 1rem;
}

.game-live-page .post-game-input::placeholder {
  color: rgba(210, 220, 255, 0.6);
}

.game-live-page .post-game-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.game-live-page .post-game-progress {
  position: relative;
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 80, 80, 0.2);
  overflow: hidden;
  border: 1px solid rgba(255, 120, 120, 0.45);
}

.game-live-page .post-game-progress-bar {
  position: absolute;
  inset: 0;
  transform-origin: left;
  background: linear-gradient(90deg, #ff4d6d, #ff7849);
}

@media (max-width: 1024px) {
  .game-live-page .side-column {
    width: 100%;
    flex: 1 1 auto;
    flex-direction: row;
    justify-content: center;
  }

  .game-live-page .player-panel,
  .game-live-page .score-block {
    flex: 1 1 45%;
  }
}

@media (max-width: 640px) {
  .game-live-page main {
    gap: 1.25rem;
  }

  .game-live-page .stage {
    min-height: 300px;
  }

  .game-live-page .side-column {
    flex-direction: column;
    gap: 1rem;
  }
}
`;

type PostGameState = {
  winnerId: number;
  score: number;
  symbols: number;
  remainingMs: number;
  submitting: boolean;
  error?: string;
};

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement | string, options: Record<string, unknown>) => any;
      PlayerState: Record<string, number>;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const GameLive = () => {
  const { playSound } = useRewardSound();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const statusMessageRef = useRef<HTMLDivElement>(null);
  const scoreValueP1Ref = useRef<HTMLSpanElement>(null);
  const scoreValueP2Ref = useRef<HTMLSpanElement>(null);
  const timebarFillRef = useRef<HTMLDivElement>(null);
  const timebarLabelRef = useRef<HTMLDivElement>(null);
  const player1PromptRef = useRef<HTMLDivElement>(null);
  const player2PromptRef = useRef<HTMLDivElement>(null);
  const ytPlayerContainerRef = useRef<HTMLDivElement>(null);
  const readyOverlayRef = useRef<HTMLDivElement>(null);
  const panelHighlightRefs = useRef<Record<number, HTMLSpanElement | null>>({ 1: null, 2: null });
  const scoreHighlightRefs = useRef<Record<number, HTMLSpanElement | null>>({ 1: null, 2: null });
  const navigate = useNavigate();
  const [postGamePrompt, setPostGamePrompt] = useState<PostGameState | null>(null);
  const [teamName, setTeamName] = useState("");
  const postGamePromptRef = useRef<PostGameState | null>(null);
  const postGameDeadlineRef = useRef<number | null>(null);
  const postGameTimerRef = useRef<number | null>(null);
  const [countdownText, setCountdownText] = useState<string | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const triggerDebugOverlayRef = useRef<(() => void) | null>(null);
  const panelHighlightTimeouts = useRef<Record<number, number | null>>({ 1: null, 2: null });
  const skeletonHighlightStartRef = useRef<Record<number, number>>({ 1: 0, 2: 0 });
  const skeletonHighlightUntilRef = useRef<Record<number, number>>({ 1: 0, 2: 0 });
  const POST_GAME_TIMEOUT_MS = 30_000;

  const updateStatusLine = (message: string) => {
    if (statusMessageRef.current) {
      statusMessageRef.current.textContent = message;
    }
  };

  const panelRefSetter = (playerId: number) => (el: HTMLSpanElement | null) => {
    panelHighlightRefs.current[playerId] = el;
  };

  const scoreRefSetter = (playerId: number) => (el: HTMLSpanElement | null) => {
    scoreHighlightRefs.current[playerId] = el;
  };

  const clearCountdown = () => {
    if (countdownTimerRef.current) {
      window.clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdownText(null);
  };

  const exitToMenu = () => {
    if (postGameTimerRef.current) {
      cancelAnimationFrame(postGameTimerRef.current);
      postGameTimerRef.current = null;
    }
    postGameDeadlineRef.current = null;
    postGamePromptRef.current = null;
    setPostGamePrompt(null);
    setTeamName("");
    clearCountdown();
    updateStatusLine("Returning to menu...");
    navigate("/play");
  };

  const handleSubmitWinner = async () => {
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
        gameMode: "multi",
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

  useEffect(() => {
    postGamePromptRef.current = postGamePrompt;
    if (!postGamePrompt && postGameTimerRef.current) {
      cancelAnimationFrame(postGameTimerRef.current);
      postGameTimerRef.current = null;
    }
  }, [postGamePrompt]);

  useEffect(() => () => {
    if (postGameTimerRef.current) {
      cancelAnimationFrame(postGameTimerRef.current);
    }
    clearCountdown();
  }, []);

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = GAME_LIVE_STYLES;
    document.head.appendChild(styleEl);

    if (
      !videoRef.current ||
      !canvasRef.current ||
      !startButtonRef.current ||
      !timebarFillRef.current ||
      !timebarLabelRef.current ||
      !player1PromptRef.current ||
      !player2PromptRef.current ||
      !scoreValueP1Ref.current ||
      !scoreValueP2Ref.current ||
      !readyOverlayRef.current ||
      !statusMessageRef.current
    ) {
      return () => {
        document.head.removeChild(styleEl);
      };
    }

    const videoElement = videoRef.current as HTMLVideoElement;
    const canvasElement = canvasRef.current as HTMLCanvasElement;
    const startButton = startButtonRef.current as HTMLButtonElement;
    const resetButton = resetButtonRef.current;
    const scoreValueEls: Record<number, HTMLSpanElement> = {
      1: scoreValueP1Ref.current as HTMLSpanElement,
      2: scoreValueP2Ref.current as HTMLSpanElement
    };
    const timebarFillEl = timebarFillRef.current as HTMLDivElement;
    const timebarLabelEl = timebarLabelRef.current as HTMLDivElement;
    const targetDisplays: Record<number, { prompt: HTMLDivElement; coins: HTMLElement | null }> = {
      1: { prompt: player1PromptRef.current as HTMLDivElement, coins: null },
      2: { prompt: player2PromptRef.current as HTMLDivElement, coins: null }
    };
    const readyOverlayEl = readyOverlayRef.current as HTMLDivElement;

    const context = canvasElement.getContext("2d", { willReadFrequently: false });
    if (!context) {
      return () => {
        document.head.removeChild(styleEl);
      };
    }
    const canvasCtx = context as CanvasRenderingContext2D;

    const READY_PROMPT_INITIAL = "Press Start or show 👍👍 to begin.";
    const READY_PROMPT_READY = "Camera ready!<br/>Press Start or show 👍👍 to begin.";
    const READY_PROMPT_REPLAY = "Great run!<br/>Press Start or show 👍👍 to play again.";

    const startPostGameCountdown = () => {
      if (!postGameDeadlineRef.current) {
        return;
      }
      if (postGameTimerRef.current) {
        cancelAnimationFrame(postGameTimerRef.current);
      }
      const tick = () => {
        if (disposed || !postGameDeadlineRef.current || !postGamePromptRef.current) {
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

    const triggerPostGamePrompt = (
      winnerId: number,
      score: number,
      symbols: number,
      statusMessage = "Great run! Enter your team name to submit the win or show 👍👍 to return to the menu."
    ) => {
      postGameDeadlineRef.current = performance.now() + POST_GAME_TIMEOUT_MS;
      setTeamName(winnerId === 1 ? "Player 1" : "Player 2");
      const prompt: PostGameState = {
        winnerId,
        score,
        symbols,
        remainingMs: POST_GAME_TIMEOUT_MS,
        submitting: false
      };
      postGamePromptRef.current = prompt;
      setPostGamePrompt(prompt);
      updateStatusLine(statusMessage);
      if (resetButton) {
        resetButton.disabled = false;
        resetButton.textContent = "Skip";
      }
      if (startButton) {
        startButton.disabled = true;
      }
      updateTargetDisplay(1);
      updateTargetDisplay(2);
      startPostGameCountdown();
    };

    let cameraReady = false;
    let waitingForStart = true;
    let lastGameEndTime = 0;

    function showReadyOverlay(message: string) {
      if (!readyOverlayEl) {
        return;
      }
      readyOverlayEl.innerHTML = message;
      readyOverlayEl.classList.add("visible");
    }

    function hideReadyOverlay() {
      if (!readyOverlayEl) {
        return;
      }
      readyOverlayEl.classList.remove("visible");
    }

    function enterWaitingState(message: string) {
      waitingForStart = true;
      showReadyOverlay(message);
      startButton.disabled = false;
      startButton.textContent = "Start";
      if (resetButton) {
        resetButton.disabled = true;
        resetButton.textContent = "Cancel";
      }
      postGameDeadlineRef.current = null;
      setPostGamePrompt(null);
      setTeamName("");
      updateStatusLine(message.replace(/<br\s*\/?>/gi, " ").trim());
    }

    function beginMatch() {
      if (disposed || gameActive || !cameraReady) {
        return;
      }
      waitingForStart = false;
      hideReadyOverlay();
      clearCountdown();
      updateStatusLine("Match starting…");
      startButton.disabled = true;
      if (resetButton) {
        resetButton.disabled = false;
        resetButton.textContent = "Cancel";
      }
      postGameDeadlineRef.current = null;
      setPostGamePrompt(null);
      setTeamName("");

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
          clearCountdown();
          updateStatusLine("Match in progress. Show your hands!");
          startGameSession();
        }
      };

      countdownTimerRef.current = window.setTimeout(advance, 700);
    }

    async function ensureTrackingReady() {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not available in this browser.");
      }

      if (!videoRunning) {
        await initializeCamera();
        videoRunning = true;
      }

      if (!gestureRecognizer) {
        await initializeGestureRecognizer();
      }

      if (!drawingUtils) {
        drawingUtils = new DrawingUtilsRef(canvasCtx);
      }

      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(predictFrame);
      }

      if (disposed) {
        return;
      }

      cameraReady = true;
    }

    const PLAYER_COLORS: Record<number, string> = {
      1: "#4cc3ff",
      2: "#ff5c74"
    };

    const HIGHLIGHT_RGB = { r: 120, g: 255, b: 180 };

    const hexToRgb = (hex: string) => {
      const normalized = hex.replace("#", "");
      if (normalized.length !== 6) {
        return { r: 255, g: 255, b: 255 };
      }
      return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16)
      };
    };

    const mixWithHighlight = (baseHex: string, blend: number) => {
      const clamped = Math.max(0, Math.min(1, blend));
      const base = hexToRgb(baseHex);
      const r = Math.round(base.r + (HIGHLIGHT_RGB.r - base.r) * clamped);
      const g = Math.round(base.g + (HIGHLIGHT_RGB.g - base.g) * clamped);
      const b = Math.round(base.b + (HIGHLIGHT_RGB.b - base.b) * clamped);
      return `rgb(${r}, ${g}, ${b})`;
    };

    startButton.textContent = "Start";
    if (resetButton) {
      resetButton.disabled = true;
    }
    targetDisplays[1].prompt.textContent = "👍👍";
    targetDisplays[1].prompt.classList.remove("satisfied");
    targetDisplays[2].prompt.textContent = "👍👍";
    targetDisplays[2].prompt.classList.remove("satisfied");
    enterWaitingState(READY_PROMPT_INITIAL);

    let gestureRecognizer: any;
    let drawingUtils: any;
    let videoRunning = false;
    let lastVideoTime = -1;
    let animationFrameId = 0;
    const highFiveTracker = new Map<string, { wasClose: boolean; lastEvent: number }>();
    const gestureVocabulary = [
      { id: "Closed_Fist", name: "Closed Fist", emoji: "✊" },
      { id: "Open_Palm", name: "Open Palm", emoji: "✋" },
      { id: "Pointing_Up", name: "Pointing Up", emoji: "☝️" },
      { id: "Victory", name: "Victory", emoji: "✌️" },
      { id: "Thumb_Up", name: "Thumb Up", emoji: "👍" },
      { id: "Thumb_Down", name: "Thumb Down", emoji: "👎" },
      { id: "ILoveYou", name: "I Love You", emoji: "🤟" }
    ];
    const gestureLookup = Object.fromEntries(gestureVocabulary.map(item => [item.id, item]));
    const DOUBLE_GESTURE_RATE = 0.4;
    const GAME_DURATION_MS = 60_000;
    const COIN_MIN_INTERVAL_MS = 1400;
    const COIN_MAX_INTERVAL_MS = 2400;
    const COIN_LIFETIME_MS = 3000;
    const COIN_BLINK_MS = 1500;
    const YOUTUBE_VIDEO_ID = "XnygT6ANLzQ";

    const playerTargets: Record<
      number,
      {
        currentTarget: any;
        satisfied: boolean;
      }
    > = {
      1: createEmptyPlayerState(),
      2: createEmptyPlayerState()
    };

    let gameActive = false;
    let gameStartTime = 0;
    const scores: Record<number, number> = { 1: 0, 2: 0 };
    let nextCoinSpawnTime = 0;
    let lastRenderTimestamp: number | null = null;
    const coins: any[] = [];
    const coinEffects: any[] = [];
    const playerCoinCounts: Record<number, number> = { 1: 0, 2: 0 };
    const coinsSpawnedForPlayer: Record<number, number> = { 1: 0, 2: 0 };
    const lastPlayerThumbTime: Record<number, number> = { 1: 0, 2: 0 };
    let coinsSinceSpecial = 0;
    let nextCoinFavor: 1 | 2 = 1;
    let ytPlayer: any = null;
    let ytReady = false;
    const pendingAudioActions: Array<() => void> = [];

    let HandLandmarkerRef: any;
    let FilesetResolverRef: any;
    let GestureRecognizerRef: any;
    let DrawingUtilsRef: any;

    const visionModulePromise = import(
      /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0?module"
    ).then(mod => {
      HandLandmarkerRef = mod.HandLandmarker;
      FilesetResolverRef = mod.FilesetResolver;
      GestureRecognizerRef = mod.GestureRecognizer;
      DrawingUtilsRef = mod.DrawingUtils;
      return mod;
    });

    const existingYoutubeScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    let ytScriptTag = existingYoutubeScript;
    let addedYoutubeScript = false;
    const previousYoutubeReady = window.onYouTubeIframeAPIReady;

    const createYoutubePlayer = () => {
      if (ytPlayer || !window.YT || !ytPlayerContainerRef.current) {
        return;
      }

      ytPlayer = new window.YT.Player(ytPlayerContainerRef.current, {
        height: "0",
        width: "0",
        videoId: YOUTUBE_VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestBranding: 1,
          rel: 0,
          playsinline: 1
        },
        events: {
          onReady: () => {
            ytReady = true;
            if (ytPlayer?.setVolume) {
              ytPlayer.setVolume(55);
            }
            while (pendingAudioActions.length) {
              const action = pendingAudioActions.shift();
              if (action) {
                action();
              }
            }
          },
          onStateChange: (event: { data: number }) => {
            if (window.YT && event.data === window.YT.PlayerState?.ENDED) {
              playBackgroundAudio();
            }
          }
        }
      });
    };

    if (!ytScriptTag) {
      ytScriptTag = document.createElement("script");
      ytScriptTag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(ytScriptTag);
      addedYoutubeScript = true;
    }

    if (window.YT && window.YT.Player) {
      createYoutubePlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        previousYoutubeReady?.();
        createYoutubePlayer();
      };
    }

    if (resetButton) {
      resetButton.addEventListener("click", handleResetClick);
    }

    startButton.addEventListener("click", handleStartClick);

    triggerDebugOverlayRef.current = () => {
      const debugWinner = 1;
      triggerPostGamePrompt(
        debugWinner,
        scores[debugWinner] ?? 15,
        playerCoinCounts[debugWinner] ?? 5,
        "Debug: simulated match end"
      );
    };

    const warmupCamera = async () => {
      try {
        await ensureTrackingReady();
        if (disposed) {
          return;
        }
        enterWaitingState(READY_PROMPT_READY);
        updateStatusLine("Press Start or show 👍👍 to begin.");
      } catch (error) {
        console.error("[GameLive] Failed to prepare camera:", error);
        cameraReady = false;
        enterWaitingState(READY_PROMPT_INITIAL);
        updateStatusLine(describeCameraError(error));
      }
    };

    void warmupCamera();

    const beforeUnloadHandler = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (gestureRecognizer) {
        void gestureRecognizer.close();
      }
      const stream = videoElement.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach(track => track.stop());
      }
      stopBackgroundAudio();
    };

    window.addEventListener("beforeunload", beforeUnloadHandler);

    updateAllTargetDisplays();
    updatePlayerCoinDisplay(1);
    updatePlayerCoinDisplay(2);
    updateScoreDisplay(1);
    updateScoreDisplay(2);
    updateTimebar(GAME_DURATION_MS);

    let disposed = false;

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

    async function handleStartClick() {
      if (gameActive) {
        return;
      }

      startButton.disabled = true;
      updateStatusLine("Starting match…");

      try {
        if (!cameraReady) {
          await ensureTrackingReady();
          if (disposed) {
            return;
          }
        }

        beginMatch();
      } catch (error) {
        console.error(error);
        cameraReady = false;
        const message = describeCameraError(error);
        enterWaitingState(READY_PROMPT_INITIAL);
        updateStatusLine(message);
        startButton.disabled = false;
      }
    }

    function handleResetClick() {
      if (postGamePromptRef.current) {
        exitToMenu();
        return;
      }
      if (!cameraReady || !gestureRecognizer) {
        return;
      }
      if (gameActive) {
        endGameSession();
        return;
      }
      enterWaitingState(READY_PROMPT_REPLAY);
    }

    async function initializeCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not available in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }
      });

      videoElement.srcObject = stream;

      await new Promise<void>(resolve => {
        videoElement.onloadedmetadata = () => {
          void videoElement.play();
          const width = videoElement.videoWidth || 1280;
          const height = videoElement.videoHeight || 720;
          canvasElement.width = width;
          canvasElement.height = height;
          resolve();
        };
      });
    }

    async function initializeGestureRecognizer() {
      await visionModulePromise;

      const filesetResolver = await FilesetResolverRef.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      gestureRecognizer = await GestureRecognizerRef.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"
        },
        runningMode: "VIDEO",
        numHands: 4
      });
    }

    function predictFrame(nowInMs: number) {
      if (!videoRunning || !gestureRecognizer) {
        return;
      }

      if (videoElement.currentTime !== lastVideoTime) {
        lastVideoTime = videoElement.currentTime;
        const deltaSeconds = lastRenderTimestamp ? (nowInMs - lastRenderTimestamp) / 1000 : 0;
        lastRenderTimestamp = nowInMs;
        const results = gestureRecognizer.recognizeForVideo(videoElement, nowInMs);
        renderHands(results, nowInMs, deltaSeconds);
      }

      updateGameClock(nowInMs);

      animationFrameId = requestAnimationFrame(predictFrame);
    }

    function renderHands(results: any, nowInMs: number, deltaSeconds: number) {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      if (!results?.landmarks?.length) {
        updateCoins(nowInMs, deltaSeconds, []);
        drawCoins(nowInMs);
        highFiveTracker.clear();
        canvasCtx.restore();
        return;
      }

      const processedHands = results.landmarks.map((landmarks: any[], index: number) => {
        const handedness = results.handednesses?.[index]?.[0];
        const label = handedness?.categoryName || "Unknown";
        const score = handedness?.score ?? 0;
        const center = landmarks.reduce(
          (acc: { x: number; y: number }, point: { x: number; y: number }) => {
            acc.x += point.x;
            acc.y += point.y;
            return acc;
          },
          { x: 0, y: 0 }
        );
        center.x /= landmarks.length;
        center.y /= landmarks.length;

        const gestureCandidates = results.gestures?.[index];
        const gesture = interpretGesture(gestureCandidates);
        const displayCenterX = 1 - center.x;
        const palmCenterNorm = getPalmCenterNormalized(landmarks);
        const palmDisplay = palmCenterNorm
          ? { x: 1 - palmCenterNorm.x, y: palmCenterNorm.y }
          : null;

        return {
          index,
          label,
          score,
          center,
          displayCenterX,
          palmCenter: palmCenterNorm,
          palmDisplay,
          landmarks,
          gesture
        };
      });

      const { players, handToPlayer } = groupHandsIntoPlayers(processedHands);

      handlePlayerProgress(players, nowInMs);

      detectHighFives(processedHands, handToPlayer, highFiveTracker);

      processedHands.forEach((hand: any) => {
        const playerId = handToPlayer.get(hand.index);
        const numericPlayerId = typeof playerId === "number" ? playerId : null;
        const highlightStart =
          numericPlayerId !== null ? skeletonHighlightStartRef.current[numericPlayerId] ?? 0 : 0;
        const highlightEnd =
          numericPlayerId !== null ? skeletonHighlightUntilRef.current[numericPlayerId] ?? 0 : 0;
        let highlightIntensity = 0;
        if (
          numericPlayerId !== null &&
          highlightEnd > highlightStart &&
          nowInMs <= highlightEnd
        ) {
          const duration = highlightEnd - highlightStart;
          const remaining = highlightEnd - nowInMs;
          highlightIntensity = Math.max(0, Math.min(1, remaining / duration));
        }
        const easedHighlight = Math.pow(highlightIntensity, 0.6);
        const baseColor =
          numericPlayerId !== null ? PLAYER_COLORS[numericPlayerId] ?? "#c9d1ff" : "#c9d1ff";
        const connectorColor =
          easedHighlight > 0 ? mixWithHighlight(baseColor, easedHighlight) : baseColor;
        const connectorWidth = 2 + easedHighlight * 2;

        if (drawingUtils && HandLandmarkerRef) {
          drawingUtils.drawConnectors(hand.landmarks, HandLandmarkerRef.HAND_CONNECTIONS, {
            color: connectorColor,
            lineWidth: connectorWidth
          });
        }

        const wrist = hand.landmarks[0];
        const x = wrist.x * canvasElement.width;
        const y = wrist.y * canvasElement.height;

        const labelText = hand.gesture?.emoji ?? "";
        if (labelText) {
          const fontSize = 30;
          const padding = 8;
          canvasCtx.save();
          canvasCtx.translate(canvasElement.width, 0);
          canvasCtx.scale(-1, 1);
          canvasCtx.font = `${fontSize}px 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`;
          const metrics = canvasCtx.measureText(labelText);
          const rectWidth = metrics.width + padding * 2;
          const rectHeight = fontSize + padding;
          let rectX = canvasElement.width - x - rectWidth / 2;
          rectX = Math.max(0, Math.min(rectX, canvasElement.width - rectWidth));
          let rectY = y - 48;
          rectY = Math.max(0, rectY);

          canvasCtx.fillStyle = "rgba(12, 14, 22, 0.65)";
          canvasCtx.fillRect(rectX, rectY, rectWidth, rectHeight);

          canvasCtx.fillStyle = connectorColor;
          canvasCtx.textBaseline = "middle";
          canvasCtx.fillText(labelText, rectX + padding, rectY + rectHeight / 2);
          canvasCtx.restore();
        }

        const xs = hand.landmarks.map((point: { x: number }) => point.x * canvasElement.width);
        const ys = hand.landmarks.map((point: { y: number }) => point.y * canvasElement.height);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const hitboxPadding = 18;
        const hitboxX = Math.max(minX - hitboxPadding, 0);
        const hitboxY = Math.max(minY - hitboxPadding, 0);
        const hitboxWidth = Math.min(maxX + hitboxPadding, canvasElement.width) - hitboxX;
        const hitboxHeight = Math.min(maxY + hitboxPadding, canvasElement.height) - hitboxY;
        hand.hitbox = { x: hitboxX, y: hitboxY, width: hitboxWidth, height: hitboxHeight, playerId };

        canvasCtx.save();
        const outlineAlpha = 0.55 + 0.45 * easedHighlight;
        canvasCtx.strokeStyle = `rgba(255, 255, 255, ${outlineAlpha.toFixed(2)})`;
        canvasCtx.lineWidth = 2 + easedHighlight * 1.5;
        canvasCtx.setLineDash([3, 9]);
        if (easedHighlight > 0) {
          canvasCtx.shadowColor = `rgba(120, 255, 180, ${(0.4 * easedHighlight).toFixed(2)})`;
          canvasCtx.shadowBlur = 14 * easedHighlight;
        } else {
          canvasCtx.shadowColor = "transparent";
          canvasCtx.shadowBlur = 0;
        }
        canvasCtx.strokeRect(hitboxX, hitboxY, hitboxWidth, hitboxHeight);
        canvasCtx.restore();
      });

      updateCoins(nowInMs, deltaSeconds, processedHands);
      drawCoins(nowInMs);

      canvasCtx.restore();
    }

    function groupHandsIntoPlayers(hands: any[]) {
      const minScore = 0.35;
      const confidenceFiltered = hands.filter(hand => (hand.score ?? 0) >= minScore);
      const candidateHands = confidenceFiltered.length ? confidenceFiltered : hands;

      const handToPlayer = new Map<number, number | null>();
      const players: Array<{ id: number; hands: any[]; center: { x: number; y: number } }> = [];

      if (!candidateHands.length) {
        return { playerCount: 0, players, handToPlayer };
      }

      const midPoint = 0.5;
      const deadZone = 0.06;
      const playerBuckets: Record<number, any[]> = {
        1: [],
        2: []
      };
      const ambiguous: any[] = [];

      candidateHands.forEach(hand => {
        const x = hand.displayCenterX ?? 0.5;
        if (x < midPoint - deadZone) {
          playerBuckets[1].push(hand);
        } else if (x > midPoint + deadZone) {
          playerBuckets[2].push(hand);
        } else {
          ambiguous.push(hand);
        }
      });

      ambiguous.forEach(hand => {
        const leftDistance = Math.abs((hand.displayCenterX ?? midPoint) - (midPoint - deadZone));
        const rightDistance = Math.abs((hand.displayCenterX ?? midPoint) - (midPoint + deadZone));
        if (playerBuckets[1].length === 0 && playerBuckets[2].length > 0) {
          playerBuckets[1].push(hand);
        } else if (playerBuckets[2].length === 0 && playerBuckets[1].length > 0) {
          playerBuckets[2].push(hand);
        } else if (leftDistance <= rightDistance) {
          playerBuckets[1].push(hand);
        } else {
          playerBuckets[2].push(hand);
        }
      });

      [1, 2].forEach(playerId => {
        const bucket = playerBuckets[playerId];
        if (!bucket.length) {
          return;
        }
        bucket.forEach(hand => handToPlayer.set(hand.index, playerId));
        const center = bucket.reduce(
          (acc: { x: number; y: number }, hand: any) => {
            acc.x += hand.displayCenterX ?? 0.5;
            acc.y += hand.center.y ?? 0.5;
            return acc;
          },
          { x: 0, y: 0 }
        );
        const count = bucket.length;
        players.push({
          id: playerId,
          hands: bucket,
          center: { x: center.x / count, y: center.y / count }
        });
      });

      players.sort((a, b) => a.id - b.id);

      const playerCount = players.filter(player => player.hands.length > 0).length;

      return {
        playerCount,
        players,
        handToPlayer
      };
    }

    function interpretGesture(gestureCandidates: any) {
      if (!gestureCandidates?.length) {
        return null;
      }
      const topCandidate = gestureCandidates[0];
      if (!topCandidate) {
        return null;
      }
      const meta = gestureLookup[topCandidate.categoryName];
      if (!meta) {
        return null;
      }
      return {
        id: meta.id,
        name: meta.name,
        emoji: meta.emoji,
        score: topCandidate.score ?? 0
      };
    }

    function getPalmCenterNormalized(landmarks: Array<{ x: number; y: number; z?: number }>) {
      if (!landmarks?.length) {
        return null;
      }
      const wrist = landmarks[0];
      const indexMcp = landmarks[5];
      const pinkyMcp = landmarks[17];
      return {
        x: (wrist.x + indexMcp.x + pinkyMcp.x) / 3,
        y: (wrist.y + indexMcp.y + pinkyMcp.y) / 3,
        z: ((wrist.z ?? 0) + (indexMcp.z ?? 0) + (pinkyMcp.z ?? 0)) / 3
      };
    }

    function computePalmPose(hand: any) {
      const center = getPalmCenterNormalized(hand.landmarks);
      return { center };
    }

    function detectHighFives(
      processedHands: any[],
      handToPlayer: Map<number, number | null>,
      tracker: Map<string, { wasClose: boolean; lastEvent: number }>
    ) {
      const activeKeys = new Set<string>();
      const contactDistance = 0.075;
      const releaseDistance = 0.13;
      const events: Array<{ players: Array<number | null>; hands: number[]; label: string }> = [];
      const now = performance.now();

      processedHands.forEach(hand => {
        if (!hand.palmCenter) {
          const pose = computePalmPose(hand);
          hand.palmCenter = pose.center;
        }
        if (hand.palmCenter && !hand.palmDisplay) {
          hand.palmDisplay = {
            x: 1 - hand.palmCenter.x,
            y: hand.palmCenter.y
          };
        }
      });

      for (let i = 0; i < processedHands.length; i += 1) {
        for (let j = i + 1; j < processedHands.length; j += 1) {
          const handA = processedHands[i];
          const handB = processedHands[j];

          const dist = distance3D(handA.palmCenter, handB.palmCenter);
          const playerA = handToPlayer.get(handA.index) ?? null;
          const playerB = handToPlayer.get(handB.index) ?? null;

          const key = `${Math.min(handA.index, handB.index)}-${Math.max(handA.index, handB.index)}`;
          activeKeys.add(key);
          const record = tracker.get(key) ?? { wasClose: dist < releaseDistance, lastEvent: -Infinity };

          const enteringContact = dist < contactDistance && !record.wasClose;
          const cooldownSatisfied = now - record.lastEvent > 600;

          if (enteringContact && cooldownSatisfied) {
            const playerLabelA = playerA ? `P${playerA}` : "Unknown";
            const playerLabelB = playerB ? `P${playerB}` : "Unknown";
            const label =
              playerA && playerB
                ? playerA === playerB
                  ? `${playerLabelA} high five`
                  : `${playerLabelA} & ${playerLabelB} high five!`
                : `${playerLabelA} & ${playerLabelB} high five!`;
            events.push({
              players: [playerA, playerB],
              hands: [handA.index, handB.index],
              label
            });
            tracker.set(key, {
              wasClose: true,
              lastEvent: now
            });
          } else {
            tracker.set(key, {
              wasClose: dist < releaseDistance,
              lastEvent: record.lastEvent
            });
          }
        }
      }

      Array.from(tracker.keys()).forEach(key => {
        if (!activeKeys.has(key)) {
          tracker.delete(key);
        }
      });

      return events;
    }

    function createEmptyPlayerState() {
      return {
        currentTarget: null,
        satisfied: false
      };
    }

    function randomGesture() {
      return gestureVocabulary[Math.floor(Math.random() * gestureVocabulary.length)];
    }

    function pickDistinctGestures() {
      const first = randomGesture();
      let second = randomGesture();
      let guard = 0;
      while (second.id === first.id && guard < 5) {
        second = randomGesture();
        guard += 1;
      }
      if (second.id === first.id) {
        const pool = gestureVocabulary.filter(g => g.id !== first.id);
        if (pool.length) {
          second = pool[Math.floor(Math.random() * pool.length)];
        }
      }
      return [first, second];
    }

    function createTargetEntry(gestures: Array<{ id: string; name: string; emoji: string }>) {
      const normalized = gestures.map(g => ({ id: g.id, name: g.name, emoji: g.emoji }));
      const idSignature = normalized
        .map(item => item.id)
        .slice()
        .sort()
        .join("|");
      return {
        type: normalized.length === 1 ? "single" : "double",
        gestures: normalized,
        idSignature
      };
    }

    function assignTarget(playerId: number, target: any) {
      const state = playerTargets[playerId];
      if (!state) {
        return;
      }
      state.currentTarget = target;
      state.satisfied = false;
      updateTargetDisplay(playerId);
    }

    function assignNormalTarget(playerId: number) {
      const isDouble = Math.random() < DOUBLE_GESTURE_RATE && gestureVocabulary.length >= 2;
      const entry = isDouble
        ? createTargetEntry(pickDistinctGestures())
        : createTargetEntry([randomGesture()]);
      assignTarget(playerId, entry);
    }

    function assignRandomTarget(playerId: number) {
      assignNormalTarget(playerId);
    }

    function assignTargetsForBoth() {
      assignRandomTarget(1);
      assignRandomTarget(2);
    }

    function increaseScore(playerId: number, amount: number) {
      if (!scores[playerId]) {
        scores[playerId] = 0;
      }
      scores[playerId] += amount;
      updateScoreDisplay(playerId);
    }

    function updateScoreDisplay(playerId: number) {
      const el = scoreValueEls[playerId];
      if (el) {
        el.textContent = String(scores[playerId] ?? 0);
      }
    }

    function updatePlayerCoinDisplay(playerId: number) {
      const display = targetDisplays[playerId];
      if (display?.coins) {
        display.coins.textContent = String(playerCoinCounts[playerId] ?? 0);
      }
    }

    function incrementPlayerCoins(playerId: number, amount = 1) {
      if (!playerCoinCounts[playerId]) {
        playerCoinCounts[playerId] = 0;
      }
      playerCoinCounts[playerId] += amount;
      updatePlayerCoinDisplay(playerId);
    }

    function updateTimebar(remainingMs: number) {
      const clamped = Math.max(0, Math.min(GAME_DURATION_MS, remainingMs));
      const ratio = clamped / GAME_DURATION_MS;
      timebarFillEl.style.transform = `scaleX(${ratio})`;
      const seconds = Math.max(0, clamped / 1000);
      timebarLabelEl.textContent = `${seconds.toFixed(1)}s`;
    }

    function flashPanelHighlight(playerId: number) {
      const panelEl = panelHighlightRefs.current[playerId];
      const scoreEl = scoreHighlightRefs.current[playerId];
      const elements = [panelEl, scoreEl];
      elements.forEach(el => {
        if (el) {
          el.classList.add("visible");
        }
      });
      const existing = panelHighlightTimeouts.current[playerId];
      const highlightDurationMs = 400;
      const now = performance.now();
      skeletonHighlightStartRef.current[playerId] = now;
      skeletonHighlightUntilRef.current[playerId] = now + highlightDurationMs;
      if (existing) {
        window.clearTimeout(existing);
      }
      panelHighlightTimeouts.current[playerId] = window.setTimeout(() => {
        elements.forEach(el => el?.classList.remove("visible"));
        panelHighlightTimeouts.current[playerId] = null;
        skeletonHighlightStartRef.current[playerId] = 0;
        skeletonHighlightUntilRef.current[playerId] = 0;
      }, highlightDurationMs);
    }

    function enqueueAudioAction(action: () => void) {
      if (ytReady && ytPlayer) {
        action();
      } else {
        pendingAudioActions.push(action);
      }
    }

    function playBackgroundAudio() {
      enqueueAudioAction(() => {
        if (!ytPlayer) {
          return;
        }
        try {
          ytPlayer.seekTo(0, true);
        } catch (error) {
          console.error(error);
        }
        ytPlayer.playVideo();
      });
    }

    function stopBackgroundAudio() {
      if (ytReady && ytPlayer) {
        ytPlayer.stopVideo();
      } else {
        pendingAudioActions.push(() => {
          ytPlayer?.stopVideo();
        });
      }
    }

    function startGameSession() {
      const now = performance.now();
      gameActive = true;
      gameStartTime = now;
      postGameDeadlineRef.current = null;
      setPostGamePrompt(null);
      setTeamName("");
      coins.length = 0;
      coinEffects.length = 0;
      coinsSinceSpecial = 0;
      nextCoinFavor = Math.random() < 0.5 ? 1 : 2;
      lastRenderTimestamp = null;
      scheduleNextCoin(now);
      assignTargetsForBoth();
      scores[1] = 0;
      scores[2] = 0;
      updateScoreDisplay(1);
      updateScoreDisplay(2);
      updateTimebar(GAME_DURATION_MS);
      updateStatusLine("Match in progress. Show your gestures!");
      Object.keys(playerCoinCounts).forEach(id => {
        const numericId = Number(id);
        playerCoinCounts[numericId] = 0;
        coinsSpawnedForPlayer[numericId] = 0;
        updatePlayerCoinDisplay(numericId);
      });
      Object.keys(skeletonHighlightStartRef.current).forEach(id => {
        const numericId = Number(id);
        skeletonHighlightStartRef.current[numericId] = 0;
        skeletonHighlightUntilRef.current[numericId] = 0;
      });
      stopBackgroundAudio();
      playBackgroundAudio();
    }

    function updateGameClock(now: number) {
      if (!gameActive) {
        return;
      }
      const elapsed = now - gameStartTime;
      const remaining = Math.max(0, GAME_DURATION_MS - elapsed);
      updateTimebar(remaining);
      if (remaining <= 0) {
        endGameSession();
      }
    }

    function endGameSession() {
      if (!gameActive) {
        return;
      }
      gameActive = false;
      coins.length = 0;
      coinEffects.length = 0;
      coinsSinceSpecial = 0;
      updateTimebar(0);
      const finalP1 = scores[1] ?? 0;
      const finalP2 = scores[2] ?? 0;
      const winnerId = finalP1 >= finalP2 ? 1 : 2;
      const winnerScore = scores[winnerId] ?? 0;
      const winnerSymbols = playerCoinCounts[winnerId] ?? 0;
      [1, 2].forEach(playerId => {
        const state = playerTargets[playerId];
        if (state) {
          state.satisfied = false;
          state.currentTarget = null;
        }
        coinsSpawnedForPlayer[playerId] = 0;
        skeletonHighlightStartRef.current[playerId] = 0;
        skeletonHighlightUntilRef.current[playerId] = 0;
      });
      stopBackgroundAudio();
      updateAllTargetDisplays();
      lastGameEndTime = performance.now();
      triggerPostGamePrompt(winnerId, winnerScore, winnerSymbols);
    }

    function scheduleNextCoin(now: number) {
      nextCoinSpawnTime = now + randomBetween(COIN_MIN_INTERVAL_MS, COIN_MAX_INTERVAL_MS);
    }

    function randomBetween(min: number, max: number) {
      return min + Math.random() * (max - min);
    }

    function updateCoins(now: number, deltaSeconds: number, hands: any[]) {
      if (!gameActive) {
        coins.length = 0;
        coinEffects.length = 0;
        return;
      }

      if (now >= nextCoinSpawnTime) {
        spawnCoin(now);
        scheduleNextCoin(now);
      }

      const hitboxes = hands.map(hand => hand.hitbox).filter(Boolean);

      for (let i = coins.length - 1; i >= 0; i -= 1) {
        const coin = coins[i];
        const age = now - coin.spawnTime;
        coin.y += coin.speed * deltaSeconds;
        const wiggle = Math.sin((age / 1000) * coin.frequency) * coin.amplitude;
        coin.x = Math.max(0.06, Math.min(0.94, coin.baseX + wiggle));

        if (age > COIN_LIFETIME_MS || coin.y > 1.15) {
          coins.splice(i, 1);
          continue;
        }

        const coinPx = coin.x * canvasElement.width;
        const coinPy = coin.y * canvasElement.height;
        let collected = false;
        let collectorId: number | null = null;

        for (const box of hitboxes) {
          if (
            coinPx >= box.x &&
            coinPx <= box.x + box.width &&
            coinPy >= box.y &&
            coinPy <= box.y + box.height
          ) {
            collected = true;
            collectorId = box.playerId ?? null;
            break;
          }
        }

        if (collected && collectorId) {
          playSound("collectPoint");
          increaseScore(collectorId, coin.value);
          incrementPlayerCoins(collectorId);
          spawnCoinEffect(now, coin);
          coins.splice(i, 1);
        } else if (collected) {
          spawnCoinEffect(now, coin);
          coins.splice(i, 1);
        }
      }
    }

    function drawCoins(now: number) {
      for (let i = coinEffects.length - 1; i >= 0; i -= 1) {
        const effect = coinEffects[i];
        if (now - effect.spawnTime > effect.lifetime) {
          coinEffects.splice(i, 1);
        }
      }

      [...coins, ...coinEffects].forEach(coin => {
        const age = now - coin.spawnTime;
        let alpha = 1;
        if (!coin.effect && age > COIN_BLINK_MS) {
          alpha = Math.floor((age - COIN_BLINK_MS) / 120) % 2 ? 0.35 : 1;
        }

        const x = coin.x * canvasElement.width;
        const y = coin.y * canvasElement.height;
        const radius = coin.radius;

        canvasCtx.save();
        canvasCtx.globalAlpha = alpha;
        canvasCtx.translate(x, y);

        if (coin.effect) {
          drawCoinSplash(coin, age);
        } else {
          const gradient = canvasCtx.createRadialGradient(0, 0, radius * 0.25, 0, 0, radius);
          if (coin.special) {
            gradient.addColorStop(0, "rgba(140, 235, 255, 1)");
            gradient.addColorStop(1, "rgba(70, 170, 255, 0.9)");
          } else {
            gradient.addColorStop(0, "rgba(255, 240, 180, 1)");
            gradient.addColorStop(1, "rgba(255, 205, 70, 0.92)");
          }
          canvasCtx.fillStyle = gradient;
          canvasCtx.beginPath();
          canvasCtx.arc(0, 0, radius, 0, Math.PI * 2);
          canvasCtx.fill();

          canvasCtx.strokeStyle = coin.special ? "rgba(90, 200, 255, 0.95)" : "rgba(250, 220, 120, 0.9)";
          canvasCtx.lineWidth = 2;
          canvasCtx.beginPath();
          canvasCtx.arc(0, 0, radius - 1, 0, Math.PI * 2);
          canvasCtx.stroke();

          canvasCtx.fillStyle = coin.special ? "rgba(230, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.7)";
          canvasCtx.beginPath();
          canvasCtx.arc(-radius * 0.25, -radius * 0.25, radius * 0.18, 0, Math.PI * 2);
          canvasCtx.fill();
        }

        canvasCtx.restore();
      });
    }

    function drawCoinSplash(effect: any, age: number) {
      const progress = Math.min(1, age / effect.lifetime);
      const baseRadius = effect.radius;
      const outerRadius = baseRadius * (1 + progress * 1.8);
      const innerRadius = baseRadius * (0.6 + progress * 0.7);

      const gradient = canvasCtx.createRadialGradient(0, 0, innerRadius * 0.4, 0, 0, outerRadius);
      if (effect.special) {
        gradient.addColorStop(0, "rgba(160, 245, 255, 0.9)");
        gradient.addColorStop(1, "rgba(80, 190, 255, 0)");
      } else {
        gradient.addColorStop(0, "rgba(255, 233, 120, 0.9)");
        gradient.addColorStop(1, "rgba(255, 190, 40, 0)");
      }
      canvasCtx.fillStyle = gradient;
      canvasCtx.beginPath();
      canvasCtx.arc(0, 0, outerRadius, 0, Math.PI * 2);
      canvasCtx.fill();

      canvasCtx.strokeStyle = effect.special
        ? `rgba(120, 220, 255, ${1 - progress})`
        : `rgba(255, 220, 80, ${1 - progress})`;
      canvasCtx.lineWidth = 2;
      canvasCtx.beginPath();
      canvasCtx.arc(0, 0, innerRadius, 0, Math.PI * 2);
      canvasCtx.stroke();
    }

    function spawnCoin(now: number) {
      const p1Coins = playerCoinCounts[1] ?? 0;
      const p2Coins = playerCoinCounts[2] ?? 0;
      const spawnBalance = (coinsSpawnedForPlayer[1] ?? 0) - (coinsSpawnedForPlayer[2] ?? 0);
      let targetPlayer: 1 | 2;
      if (spawnBalance > 0) {
        targetPlayer = 2;
      } else if (spawnBalance < 0) {
        targetPlayer = 1;
      } else if (p1Coins < p2Coins) {
        targetPlayer = 1;
      } else if (p2Coins < p1Coins) {
        targetPlayer = 2;
      } else {
        targetPlayer = nextCoinFavor;
        nextCoinFavor = targetPlayer === 1 ? 2 : 1;
      }
      coinsSpawnedForPlayer[targetPlayer] = (coinsSpawnedForPlayer[targetPlayer] ?? 0) + 1;

      const baseX =
        targetPlayer === 1
          ? randomBetween(0.18, 0.44)
          : randomBetween(0.56, 0.82);
      const allowSpecial = coinsSinceSpecial >= 2;
      const isSpecial = allowSpecial && Math.random() < 1 / 3;
      coinsSinceSpecial = isSpecial ? 0 : Math.min(coinsSinceSpecial + 1, 3);

      const baseSpeed = randomBetween(0.28, 0.4);
      const coin = {
        spawnTime: now,
        baseX,
        x: baseX,
        y: -0.08,
        amplitude: randomBetween(0.02, 0.06),
        frequency: randomBetween(2.0, 3.5),
        speed: isSpecial ? baseSpeed * 1.9 : baseSpeed,
        radius: isSpecial ? 16 : 22,
        special: isSpecial,
        value: isSpecial ? 3 : 1
      };
      coins.push(coin);
    }

    function spawnCoinEffect(now: number, coin: any) {
      coinEffects.push({
        effect: true,
        spawnTime: now,
        x: coin.x,
        y: coin.y,
        radius: coin.radius,
        lifetime: coin.special ? 550 : 400,
        special: coin.special
      });
    }

    function handlePlayerProgress(players: Array<{ id: number; hands: any[] }>, now: number) {
      const visible = new Map(players.map(player => [player.id, player]));
      const thumbsUpReady = new Set<number>();
      const waitingForAutoStart = !gameActive && cameraReady && waitingForStart && !postGamePromptRef.current;

      [1, 2].forEach(playerId => {
        const state = playerTargets[playerId];
        if (!state) {
          return;
        }

        const playerData = visible.get(playerId);
        const thumbCount = playerData
          ? playerData.hands.filter(hand => hand.gesture?.id === "Thumb_Up").length
          : 0;

        if (thumbCount >= 2) {
          lastPlayerThumbTime[playerId] = now;
        }

        if (waitingForAutoStart && thumbCount >= 2) {
          thumbsUpReady.add(playerId);
        }

        const target = getCurrentTarget(playerId);
        const wasSatisfied = !!state.satisfied;
        if (!target) {
          state.satisfied = true;
          updateTargetDisplay(playerId);
          return;
        }

        let nextSatisfied = false;
        if (playerData) {
          const gestures = playerData.hands
            .map(hand => hand.gesture?.id)
            .filter(Boolean);
          nextSatisfied = isTargetSatisfied(target, gestures);
        }
        state.satisfied = nextSatisfied;

        const justSatisfied = !!state.currentTarget && !wasSatisfied && nextSatisfied;

        if (state.currentTarget && nextSatisfied) {
          if (justSatisfied) {
            flashPanelHighlight(playerId);
          }
          completePlayerTarget(playerId);
        } else {
          updateTargetDisplay(playerId);
        }
      });

      if (
        waitingForAutoStart &&
        thumbsUpReady.has(1) &&
        thumbsUpReady.has(2) &&
        now - lastPlayerThumbTime[1] < 1500 &&
        now - lastPlayerThumbTime[2] < 1500 &&
        now - lastGameEndTime > 800
      ) {
        beginMatch();
      }

      if (
        postGamePromptRef.current &&
        lastPlayerThumbTime[1] > 0 &&
        lastPlayerThumbTime[2] > 0 &&
        now - lastPlayerThumbTime[1] < 1500 &&
        now - lastPlayerThumbTime[2] < 1500
      ) {
        if (postGameTimerRef.current) {
          cancelAnimationFrame(postGameTimerRef.current);
          postGameTimerRef.current = null;
        }
        postGameDeadlineRef.current = null;
        setPostGamePrompt(null);
        setTeamName("");
        waitingForStart = true;
        beginMatch();
      }
    }

    function getCurrentTarget(playerId: number) {
      const state = playerTargets[playerId];
      if (!state) {
        return null;
      }
      return state.currentTarget;
    }

    function isTargetSatisfied(target: any, gestures: Array<string | undefined>) {
      if (!gestures.length) {
        return false;
      }

      const pool = [...gestures];
      return target.gestures.every((required: { id: string }) => {
        const idx = pool.indexOf(required.id);
        if (idx === -1) {
          return false;
        }
        pool.splice(idx, 1);
        return true;
      });
    }

    function completePlayerTarget(playerId: number) {
      if (!gameActive) {
        return;
      }
      const state = playerTargets[playerId];
      if (!state || !state.currentTarget) {
        return;
      }

      try {
        // Map playerId to correct sound type
        const soundType: 'gesture_match' | 'playerTwo' = playerId === 1 ? 'gesture_match' : 'playerTwo';
        console.log(soundType)
        playSound(soundType);
      } catch (error) {
        console.error("Failed to play reward sound:", error);
      }
      increaseScore(playerId, 2);
      assignRandomTarget(playerId);
    }

    function updateAllTargetDisplays() {
      updateTargetDisplay(1);
      updateTargetDisplay(2);
    }

    function updateTargetDisplay(playerId: number) {
      const display = targetDisplays[playerId];
      const state = playerTargets[playerId] ?? createEmptyPlayerState();
      playerTargets[playerId] = state;
      const target = getCurrentTarget(playerId);

      if (display?.prompt) {
        display.prompt.classList.toggle("satisfied", !!state.satisfied);
      }

      if (!display?.prompt) {
        return;
      }

      if (!target) {
        display.prompt.textContent = gameActive ? "…" : "👍👍";
        return;
      }
      const emojis = Array.isArray(target.gestures)
        ? target.gestures.map((item: { emoji: string }) => item.emoji)
        : [];
      display.prompt.textContent =
        emojis.length === 2 ? emojis.join("  ") : emojis.join("");
    }

    function distance3D(a: { x: number; y: number; z?: number }, b: { x: number; y: number; z?: number }) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = (a.z ?? 0) - (b.z ?? 0);
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    return () => {
      disposed = true;
      document.head.removeChild(styleEl);
      startButton.removeEventListener("click", handleStartClick);
      if (resetButton) {
        resetButton.removeEventListener("click", handleResetClick);
      }
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (gestureRecognizer) {
        void gestureRecognizer.close();
      }
      const stream = videoElement.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach(track => track.stop());
      }
      stopBackgroundAudio();
      if (ytPlayer?.destroy) {
        ytPlayer.destroy();
      }
      if (addedYoutubeScript && ytScriptTag?.parentNode) {
        ytScriptTag.parentNode.removeChild(ytScriptTag);
      }
      if (previousYoutubeReady) {
        window.onYouTubeIframeAPIReady = previousYoutubeReady;
      } else {
        delete window.onYouTubeIframeAPIReady;
      }
    };
  }, []);

  return (
    <div className="game-live-page">
      <main>
        <div className="top-bar">
          <div className="timebar">
            <div className="timebar-fill" ref={timebarFillRef} />
            <div className="timebar-label" ref={timebarLabelRef}>
              90.0s
            </div>
          </div>
        </div>

        <div className="game-layout">
          <div className="side-column" aria-label="Player 1 column">
            <aside className="player-panel" aria-label="Player 1 target">
              <span className="panel-highlight" ref={panelRefSetter(1)} />
              <span className="score-label">Player 1</span>
              <div className="target-emoji" ref={player1PromptRef}>
                👍👍
              </div>
            </aside>
            <div className="score-block">
              <span className="panel-highlight" ref={scoreRefSetter(1)} />
              <span className="score-label">Player 1 Score</span>
              <strong className="score-value" ref={scoreValueP1Ref}>
                0
              </strong>
            </div>
          </div>

          <div className="stage-wrapper">
            <section className="stage">
              <video ref={videoRef} playsInline muted />
              <canvas ref={canvasRef} />
              <div className="ready-overlay" ref={readyOverlayRef}>
                Press Start or show 👍👍 to begin.
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
                        Victory! Player {postGamePrompt.winnerId}
                      </h3>
                      <p style={{ margin: "0.35rem 0 0", color: "rgba(220, 230, 255, 0.8)" }}>
                        Score: {postGamePrompt.score} · Bonus coins: {postGamePrompt.symbols}
                      </p>
                    </div>

                    <div className="post-game-progress">
                      <div
                        className="post-game-progress-bar"
                        style={{ transform: `scaleX(${Math.max(0, 1 - postGamePrompt.remainingMs / POST_GAME_TIMEOUT_MS)})` }}
                      />
                    </div>
                    <p style={{ color: "rgba(255, 205, 205, 0.85)", fontSize: "0.9rem", margin: 0 }}>
                      Auto-return in {(postGamePrompt.remainingMs / 1000).toFixed(1)}s
                    </p>

                    <label style={{ fontSize: "0.95rem", color: "rgba(235, 245, 255, 0.85)" }}>
                      Team / Winner Name
                    </label>
                    <input
                      className="post-game-input"
                      value={teamName}
                      onChange={event => setTeamName(event.target.value)}
                      placeholder="Enter a name or both player names"
                      disabled={postGamePrompt.submitting}
                    />

                    {postGamePrompt.error && (
                      <p style={{ color: "#ff9a9a", margin: 0 }}>{postGamePrompt.error}</p>
                    )}

                    <div className="post-game-actions">
                      <button
                        type="button"
                        disabled={postGamePrompt.submitting}
                        onClick={handleSubmitWinner}
                      >
                        {postGamePrompt.submitting ? "Submitting…" : "Submit to Leaderboard"}
                      </button>
                      <button type="button" onClick={exitToMenu}>
                        Skip & Return
                      </button>
                    </div>
                    <div style={{display: "flex", justifyContent: "center", marginTop: "0.6rem", fontSize: "0.85rem", color: "rgba(200, 220, 255, 0.75)"}}>
                      To play again, give a 👍 each with both hands
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="side-column" aria-label="Player 2 column">
            <aside className="player-panel" aria-label="Player 2 target">
              <span className="panel-highlight" ref={panelRefSetter(2)} />
              <span className="score-label">Player 2</span>
              <div className="target-emoji" ref={player2PromptRef}>
                👍👍
              </div>
            </aside>
            <div className="score-block">
              <span className="panel-highlight" ref={scoreRefSetter(2)} />
              <span className="score-label">Player 2 Score</span>
              <strong className="score-value" ref={scoreValueP2Ref}>
                0
              </strong>
            </div>
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
          Press Start or show 👍👍 to begin.
        </div>

        <div className="hidden-audio">
          <div ref={ytPlayerContainerRef} />
        </div>
      </main>
    </div>
  );
};

export default GameLive;
