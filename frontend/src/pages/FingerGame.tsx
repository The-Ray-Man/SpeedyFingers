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
import { Hands, type Results } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { getRandomGesture, matchGesture, type GestureDefinition } from "../gestureApi";
import { landmarksToArray } from "../advancedGestureRecognition";
import { submitScore } from "../leaderboardApi";
import { Toaster, toaster } from "@/components/ui/toaster";
import { useUser } from "@/context/UserContext";
import { useRewardSound } from "../context/rewardSoundContext";

const GAME_DURATION = 60; // 60 seconds
const SIMILARITY_THRESHOLD = 0.55; // 55% similarity to accept

const PlayMode: React.FC = () => {
  // Get user from context
  const { user } = useUser();
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
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [symbolsCompleted, setSymbolsCompleted] = useState(0);
  const [similarity, setSimilarity] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const gameTimerRef = useRef<number | null>(null);
  const gameStateRef = useRef({ 
    gameStarted: false, 
    gameOver: false, 
    currentSymbol: null as string | null 
  });
  const matchCooldownRef = useRef<boolean>(false);
  const currentLandmarksRef = useRef<any>(null);

  // Initialize MediaPipe Hands
  useEffect(() => {
    const initializeHands = async () => {
      try {
        console.log("Initializing MediaPipe Hands...");
        
        const hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(onHandsResults);
        
        handsRef.current = hands;
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setIsModelReady(true);
        console.log("MediaPipe Hands initialized successfully");
      } catch (error) {
        console.error("Failed to initialize MediaPipe Hands:", error);
        setCameraError("Failed to load hand detection model. Please refresh the page.");
      }
    };

    initializeHands();

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, []);

  // Auto-start game when model is ready
  useEffect(() => {
    if (isModelReady && !gameStarted && !gameOver) {
      // Small delay to ensure everything is initialized
      const timer = setTimeout(() => {
        startGame();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModelReady, gameStarted, gameOver]);

  // Update game state ref
  useEffect(() => {
    gameStateRef.current = { gameStarted, gameOver, currentSymbol };
  }, [gameStarted, gameOver, currentSymbol]);

  // Handle hand detection results
  const onHandsResults = async (results: Results) => {
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

    const { gameStarted: isGameActive, gameOver: isGameOver, currentSymbol: symbol } = gameStateRef.current;

    // Draw hand landmarks
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setHandDetected(true);
      currentLandmarksRef.current = results.multiHandLandmarks;
      
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 2,
        });
        drawLandmarks(canvasCtx, landmarks, {
          color: "#FF0000",
          lineWidth: 1,
          radius: 3,
        });
      }

      // Calculate similarity during active game
      if (isGameActive && !isGameOver && symbol && !matchCooldownRef.current) {
        try {
          const landmarksArray = results.multiHandLandmarks.map((hand) => landmarksToArray(hand));
          
          const matchResponse = await matchGesture({
            symbol: symbol,
            landmarks: landmarksArray,
          });

          setSimilarity(matchResponse.similarity);

          // Auto-accept if similarity is high enough
          if (matchResponse.similarity >= SIMILARITY_THRESHOLD) {
            console.log(`Match detected! Similarity: ${(matchResponse.similarity * 100).toFixed(1)}%`);
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
      console.log(`Score updated: ${prev} -> ${newScore}`);
      playSound();
      return newScore;
    });
    
    setSymbolsCompleted((prev) => {
      const newCount = prev + 1;
      console.log(`Symbols completed: ${prev} -> ${newCount}`);
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

  // Start the game
  const startGame = async () => {
    console.log("Start game clicked");

    if (!handsRef.current) {
      toaster.create({
        title: "Error",
        description: "Hand detection model is still loading. Please wait.",
        type: "error",
      });
      return;
    }

    // Start camera
    try {
      console.log("Requesting camera access...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480 
        } 
      });
      
      console.log("Camera access granted");
      
      if (!videoRef.current) {
        throw new Error("Video element not initialized");
      }
      
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      
      console.log("Video playing");

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            try {
              await handsRef.current.send({ image: videoRef.current });
            } catch (err) {
              console.error("Error sending frame to hands:", err);
            }
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;
      
      console.log("Camera started successfully");

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
      
      console.log("Timer started");
    } catch (error) {
      console.error("Failed to start camera:", error);
      
      let errorMessage = "Failed to access camera. ";
      
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage += "Please grant camera permissions and try again.";
        } else if (error.name === "NotFoundError") {
          errorMessage += "No camera found on this device.";
        } else if (error.name === "NotReadableError") {
          errorMessage += "Camera is already in use by another application.";
        } else {
          errorMessage += error.message;
        }
      }
      
      toaster.create({
        title: "Camera Error",
        description: errorMessage,
        type: "error",
      });
      setCameraError(errorMessage);
    }
  };

  // End the game
  const endGame = () => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
    }

    if (cameraRef.current) {
      cameraRef.current.stop();
    }

    setGameStarted(false);
    setGameOver(true);
  };

  // Submit score
  const handleSubmitScore = async () => {
    if (!user) {
      toaster.create({
        title: "Error",
        description: "User not found. Please set your username.",
        type: "error",
      });
      return;
    }

    try {
      await submitScore({
        name: user.username,
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
      
      setTimeout(() => {
        navigate("/game-1", { replace: true });
      }, 2000);
    } catch (error) {
      console.error("Failed to submit score:", error);
      toaster.create({
        title: "Error",
        description: "Failed to submit score. Please try again.",
        type: "error",
      });
    }
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
      py={{ base: 10, md: 16 }}
      px={{ base: 4, md: 8 }}
      color="#f5f7fb"
    >
      <Container maxW="6xl" p={0}>
        <Toaster />
        <VStack gap={10} align="stretch">
          <video ref={videoRef} style={{ display: "none" }} width="640" height="480" playsInline muted />
          <VStack gap={3} textAlign="center">
            <Heading size="3xl" fontWeight="extrabold" textShadow={headingGlow}>
              Solo Gesture Arena
            </Heading>
            <Text fontSize="lg" color={mutedText}>
              Complete as many prompts as you can before the timer drains. Camera feed mirrors your moves in real time.
            </Text>
          </VStack>

          {!gameStarted && !gameOver && (
            <Box
              bg={panelBg}
              border={`1px solid ${borderColor}`}
              borderRadius="2xl"
              maxW="480px"
              mx="auto"
              px={8}
              py={10}
              boxShadow="0 20px 40px rgba(10, 15, 35, 0.6)"
            >
              <VStack gap={4}>
                {user && (
                  <Text fontSize="lg" fontWeight="bold" color="#cfe5ff">
                    Playing as <Text as="span" color="#ffffff">{user.username}</Text>
                  </Text>
                )}

                {cameraError && (
                  <Box
                    w="full"
                    bg="rgba(255, 120, 120, 0.18)"
                    borderRadius="lg"
                    border="1px solid rgba(255, 150, 150, 0.4)"
                    p={4}
                  >
                    <Text color={accentWarn} fontSize="sm">
                      ⚠️ {cameraError}
                    </Text>
                  </Box>
                )}

                {!isModelReady && (
                  <Box
                    w="full"
                    bg="rgba(120, 180, 255, 0.14)"
                    borderRadius="lg"
                    border="1px solid rgba(140, 200, 255, 0.35)"
                    p={4}
                  >
                    <VStack gap={2}>
                      <Text color={accentPrimary} fontSize="lg" fontWeight="bold">
                        ⏳ Loading hand tracker...
                      </Text>
                      <Text color={mutedText} fontSize="sm">
                        Sit tight—your match will start the moment tracking is ready.
                      </Text>
                    </VStack>
                  </Box>
                )}
              </VStack>
            </Box>
          )}

          {gameStarted && !gameOver && (
            <Flex direction={{ base: "column", lg: "row" }} gap={6} align="stretch">
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
                      <Button size="sm" variant="outline" colorScheme="purple" onClick={handleSkip}>
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
                        color={similarity >= SIMILARITY_THRESHOLD ? accentGood : mutedText}
                      >
                        {Math.round(similarity * 100)}%
                      </Text>
                    </HStack>
                    <Progress.Root value={similarity * 100} size="lg">
                      <Progress.Track bg="rgba(255, 255, 255, 0.12)">
                        <Progress.Range
                          bg={similarity >= SIMILARITY_THRESHOLD ? accentGood : "#7b5eff"}
                        />
                      </Progress.Track>
                    </Progress.Root>
                    {similarity >= SIMILARITY_THRESHOLD && (
                      <Text color={accentGood} fontWeight="bold">
                        ✓ Match! Loading next symbol...
                      </Text>
                    )}
                  </VStack>
                </Box>
              </VStack>

              <Box
                position="relative"
                flex="1"
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
              </Box>
            </Flex>
          )}
          {gameOver && (
            <Box
              bg={panelBg}
              border={`1px solid ${borderColor}`}
              borderRadius="2xl"
              maxW="480px"
              mx="auto"
              px={{ base: 6, md: 10 }}
              py={{ base: 8, md: 10 }}
              textAlign="center"
              boxShadow="0 28px 48px rgba(10, 15, 35, 0.55)"
            >
              <VStack gap={5}>
                <Heading size="2xl" color={accentPrimary}>
                  Time&apos;s Up!
                </Heading>
                <VStack gap={2}>
                  <Text fontSize="3xl" fontWeight="bold">
                    Score: {score}
                  </Text>
                  <Text fontSize="xl" color={mutedText}>
                    Symbols Completed: {symbolsCompleted}
                  </Text>
                  {user && (
                    <Text fontSize="lg" color={mutedText}>
                      Player: {user.username}
                    </Text>
                  )}
                </VStack>
                <VStack gap={3} w="full">
                  <Button colorScheme="green" size="lg" onClick={handleSubmitScore} w="full">
                    Submit to Leaderboard
                  </Button>
                  <Button colorScheme="purple" size="lg" onClick={() => window.location.reload()} w="full">
                    Play Again
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    colorScheme="purple"
                    onClick={() => navigate("/play")}
                    w="full"
                  >
                    Back to Menu
                  </Button>
                </VStack>
              </VStack>
            </Box>
          )}

          {!gameStarted && !gameOver && (
            <Button
              onClick={() => navigate("/play")}
              size="lg"
              variant="outline"
              colorScheme="purple"
              alignSelf="center"
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
