// Two-player "Gesture Battle": both players share the camera, one on each
// half of the frame. Each player matches their target gestures and grabs
// falling coins. The game loop runs in one effect and updates the DOM through
// refs, so React only re-renders for the countdown and the post-game modal.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitScore } from "@/leaderboardApi";
import { useUser } from "@/context/UserContext";
import { useRewardSound } from "@/context/rewardSoundContext";
import MusicButton from "@/components/design/MusicButton";
import {
  DrawingUtils,
  createGestureRecognizer,
  describeMediaError,
  openCamera,
  type GestureRecognizer
} from "@/mediapipe";
import { CoinField } from "./coins";
import { drawHand } from "./drawing";
import {
  PLAYER_IDS,
  computeHitbox,
  groupHandsIntoPlayers,
  processHands,
  type Player,
  type PlayerId
} from "./hands";
import PostGameModal, { POST_GAME_TIMEOUT_MS, type PostGameState } from "./PostGameModal";
import { createRandomTarget, formatTarget, isTargetSatisfied, type Target } from "./targets";
import "./GameLive.css";

const GAME_DURATION_MS = 60_000;
// Both players must show 👍👍 (or 👎👎) within this window to trigger an action
const BOTH_PLAYERS_WINDOW_MS = 1500;
// Ignore 👍👍 right after a match ends so it doesn't immediately restart
const RESTART_GRACE_MS = 800;
const TARGET_HIGHLIGHT_MS = 400;
const TARGET_POINTS = 2;

const READY_PROMPT_INITIAL = "Press Start or show 👍👍 (each) to begin. <br/><br/> Match as many gestures as possible.";
const READY_PROMPT_READY = "Camera ready!<br/>Press Start or show 👍👍 (each) to begin. <br/><br/> Match as many gestures as possible.";
const READY_PROMPT_REPLAY = "Great run!<br/>Press Start or show 👍👍 (each) to play again. <br/><br/> Match as many gestures as possible.";

interface PlayerState {
  target: Target | null;
  satisfied: boolean;
  score: number;
  coins: number;
  lastThumbsUp: number;
  lastThumbsDown: number;
  // Window in which the player's skeleton flashes after a matched target
  highlightStart: number;
  highlightEnd: number;
}

function createPlayerState(): PlayerState {
  return {
    target: null,
    satisfied: false,
    score: 0,
    coins: 0,
    lastThumbsUp: 0,
    lastThumbsDown: 0,
    highlightStart: 0,
    highlightEnd: 0
  };
}

const GameLive = () => {
  const { playSound } = useRewardSound();
  const navigate = useNavigate();
  const { user } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const statusMessageRef = useRef<HTMLDivElement>(null);
  const scoreValueRefs = useRef<Record<PlayerId, HTMLElement | null>>({ 1: null, 2: null });
  const promptRefs = useRef<Record<PlayerId, HTMLDivElement | null>>({ 1: null, 2: null });
  const panelHighlightRefs = useRef<Record<PlayerId, HTMLSpanElement | null>>({ 1: null, 2: null });
  const scoreHighlightRefs = useRef<Record<PlayerId, HTMLSpanElement | null>>({ 1: null, 2: null });
  const timebarFillRef = useRef<HTMLDivElement>(null);
  const timebarLabelRef = useRef<HTMLDivElement>(null);
  const readyOverlayRef = useRef<HTMLDivElement>(null);
  const [postGamePrompt, setPostGamePrompt] = useState<PostGameState | null>(null);
  const postGamePromptRef = useRef<PostGameState | null>(null);
  const postGameDeadlineRef = useRef<number | null>(null);
  const postGameTimerRef = useRef<number | null>(null);
  const [countdownText, setCountdownText] = useState<string | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  const updateStatusLine = (message: string) => {
    if (statusMessageRef.current) {
      statusMessageRef.current.textContent = message;
    }
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
    clearCountdown();
    updateStatusLine("Returning to menu...");
    navigate("/play");
  };

  // The game loop effect runs once; it reads these through a ref so it always
  // calls the latest versions
  const callbacksRef = useRef({ exitToMenu, playSound });
  useEffect(() => {
    callbacksRef.current = { exitToMenu, playSound };
  });

  const handleSubmitWinner = async () => {
    const prompt = postGamePromptRef.current;
    if (!prompt) {
      return;
    }

    if (!user) {
      setPostGamePrompt(prev => (prev ? { ...prev, error: "You need to be logged in to submit a score." } : prev));
      return;
    }

    setPostGamePrompt(prev => (prev ? { ...prev, submitting: true, error: undefined } : prev));

    try {
      await submitScore({
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
    if (countdownTimerRef.current) {
      window.clearTimeout(countdownTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const startButton = startButtonRef.current;
    const resetButton = resetButtonRef.current;
    const timebarFillEl = timebarFillRef.current;
    const timebarLabelEl = timebarLabelRef.current;
    const readyOverlayEl = readyOverlayRef.current;
    const canvasCtx = canvasElement?.getContext("2d", { willReadFrequently: false });
    if (
      !videoElement ||
      !canvasElement ||
      !canvasCtx ||
      !startButton ||
      !resetButton ||
      !timebarFillEl ||
      !timebarLabelEl ||
      !readyOverlayEl
    ) {
      return;
    }

    const players: Record<PlayerId, PlayerState> = { 1: createPlayerState(), 2: createPlayerState() };
    const coinField = new CoinField();
    const highlightTimeouts: Record<PlayerId, number | null> = { 1: null, 2: null };

    let disposed = false;
    let cameraReady = false;
    let waitingForStart = true;
    let lastGameEndTime = 0;
    let gameActive = false;
    let gameStartTime = 0;
    let gestureRecognizer: GestureRecognizer | null = null;
    let drawingUtils: DrawingUtils | null = null;
    let videoRunning = false;
    let lastVideoTime = -1;
    let lastRenderTimestamp: number | null = null;
    let animationFrameId = 0;

    // --- Display -----------------------------------------------------------

    function showReadyOverlay(message: string) {
      readyOverlayEl!.innerHTML = message;
      readyOverlayEl!.classList.add("visible");
    }

    function hideReadyOverlay() {
      readyOverlayEl!.classList.remove("visible");
    }

    function updateScoreDisplay(playerId: PlayerId) {
      const el = scoreValueRefs.current[playerId];
      if (el) {
        el.textContent = String(players[playerId].score);
      }
    }

    function updateTargetDisplay(playerId: PlayerId) {
      const promptEl = promptRefs.current[playerId];
      if (!promptEl) {
        return;
      }
      const state = players[playerId];
      promptEl.classList.toggle("satisfied", state.satisfied);
      if (!state.target) {
        promptEl.textContent = gameActive ? "…" : "👍👍";
        return;
      }
      promptEl.textContent = formatTarget(state.target);
    }

    function updateAllDisplays() {
      PLAYER_IDS.forEach(playerId => {
        updateTargetDisplay(playerId);
        updateScoreDisplay(playerId);
      });
    }

    function updateTimebar(remainingMs: number) {
      const clamped = Math.max(0, Math.min(GAME_DURATION_MS, remainingMs));
      timebarFillEl!.style.transform = `scaleX(${clamped / GAME_DURATION_MS})`;
      timebarLabelEl!.textContent = `${(clamped / 1000).toFixed(1)}s`;
    }

    function flashPanelHighlight(playerId: PlayerId) {
      const elements = [panelHighlightRefs.current[playerId], scoreHighlightRefs.current[playerId]];
      elements.forEach(el => el?.classList.add("visible"));
      const now = performance.now();
      players[playerId].highlightStart = now;
      players[playerId].highlightEnd = now + TARGET_HIGHLIGHT_MS;
      const existing = highlightTimeouts[playerId];
      if (existing) {
        window.clearTimeout(existing);
      }
      highlightTimeouts[playerId] = window.setTimeout(() => {
        elements.forEach(el => el?.classList.remove("visible"));
        highlightTimeouts[playerId] = null;
        players[playerId].highlightStart = 0;
        players[playerId].highlightEnd = 0;
      }, TARGET_HIGHLIGHT_MS);
    }

    function highlightIntensity(playerId: PlayerId | null, now: number) {
      if (playerId === null) {
        return 0;
      }
      const { highlightStart, highlightEnd } = players[playerId];
      if (highlightEnd <= highlightStart || now > highlightEnd) {
        return 0;
      }
      return Math.max(0, Math.min(1, (highlightEnd - now) / (highlightEnd - highlightStart)));
    }

    // --- Game state --------------------------------------------------------

    function enterWaitingState(message: string) {
      waitingForStart = true;
      showReadyOverlay(message);
      startButton!.disabled = false;
      startButton!.textContent = "Start";
      resetButton!.disabled = true;
      resetButton!.textContent = "Cancel";
      postGameDeadlineRef.current = null;
      setPostGamePrompt(null);
      updateStatusLine(message.replace(/<br\s*\/?>/gi, " ").trim());
    }

    // Shows camera/model failures in the overlay; Start then acts as a retry
    function showTrackingError(error: unknown) {
      cameraReady = false;
      enterWaitingState(`⚠️ ${describeMediaError(error)}`);
      startButton!.textContent = "Retry";
    }

    function beginMatch() {
      if (disposed || gameActive || !cameraReady) {
        return;
      }
      waitingForStart = false;
      hideReadyOverlay();
      clearCountdown();
      updateStatusLine("Match starting…");
      startButton!.disabled = true;
      resetButton!.disabled = false;
      resetButton!.textContent = "Cancel";
      postGameDeadlineRef.current = null;
      setPostGamePrompt(null);

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
          startGameSession();
        }
      };

      countdownTimerRef.current = window.setTimeout(advance, 700);
    }

    function startGameSession() {
      const now = performance.now();
      gameActive = true;
      gameStartTime = now;
      lastRenderTimestamp = null;
      postGameDeadlineRef.current = null;
      setPostGamePrompt(null);
      coinField.reset(now);
      PLAYER_IDS.forEach(playerId => {
        const state = players[playerId];
        state.score = 0;
        state.coins = 0;
        state.highlightStart = 0;
        state.highlightEnd = 0;
        assignTarget(playerId);
      });
      updateAllDisplays();
      updateTimebar(GAME_DURATION_MS);
      updateStatusLine("Match in progress. Show your gestures!");
    }

    function endGameSession() {
      if (!gameActive) {
        return;
      }
      gameActive = false;
      coinField.clear();
      updateTimebar(0);
      const winnerId: PlayerId = players[1].score >= players[2].score ? 1 : 2;
      PLAYER_IDS.forEach(playerId => {
        const state = players[playerId];
        state.satisfied = false;
        state.target = null;
        state.highlightStart = 0;
        state.highlightEnd = 0;
      });
      updateAllDisplays();
      lastGameEndTime = performance.now();
      showPostGamePrompt(winnerId, players[winnerId].score, players[winnerId].coins);
    }

    function updateGameClock(now: number) {
      if (!gameActive) {
        return;
      }
      const remaining = Math.max(0, GAME_DURATION_MS - (now - gameStartTime));
      updateTimebar(remaining);
      if (remaining <= 0) {
        endGameSession();
      }
    }

    function assignTarget(playerId: PlayerId) {
      players[playerId].target = createRandomTarget();
      players[playerId].satisfied = false;
      updateTargetDisplay(playerId);
    }

    function addScore(playerId: PlayerId, amount: number) {
      players[playerId].score += amount;
      updateScoreDisplay(playerId);
    }

    function completePlayerTarget(playerId: PlayerId) {
      if (!gameActive || !players[playerId].target) {
        return;
      }
      try {
        callbacksRef.current.playSound(playerId === 1 ? "gesture_match" : "playerTwo");
      } catch (error) {
        console.error("Failed to play reward sound:", error);
      }
      addScore(playerId, TARGET_POINTS);
      assignTarget(playerId);
    }

    // --- Post-game prompt --------------------------------------------------

    function showPostGamePrompt(winnerId: PlayerId, score: number, symbols: number) {
      postGameDeadlineRef.current = performance.now() + POST_GAME_TIMEOUT_MS;
      const prompt: PostGameState = {
        winnerId,
        score,
        symbols,
        remainingMs: POST_GAME_TIMEOUT_MS,
        submitting: false
      };
      postGamePromptRef.current = prompt;
      setPostGamePrompt(prompt);
      updateStatusLine(
        "Great run! Enter your team name to submit the win, show 👍👍 to play again, or show 👎👎 to return to the menu."
      );
      resetButton!.disabled = false;
      resetButton!.textContent = "Skip";
      startButton!.disabled = true;
      startPostGameCountdown();
    }

    function startPostGameCountdown() {
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
          callbacksRef.current.exitToMenu();
          return;
        }
        postGameTimerRef.current = requestAnimationFrame(tick);
      };
      postGameTimerRef.current = requestAnimationFrame(tick);
    }

    function cancelPostGamePrompt() {
      if (postGameTimerRef.current) {
        cancelAnimationFrame(postGameTimerRef.current);
        postGameTimerRef.current = null;
      }
      postGameDeadlineRef.current = null;
      setPostGamePrompt(null);
    }

    // --- Gesture controls --------------------------------------------------

    function bothRecently(times: (state: PlayerState) => number, now: number) {
      return PLAYER_IDS.every(id => {
        const time = times(players[id]);
        return time > 0 && now - time < BOTH_PLAYERS_WINDOW_MS;
      });
    }

    function handlePlayerProgress(visiblePlayers: Player[], now: number) {
      const visible = new Map(visiblePlayers.map(player => [player.id, player]));
      const waitingForAutoStart = !gameActive && cameraReady && waitingForStart && !postGamePromptRef.current;
      const thumbsUpReady = new Set<PlayerId>();

      PLAYER_IDS.forEach(playerId => {
        const state = players[playerId];
        const gestureIds = (visible.get(playerId)?.hands ?? [])
          .map(hand => hand.gesture?.id)
          .filter((id): id is string => !!id);
        const thumbsUp = gestureIds.filter(id => id === "Thumb_Up").length;
        const thumbsDown = gestureIds.filter(id => id === "Thumb_Down").length;

        if (thumbsUp >= 2) {
          state.lastThumbsUp = now;
          if (waitingForAutoStart) {
            thumbsUpReady.add(playerId);
          }
        }
        if (thumbsDown >= 2) {
          state.lastThumbsDown = now;
        }

        if (!state.target) {
          state.satisfied = true;
          updateTargetDisplay(playerId);
          return;
        }

        const wasSatisfied = state.satisfied;
        state.satisfied = isTargetSatisfied(state.target, gestureIds);
        if (state.satisfied) {
          if (!wasSatisfied) {
            flashPanelHighlight(playerId);
          }
          completePlayerTarget(playerId);
        } else {
          updateTargetDisplay(playerId);
        }
      });

      if (
        waitingForAutoStart &&
        thumbsUpReady.size === PLAYER_IDS.length &&
        bothRecently(state => state.lastThumbsUp, now) &&
        now - lastGameEndTime > RESTART_GRACE_MS
      ) {
        beginMatch();
      }

      if (postGamePromptRef.current && bothRecently(state => state.lastThumbsUp, now)) {
        cancelPostGamePrompt();
        waitingForStart = true;
        beginMatch();
      }

      if (postGamePromptRef.current && bothRecently(state => state.lastThumbsDown, now)) {
        callbacksRef.current.exitToMenu();
      }
    }

    // --- Tracking and rendering --------------------------------------------

    async function initializeCamera() {
      const stream = await openCamera({
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user"
      });

      videoElement!.srcObject = stream;

      await new Promise<void>(resolve => {
        videoElement!.onloadedmetadata = () => {
          void videoElement!.play();
          canvasElement!.width = videoElement!.videoWidth || 1280;
          canvasElement!.height = videoElement!.videoHeight || 720;
          resolve();
        };
      });
    }

    async function ensureTrackingReady() {
      if (!videoRunning) {
        await initializeCamera();
        videoRunning = true;
      }
      if (!gestureRecognizer) {
        // The 0.10.0 CDN build this replaces ran on the CPU delegate
        gestureRecognizer = await createGestureRecognizer({ runningMode: "VIDEO", numHands: 4 }, "CPU");
      }
      if (!drawingUtils) {
        drawingUtils = new DrawingUtils(canvasCtx!);
      }
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(predictFrame);
      }
      if (!disposed) {
        cameraReady = true;
      }
    }

    function predictFrame(nowInMs: number) {
      if (!videoRunning || !gestureRecognizer) {
        return;
      }

      if (videoElement!.currentTime !== lastVideoTime) {
        lastVideoTime = videoElement!.currentTime;
        const deltaSeconds = lastRenderTimestamp ? (nowInMs - lastRenderTimestamp) / 1000 : 0;
        lastRenderTimestamp = nowInMs;
        renderFrame(nowInMs, deltaSeconds);
      }

      updateGameClock(nowInMs);
      animationFrameId = requestAnimationFrame(predictFrame);
    }

    function renderFrame(now: number, deltaSeconds: number) {
      const ctx = canvasCtx!;
      const { width, height } = canvasElement!;
      const results = gestureRecognizer!.recognizeForVideo(videoElement!, now);
      const hands = processHands(results);
      const { players: visiblePlayers, handToPlayer } = groupHandsIntoPlayers(hands);

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      if (hands.length) {
        handlePlayerProgress(visiblePlayers, now);
      }

      const hitboxes = hands.map(hand => {
        const playerId = handToPlayer.get(hand.index) ?? null;
        const hitbox = computeHitbox(hand, playerId, width, height);
        drawHand(ctx, drawingUtils!, hand, hitbox, highlightIntensity(playerId, now));
        return hitbox;
      });

      if (gameActive) {
        const collectedCounts = { 1: players[1].coins, 2: players[2].coins };
        for (const { playerId, value } of coinField.update(now, deltaSeconds, hitboxes, width, height, collectedCounts)) {
          callbacksRef.current.playSound("collectPoint");
          addScore(playerId, value);
          players[playerId].coins += 1;
        }
      } else {
        coinField.clear();
      }
      coinField.draw(ctx, now);

      ctx.restore();
    }

    function releaseCamera() {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (gestureRecognizer) {
        void gestureRecognizer.close();
      }
      const stream = videoElement!.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }

    // --- Buttons -----------------------------------------------------------

    async function handleStartClick() {
      if (gameActive) {
        return;
      }

      startButton!.disabled = true;
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
        if (!disposed) {
          showTrackingError(error);
        }
      }
    }

    function handleResetClick() {
      if (postGamePromptRef.current) {
        callbacksRef.current.exitToMenu();
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

    // --- Setup -------------------------------------------------------------

    enterWaitingState(READY_PROMPT_INITIAL);
    updateAllDisplays();
    updateTimebar(GAME_DURATION_MS);

    startButton.addEventListener("click", handleStartClick);
    resetButton.addEventListener("click", handleResetClick);
    window.addEventListener("beforeunload", releaseCamera);

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
        if (!disposed) {
          showTrackingError(error);
        }
      }
    };
    void warmupCamera();

    return () => {
      disposed = true;
      startButton.removeEventListener("click", handleStartClick);
      resetButton.removeEventListener("click", handleResetClick);
      window.removeEventListener("beforeunload", releaseCamera);
      PLAYER_IDS.forEach(playerId => {
        const timeout = highlightTimeouts[playerId];
        if (timeout) {
          window.clearTimeout(timeout);
        }
      });
      releaseCamera();
    };
  }, []);

  const renderPlayerColumn = (playerId: PlayerId) => (
    <div className="side-column" aria-label={`Player ${playerId} column`}>
      <aside className="player-panel" aria-label={`Player ${playerId} target`}>
        <span className="panel-highlight" ref={el => { panelHighlightRefs.current[playerId] = el; }} />
        <span className="score-label">Player {playerId}</span>
        <div className="target-emoji" ref={el => { promptRefs.current[playerId] = el; }}>
          👍👍
        </div>
      </aside>
      <div className="score-block">
        <span className="panel-highlight" ref={el => { scoreHighlightRefs.current[playerId] = el; }} />
        <span className="score-label">Player {playerId} Score</span>
        <strong className="score-value" ref={el => { scoreValueRefs.current[playerId] = el; }}>
          0
        </strong>
      </div>
    </div>
  );

  return (
    <div className="game-live-page">
      <main>
        <div style={{ position: "absolute", bottom: "1rem", right: "1rem" }}>
          <MusicButton />
        </div>
        <div className="top-bar">
          <div className="timebar">
            <div className="timebar-fill" ref={timebarFillRef} />
            <div className="timebar-label" ref={timebarLabelRef}>
              {(GAME_DURATION_MS / 1000).toFixed(1)}s
            </div>
          </div>
        </div>

        <div className="game-layout">
          {renderPlayerColumn(1)}

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
                <PostGameModal
                  state={postGamePrompt}
                  username={user?.username ?? null}
                  onSubmit={handleSubmitWinner}
                  onSkip={exitToMenu}
                />
              )}
            </section>
          </div>

          {renderPlayerColumn(2)}
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
      </main>
    </div>
  );
};

export default GameLive;
