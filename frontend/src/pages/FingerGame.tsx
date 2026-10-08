import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  HStack,
  Flex,
  Text,
  Progress,
  Badge,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { HandTracker, describeMediaError, drawHands, openCamera, type HandFrame, type NormalizedLandmark } from "../mediapipe";
import { getRandomGesture, type GestureDefinition } from "../gestureApi";
import { landmarksToArray } from "../advancedGestureRecognition";
import { matchGestureLocally } from "../utils/localGestureMatcher";
import { submitScore } from "../leaderboardApi";
import { useUser } from "@/context/UserContext";
import { Toaster, toaster } from "@/components/ui/toaster";
import { useRewardSound } from "../context/rewardSoundContext";
import MusicButton from "@/components/design/MusicButton";

const GAME_DURATION = 45; // 45 seconds
const SIMILARITY_THRESHOLD = 0.55; // 55% similarity to accept

const PlayMode: React.FC = () => {
  const navigate = useNavigate();

  const pageBackground = "radial-gradient(circle at top, #1f1f2e, #0d0d15)";
  const panelBg = "rgba(28, 34, 60, 0.82)";
  const softPanelBg = "rgba(22, 28, 52, 0.7)";
  const borderColor = "rgba(255, 255, 255, 0.08)";
  const mutedText = "rgba(215, 225, 255, 0.78)";
  const accentGood = "#7bffb2";
  const accentWarn = "#ff8a8a";
  const accentPrimary = "#88c8ff";
  const headingGlow = "0 0 26px rgba(120, 180, 255, 0.55)";

  // Game state
  const { playSound } = useRewardSound();
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [currentSymbol, setCurrentSymbol] = useState<string | null>(null);
  const [currentDefinition, setCurrentDefinition] = useState<GestureDefinition | null>(null);
  const [currentThreshold, setCurrentThreshold] = useState(SIMILARITY_THRESHOLD);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [symbolsCompleted, setSymbolsCompleted] = useState(0);
  const [similarity, setSimilarity] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const [waitingForThumbsUp, setWaitingForThumbsUp] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [autoReturnCountdown, setAutoReturnCountdown] = useState(30);
  const [waitingForReplay, setWaitingForReplay] = useState(false);
  const [gestureGracePeriod, setGestureGracePeriod] = useState(true);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<HandTracker | null>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const gameTimerRef = useRef<number | null>(null);
  const autoReturnTimerRef = useRef<number | null>(null);
  const gracePeriodTimerRef = useRef<number | null>(null);
  const gameStateRef = useRef({ 
    gameStarted: false, 
    gameOver: false, 
    currentSymbol: null as string | null,
    currentDefinition: null as GestureDefinition | null
  });
  const matchCooldownRef = useRef<boolean>(false);
  const currentLandmarksRef = useRef<NormalizedLandmark[][] | null>(null);
  const waitingForThumbsUpRef = useRef<boolean>(true);
  const waitingForReplayRef = useRef<boolean>(false);
  const gestureGracePeriodRef = useRef<boolean>(true);

  // Thumbs up detection function
  const isThumbsUp = (landmarks: NormalizedLandmark[]) => {
    const THUMB_TIP = 4;
    const INDEX_TIP = 8;
    const INDEX_PIP = 7;
    const INDEX_MCP = 5;
    const MIDDLE_TIP = 12;
    const MIDDLE_PIP = 11;
    const MIDDLE_MCP = 9;
    const WRIST = 0;

    const isFingerExtended = (tipIdx: number, pipIdx: number, mcpIdx: number) => {
      const tip = landmarks[tipIdx];
      const pip = landmarks[pipIdx];
      const mcp = landmarks[mcpIdx];
      if (!tip || !pip || !mcp) return false;
      const tipToPip = Math.sqrt(Math.pow(tip.x - pip.x, 2) + Math.pow(tip.y - pip.y, 2));
      const pipToMcp = Math.sqrt(Math.pow(pip.x - mcp.x, 2) + Math.pow(pip.y - mcp.y, 2));
      return tipToPip > pipToMcp * 0.8;
    };

    const wrist = landmarks[WRIST];
    const thumbTip = landmarks[THUMB_TIP];
    if (!wrist || !thumbTip) return false;
    
    const pointingUp = thumbTip.y < wrist.y - 0.1;
    const idx = isFingerExtended(INDEX_TIP, INDEX_PIP, INDEX_MCP);
    const mid = isFingerExtended(MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
    
    return pointingUp && !idx && !mid;
  };

  // Thumbs down detection function
  const isThumbsDown = (landmarks: NormalizedLandmark[]) => {
    const THUMB_TIP = 4;
    const INDEX_TIP = 8;
    const INDEX_PIP = 7;
    const INDEX_MCP = 5;
    const MIDDLE_TIP = 12;
    const MIDDLE_PIP = 11;
    const MIDDLE_MCP = 9;
    const WRIST = 0;

    const isFingerExtended = (tipIdx: number, pipIdx: number, mcpIdx: number) => {
      const tip = landmarks[tipIdx];
      const pip = landmarks[pipIdx];
      const mcp = landmarks[mcpIdx];
      if (!tip || !pip || !mcp) return false;
      const tipToPip = Math.sqrt(Math.pow(tip.x - pip.x, 2) + Math.pow(tip.y - pip.y, 2));
      const pipToMcp = Math.sqrt(Math.pow(pip.x - mcp.x, 2) + Math.pow(pip.y - mcp.y, 2));
      return tipToPip > pipToMcp * 0.8;
    };

    const wrist = landmarks[WRIST];
    const thumbTip = landmarks[THUMB_TIP];
    if (!wrist || !thumbTip) return false;
    
    // Check if thumb is pointing DOWN (below wrist)
    const pointingDown = thumbTip.y > wrist.y + 0.1;
    const idx = isFingerExtended(INDEX_TIP, INDEX_PIP, INDEX_MCP);
    const mid = isFingerExtended(MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
    
    return pointingDown && !idx && !mid;
  };

  // Initialize MediaPipe hand tracking
  useEffect(() => {
    let disposed = false;

    const initializeHands = async () => {
      try {
        const hands = await HandTracker.create({
          numHands: 2,
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });
        if (disposed) {
          hands.close();
          return;
        }
        handsRef.current = hands;
        setIsModelReady(true);
      } catch (error) {
        if (!disposed) setCameraError(describeMediaError(error));
      }
    };

    initializeHands();

    return () => {
      disposed = true;
      cameraRef.current?.getTracks().forEach(track => track.stop());
      cameraRef.current = null;
      handsRef.current?.close();
      handsRef.current = null;
    };
  }, []);

  // Update game state ref
  useEffect(() => {
    gameStateRef.current = { gameStarted, gameOver, currentSymbol, currentDefinition };
    waitingForThumbsUpRef.current = waitingForThumbsUp;
    waitingForReplayRef.current = waitingForReplay;
    gestureGracePeriodRef.current = gestureGracePeriod;
  }, [gameStarted, gameOver, currentSymbol, currentDefinition, waitingForThumbsUp, waitingForReplay, gestureGracePeriod]);


  // Grace period for gesture controls after game over (5 seconds)
  useEffect(() => {
    if (gameOver) {
      setGestureGracePeriod(true);
      gracePeriodTimerRef.current = window.setTimeout(() => {
        setGestureGracePeriod(false);
       
      }, 5000); // 5 seconds

      return () => {
        if (gracePeriodTimerRef.current) {
          clearTimeout(gracePeriodTimerRef.current);
        }
      };
    }
  }, [gameOver]);

  // Auto-return countdown when game is over
  useEffect(() => {
    if (gameOver) {
      setAutoReturnCountdown(30);
      autoReturnTimerRef.current = window.setInterval(() => {
        setAutoReturnCountdown((prev) => {
          if (prev <= 1) {
            if (autoReturnTimerRef.current) {
              clearInterval(autoReturnTimerRef.current);
            }
            navigate('/play');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (autoReturnTimerRef.current) {
          clearInterval(autoReturnTimerRef.current);
        }
      };
    }
  }, [gameOver, navigate]);

  // Start camera when model is ready (but don't start game yet)
  useEffect(() => {
    if (isModelReady && !cameraReady && !gameStarted && !gameOver) {
      const initCamera = async () => {
        try {
          
          
          const stream = await openCamera({ width: 640, height: 480 });
          
          if (!videoRef.current || !handsRef.current) {
            stream.getTracks().forEach(track => track.stop());
            throw new Error("Video element not initialized");
          }
          
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          cameraRef.current = stream;
          handsRef.current.start(videoRef.current, onHandsResults, (error) => {
            setCameraError(describeMediaError(error));
          });
          setCameraReady(true);
          
          console.log("Camera ready - waiting for thumbs up!");
        } catch (error) {
          console.error("Failed to start camera:", error);
          setCameraError(describeMediaError(error));
        }
      };

      initCamera();
    }
  }, [isModelReady, cameraReady, gameStarted, gameOver]);

  // Handle hand detection results
  const onHandsResults = async (results: HandFrame) => {
    if (!canvasRef.current) return;

    const canvasCtx = canvasRef.current.getContext("2d");
    if (!canvasCtx) return;

    // Clear canvas
    canvasCtx.save();
    
    // Flip canvas horizontally for mirror effect
    canvasCtx.translate(canvasRef.current.width, 0);
    canvasCtx.scale(-1, 1);
    
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw video frame
    if (results.image) {
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    const { gameStarted: isGameActive, gameOver: isGameOver, currentSymbol: symbol, currentDefinition: definition } = gameStateRef.current;

    // Draw hand landmarks
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setHandDetected(true);
      currentLandmarksRef.current = results.multiHandLandmarks;
      
      drawHands(
        canvasCtx,
        results.multiHandLandmarks,
        { color: "#00FF00", lineWidth: 2 },
        { color: "#FF0000", lineWidth: 1, radius: 3 }
      );

      // Check for thumbs up gesture if waiting to start game
      if (waitingForThumbsUpRef.current && !isGameActive && !isGameOver) {
        // Need both hands with thumbs up
        if (results.multiHandLandmarks.length === 2) {
          const hand1ThumbsUp = isThumbsUp(results.multiHandLandmarks[0]);
          const hand2ThumbsUp = isThumbsUp(results.multiHandLandmarks[1]);
          
          if (hand1ThumbsUp && hand2ThumbsUp) {
            console.log("Both thumbs up detected! Starting game...");
            waitingForThumbsUpRef.current = false;
            setWaitingForThumbsUp(false);
            
            // Start the game after a short delay
            setTimeout(() => {
              startGame();
            }, 500);
          }
        }
      }

      // Check for thumbs up/down gestures during game over
      // Only allow gestures after grace period (5 seconds)
      if (isGameOver && !isGameActive && !gestureGracePeriodRef.current) {
        console.log("Checking for gesture controls - hands detected:", results.multiHandLandmarks.length);
        // Need both hands with same gesture
        if (results.multiHandLandmarks.length === 2) {
          const hand1ThumbsUp = isThumbsUp(results.multiHandLandmarks[0]);
          const hand2ThumbsUp = isThumbsUp(results.multiHandLandmarks[1]);
          const hand1ThumbsDown = isThumbsDown(results.multiHandLandmarks[0]);
          const hand2ThumbsDown = isThumbsDown(results.multiHandLandmarks[1]);
          
          
          if (hand1ThumbsUp && hand2ThumbsUp) {
            console.log("Both thumbs up detected! Restarting game...");
            // Clear timers
            if (autoReturnTimerRef.current) {
              clearInterval(autoReturnTimerRef.current);
            }
            if (gracePeriodTimerRef.current) {
              clearTimeout(gracePeriodTimerRef.current);
            }
            // Reset game state to waiting for thumbs up
            setGameOver(false);
            setWaitingForReplay(false);
            setWaitingForThumbsUp(true);
            waitingForReplayRef.current = false;
            waitingForThumbsUpRef.current = true;
            setScore(0);
            setSymbolsCompleted(0);
          } else if (hand1ThumbsDown && hand2ThumbsDown) {
            console.log("Both thumbs down detected! Returning to menu...");
            // Clear timers
            if (autoReturnTimerRef.current) {
              clearInterval(autoReturnTimerRef.current);
            }
            if (gracePeriodTimerRef.current) {
              clearTimeout(gracePeriodTimerRef.current);
            }
            // Navigate back to menu
            navigate('/play');
          }
        }
      } else if (isGameOver && gestureGracePeriodRef.current) {
        console.log("Grace period active - gesture controls disabled");
      }

      // Calculate similarity during active game
      if (isGameActive && !isGameOver && symbol && definition && !matchCooldownRef.current) {
        try {
          const landmarksArray = results.multiHandLandmarks.map((hand) => landmarksToArray(hand));
          
          // Use local matching instead of backend request
          const matchResponse = matchGestureLocally(landmarksArray, definition);

          setSimilarity(matchResponse.similarity);

          // Use gesture-specific threshold from response, or default to 0.55
          const threshold = matchResponse.threshold ?? SIMILARITY_THRESHOLD;
          setCurrentThreshold(threshold);

          // Auto-accept if similarity is high enough
          if (matchResponse.similarity >= threshold) {
           
            matchCooldownRef.current = true;
            
            handleSymbolMatch(matchResponse.similarity);
            
            // Reset cooldown
            setTimeout(() => {
              matchCooldownRef.current = false;
            }, 1500);
          }
        } catch (error) {
          console.error("Error matching gesture:", error);
        }
      }
    } else {
      setHandDetected(false);
      currentLandmarksRef.current = null;
      setSimilarity(0);
    }

    canvasCtx.restore();
  };

  // Handle successful match
  const handleSymbolMatch = (matchSimilarity: number) => {
    const points = Math.round(matchSimilarity * 300); // Up to 300 points per match
    
    setScore((prev) => {
      const newScore = prev + points;
     
      playSound();
      return newScore;
    });
    
    setSymbolsCompleted((prev) => {
      const newCount = prev + 1;
      
      return newCount;
    });

    toaster.create({
      title: "Match!",
      description: `+${points} points`,
      type: "success",
    });

    // Load next symbol
    loadNextSymbol();
  };

  // Load a random symbol
  const loadNextSymbol = async () => {
    setIsLoading(true);
    try {
      const response = await getRandomGesture();
      setCurrentSymbol(response.symbol);
      setCurrentDefinition(response.definition);
      setSimilarity(0);
    } catch (error) {
      console.error("Failed to load random gesture:", error);
      toaster.create({
        title: "Error",
        description: "No gestures available. Please record some gestures in Dev Mode first!",
        type: "error",
      });
      endGame();
    } finally {
      setIsLoading(false);
    }
  };

  // Start the game (camera already running)
  const startGame = async () => {
    console.log("Starting game...");

    if (!handsRef.current) {
      toaster.create({
        title: "Error",
        description: "Hand detection model is still loading. Please wait.",
        type: "error",
      });
      return;
    }

    if (!cameraRef.current) {
      toaster.create({
        title: "Error",
        description: "Camera not initialized. Please refresh the page.",
        type: "error",
      });
      return;
    }

    try {
      // Initialize game
      setGameStarted(true);
      setGameOver(false);
      setScore(0);
      setSymbolsCompleted(0);
      setTimeLeft(GAME_DURATION);
      
      // Load first symbol
      await loadNextSymbol();
      
      console.log("Game initialized");

      // Start timer
      gameTimerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    
    } catch (error) {
      console.error("Failed to start game:", error);
      toaster.create({
        title: "Error",
        description: "Failed to start game. Please try again.",
        type: "error",
      });
    }
  };

  // End the game
  const endGame = () => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
    }

    // Don't stop the camera - keep it running for thumbs up detection
    // if (cameraRef.current) {
    //   cameraRef.current.stop();
    // }

    setGameStarted(false);
    setGameOver(true);
  };

  // Submit score
  const handleSubmitScore = async () => {
    if (!user) {
      toaster.create({
        title: "Error",
        description: "You need to be logged in to submit a score.",
        type: "error",
      });
      return;
    }

    try {
      await submitScore({
        score: score,
        symbols: symbolsCompleted,
        gameMode: "single",
        gameType: "finger",
      });

      toaster.create({
        title: "Success!",
        description: "Score submitted successfully!",
        type: "success",
      });
      
      // Transition to waiting for replay
      setWaitingForReplay(true);
    } catch (error) {
      console.error("Failed to submit score:", error);
      toaster.create({
        title: "Error",
        description: "Failed to submit score. Please try again.",
        type: "error",
      });
    }
  };

  // Skip and return to menu
  const handleSkipAndReturn = () => {
    if (autoReturnTimerRef.current) {
      clearInterval(autoReturnTimerRef.current);
    }
    navigate('/play');
  };

  // Manual skip
  const handleSkip = () => {
    if (gameStarted && !gameOver) {
      loadNextSymbol();
    }
  };

  return (
    <Box
      bg={pageBackground}
      minH="100vh"
      py={{ base: 6, md: 8 }}
      px={{ base: 4, md: 8 }}
      color="#f5f7fb"
    >
      <div style={{ position: "absolute", bottom: "1rem", right: "1rem" }}>
          <MusicButton />
        </div>
      <Container maxW="6xl" p={0}>
        <Toaster />
        <VStack gap={6} align="stretch">
          <video ref={videoRef} style={{ display: "none" }} width="640" height="480" playsInline muted />
          
          {/* Title */}

          <VStack gap={3} textAlign="center">
            <Heading size="3xl" fontWeight="extrabold" textShadow={headingGlow}>
              Solo Gesture Arena
            </Heading>
            {waitingForThumbsUp && !cameraReady && !cameraError ? (
              <Text fontSize="lg" color={mutedText}>
                Loading camera...
              </Text>
            ) : waitingForThumbsUp && cameraReady ? (
              <Text fontSize="lg" color={accentPrimary} fontWeight="bold">
                👍 Show BOTH thumbs up to start! 👍
              </Text>
            ) : (
              <Text fontSize="lg" color={mutedText}>
                Complete as many prompts as you can before the timer drains. Camera feed mirrors your moves in real time.
              </Text>
            )}
          </VStack>

          {/* Camera Error */}
          {cameraError && !gameOver && (
            <Box
              maxW="480px"
              mx="auto"
              w="full"
              bg="rgba(255, 120, 120, 0.18)"
              borderRadius="lg"
              border="1px solid rgba(255, 150, 150, 0.4)"
              p={4}
            >
              <Text color={accentWarn} fontSize="sm" textAlign="center">
                ⚠️ {cameraError}
              </Text>
            </Box>
          )}

          {/* Main Game Layout - Always rendered once camera is ready */}
          {cameraReady && (
            <Flex direction={{ base: "column", lg: "row" }} gap={6} align={{ base: "center", lg: "stretch" }} justify="center">
              {/* Sidebar - Only show during active game */}
              {gameStarted && !gameOver && (
                <VStack
                  align="stretch"
                  gap={6}
                  flex={{ base: "none", lg: "0 0 360px" }}
                  order={{ base: 2, lg: 1 }}
                >
                  <Box
                    bg={panelBg}
                    border={`1px solid ${borderColor}`}
                    borderRadius="2xl"
                    px={{ base: 4, md: 6 }}
                    py={{ base: 4, md: 6 }}
                  >
                    <HStack justify="space-between" gap={6} flexWrap="wrap">
                      <VStack align="start" gap={1}>
                        <Text fontSize="sm" color={mutedText}>
                          Time Left
                        </Text>
                        <Heading size="lg" color={timeLeft <= 10 ? accentWarn : accentPrimary}>
                          {timeLeft}s
                        </Heading>
                      </VStack>

                      <VStack align="center" gap={1}>
                        <Text fontSize="sm" color={mutedText}>
                          Score
                        </Text>
                        <Heading size="lg" color={accentGood}>
                          {score}
                        </Heading>
                      </VStack>

                      <VStack align="end" gap={1}>
                        <Text fontSize="sm" color={mutedText}>
                          Symbols
                        </Text>
                        <Heading size="lg" color="#ffe066">
                          {symbolsCompleted}
                        </Heading>
                      </VStack>
                    </HStack>
                  </Box>

                  {currentSymbol && currentDefinition && (
                    <Box
                      bg={panelBg}
                      border={`1px solid ${borderColor}`}
                      borderRadius="2xl"
                      px={{ base: 5, md: 6 }}
                      py={{ base: 6, md: 7 }}
                      textAlign="center"
                      boxShadow="0 24px 40px rgba(10, 15, 35, 0.45)"
                    >
                      <VStack gap={4}>
                        <HStack gap={3} justify="center">
                          <Text fontSize="lg" fontWeight="bold">
                            Match this symbol
                          </Text>
                        </HStack>
                        <Heading size="4xl" textShadow="0 0 18px rgba(255, 255, 255, 0.35)">
                          {currentSymbol}
                        </Heading>
                        {isLoading && (
                          <Text fontSize="sm" color={mutedText}>
                            Loading next prompt...
                          </Text>
                        )}
                        <Button size="sm" variant="surface" colorScheme="purple" onClick={handleSkip}>
                          Skip Symbol
                        </Button>
                      </VStack>
                    </Box>
                  )}

                  <Box
                    bg={softPanelBg}
                    border={`1px solid ${borderColor}`}
                    borderRadius="2xl"
                    px={{ base: 4, md: 6 }}
                    py={{ base: 5, md: 6 }}
                  >
                    <VStack gap={3} align="stretch">
                      <HStack justify="space-between">
                        <Text fontWeight="bold">Match Similarity</Text>
                        <Text
                          fontWeight="bold"
                          color={similarity >= currentThreshold ? accentGood : mutedText}
                        >
                          {Math.round(similarity * 100)}%
                        </Text>
                      </HStack>
                      <Progress.Root value={similarity * 100} size="lg">
                        <Progress.Track bg="rgba(255, 255, 255, 0.12)">
                          <Progress.Range
                            bg={similarity >= currentThreshold ? accentGood : "#7b5eff"}
                          />
                        </Progress.Track>
                      </Progress.Root>
                      {similarity >= currentThreshold && (
                        <Text color={accentGood} fontWeight="bold">
                          ✓ Match! Loading next symbol...
                        </Text>
                      )}
                    </VStack>
                  </Box>
                </VStack>
              )}

              {/* Empty spacer when waiting - matches sidebar width */}
              {(!gameStarted || gameOver) && (
                <Box
                  flex={{ base: "none", lg: "0 0 360px" }}
                  order={{ base: 2, lg: 1 }}
                  display={{ base: "none", lg: "block" }}
                />
              )}

              {/* Camera view - Always in the same position */}
              {/* Width follows the viewport height so the whole 4:3 feed
                  stays on screen (title and padding take ~200px). */}
              <Box
                position="relative"
                flex="0 1 auto"
                w="min(100%, calc(max(100vh - 200px, 300px) * 4 / 3))"
                minW={0}
                aspectRatio="4 / 3"
                alignSelf="flex-start"
                borderRadius="2xl"
                bg="linear-gradient(135deg, rgba(90, 80, 180, 0.35), rgba(25, 220, 250, 0.18))"
                border={`1px solid ${borderColor}`}
                boxShadow="0 32px 64px rgba(8, 12, 28, 0.65)"
                overflow="hidden"
                order={{ base: 1, lg: 2 }}
              >
                <canvas
                  ref={canvasRef}
                  width="640"
                  height="480"
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                  }}
                />
                <Box position="absolute" top={4} right={4}>
                  <Badge
                    variant="subtle"
                    colorScheme={handDetected ? "green" : "red"}
                    px={4}
                    py={1}
                    borderRadius="full"
                  >
                    {handDetected ? "✓ Hand Detected" : "✗ No Hand"}
                  </Badge>
                </Box>
                
                {/* Thumbs up overlay - only show when waiting */}
                {waitingForThumbsUp && (
                  <Box 
                    position="absolute" 
                    top="50%" 
                    left="50%" 
                    transform="translate(-50%, -50%)"
                    bg="rgba(0, 0, 0, 0.8)"
                    px={8}
                    py={6}
                    borderRadius="xl"
                    textAlign="center"
                  >
                    <VStack gap={3}>
                      <Text fontSize="3xl" fontWeight="bold" color="white">
                        👍👍
                      </Text>
                      <Text fontSize="xl" fontWeight="bold" color={accentPrimary}>
                        Show both thumbs up to start!
                      </Text>
                    </VStack>
                  </Box>
                )}
              </Box>
            </Flex>
          )}

          {/* Victory Screen Overlay - Fixed position to center on page */}
          {gameOver && (
            <Box 
              position="fixed" 
              top="0" 
              left="0" 
              right="0" 
              bottom="0"
              bg="rgba(0, 0, 0, 0.85)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              p={4}
              zIndex={9999}
            >
              <Box
                bg={panelBg}
                border={`1px solid ${borderColor}`}
                borderRadius="2xl"
                maxW="480px"
                w="full"
                px={{ base: 6, md: 10 }}
                py={{ base: 8, md: 10 }}
                textAlign="center"
                boxShadow="0 28px 48px rgba(10, 15, 35, 0.55)"
                maxH="90vh"
                overflowY="auto"
              >
                <VStack gap={5}>
                  <Heading size="2xl" color={accentPrimary}>
                    Victory! 
                  </Heading>
                  
                  {/* Score with bonus coins */}
                  <VStack gap={2}>
                    <HStack justify="center" gap={2}>
                      <Text fontSize="3xl" fontWeight="bold">
                        Score: {score}
                      </Text>
                      {/* <Text fontSize="2xl" color="yellow.400">
                        +{symbolsCompleted * 10} 🪙
                      </Text> */}
                    </HStack>
                    <Text fontSize="xl" color={mutedText}>
                      Symbols Completed: {symbolsCompleted}
                    </Text>
                  </VStack>

                  {/* Auto-return countdown with progress bar */}
                  <VStack gap={2} w="full">
                    <Text fontSize="sm" color={mutedText}>
                      Auto-returning in {autoReturnCountdown}s
                    </Text>
                    <Progress.Root
                      value={(autoReturnCountdown / 30) * 100}
                      w="full"
                      colorScheme="blue"
                      h="8px"
                      borderRadius="full"
                    >
                      <Progress.Track>
                        <Progress.Range />
                      </Progress.Track>
                    </Progress.Root>
                  </VStack>
                  
                  {/* Username input and buttons - only show if not waiting for replay */}
                  {!waitingForReplay && (
                    <VStack gap={3} w="full">
                      <Text fontSize="md" fontWeight="semibold" color={mutedText}>
                        {user ? `Submitting as ${user.username}` : "Log in to submit your score"}
                      </Text>
                      
                      <HStack gap={3} w="full">
                        <Button colorScheme="green" size="lg" onClick={handleSubmitScore} flex="1" disabled={!user}>
                          Submit to Leaderboard
                        </Button>
                        <Button colorScheme="red" size="lg" onClick={handleSkipAndReturn} flex="1">
                          Skip & Return
                        </Button>
                      </HStack>
                    </VStack>
                  )}

                  {/* Show message when waiting for replay */}
                  {waitingForReplay && !gestureGracePeriod && (
                     <HStack gap={3} w="full">
                        <Button colorScheme="red" size="lg" onClick={handleSkipAndReturn} flex="1">
                          Skip & Return
                        </Button>
                      </HStack>
                  )}
                  {/* Gesture instructions */}
                  <VStack gap={2}>
                    {gestureGracePeriod ? (
                      <Text fontSize="md" color="orange.400" fontWeight="bold">
                        ⏳ Gesture controls available in a moment...
                      </Text>
                    ) : (
                      <>
                        <Text fontSize="md" color={mutedText} fontWeight="medium">
                          👍👍 Both thumbs up to play again
                        </Text>
                        <Text fontSize="md" color={mutedText} fontWeight="medium">
                          👎👎 Both thumbs down to return to menu
                        </Text>
                      </>
                    )}
                  </VStack>

                </VStack>
              </Box>
            </Box>
          )}

          {/* Back button when waiting */}
          {waitingForThumbsUp && !gameOver && (
            <Button
              size="lg"
              variant="outline"
              colorScheme="purple"
              onClick={() => navigate('/play')}
              maxW="480px"
              mx="auto"
              w="full"
            >
              ← Back to Menu
            </Button>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default PlayMode;
