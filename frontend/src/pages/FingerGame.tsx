import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  HStack,
  Text,
  Progress,
  Card,
  Input,
  Badge,
} from "@chakra-ui/react";
import { Hands, type Results } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { getRandomGesture, matchGesture, type GestureDefinition } from "../gestureApi";
import { landmarksToArray } from "../advancedGestureRecognition";
import { submitScore } from "../leaderboardApi";
import { Toaster, toaster } from "@/components/ui/toaster";
import { useRewardSound } from "../context/rewardSoundContext";

const GAME_DURATION = 60; // 60 seconds
const SIMILARITY_THRESHOLD = 0.55; // 55% similarity to accept

const PlayMode: React.FC = () => {
  // Game state
  const { playSound } = useRewardSound();
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState("");
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
    
    if (!playerName.trim()) {
      toaster.create({
        title: "Error",
        description: "Please enter your name!",
        type: "error",
      });
      return;
    }

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
    try {
      await submitScore({
        name: playerName,
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
        window.location.href = "/game-1";
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
    <Container maxW="container.xl" py={8}>
      <Toaster />
      <VStack gap={6} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="2xl" mb={2}>
            🎮 Play Mode - Gesture Game
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Match the gestures you've recorded!
          </Text>
        </Box>

        {/* Game Setup */}
        {!gameStarted && !gameOver && (
          <Card.Root p={8} maxW="md" mx="auto">
            <VStack gap={4}>
              <Heading size="lg">Ready to Play?</Heading>
              <Text textAlign="center">
                Recreate the gestures shown on screen.
                Match as many as you can in {GAME_DURATION} seconds!
              </Text>
              
              {cameraError && (
                <Box p={4} bg="red.50" borderRadius="md" w="full">
                  <Text color="red.700" fontSize="sm">
                    ⚠️ {cameraError}
                  </Text>
                </Box>
              )}
              
              {!isModelReady && (
                <Box p={4} bg="blue.50" borderRadius="md" w="full">
                  <Text color="blue.700" fontSize="sm">
                    ⏳ Loading hand detection model...
                  </Text>
                </Box>
              )}
              
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                size="lg"
              />
              <Button 
                colorScheme="blue" 
                size="lg" 
                onClick={startGame} 
                w="full"
                disabled={!isModelReady}
              >
                {isModelReady ? "Start Game" : "Loading..."}
              </Button>
            </VStack>
          </Card.Root>
        )}

        {/* Camera Feed */}
        <Box position="relative" mx="auto" display={gameStarted && !gameOver ? "block" : "none"}>
          <video
            ref={videoRef}
            style={{ display: "none" }}
            width="640"
            height="480"
          />
          <canvas
            ref={canvasRef}
            width="640"
            height="480"
            style={{
              border: "2px solid #3182CE",
              borderRadius: "8px",
              maxWidth: "100%",
              height: "auto",
            }}
          />
          
          <Box position="absolute" top={4} right={4}>
            <Badge colorScheme={handDetected ? "green" : "red"}>
              {handDetected ? "✓ Hand Detected" : "✗ No Hand"}
            </Badge>
          </Box>
        </Box>

        {/* Game Active */}
        {gameStarted && !gameOver && (
          <>
            {/* Stats Bar */}
            <HStack justify="space-between" px={4}>
              <VStack align="start" gap={1}>
                <Text fontSize="sm" color="gray.600">
                  Time Left
                </Text>
                <Heading size="lg" color={timeLeft <= 10 ? "red.500" : "blue.600"}>
                  {timeLeft}s
                </Heading>
              </VStack>

              <VStack align="center" gap={1}>
                <Text fontSize="sm" color="gray.600">
                  Score
                </Text>
                <Heading size="lg" color="green.600">
                  {score}
                </Heading>
              </VStack>

              <VStack align="end" gap={1}>
                <Text fontSize="sm" color="gray.600">
                  Symbols
                </Text>
                <Heading size="lg" color="purple.600">
                  {symbolsCompleted}
                </Heading>
              </VStack>
            </HStack>

            {/* Current Symbol */}
            {currentSymbol && currentDefinition && (
              <Card.Root p={6} bg="blue.50">
                <VStack gap={3}>
                  <HStack>
                    <Text fontSize="lg" fontWeight="bold">
                      Match this symbol:
                    </Text>
                    <Badge colorScheme="blue">
                      {currentDefinition.variants.length} variant{currentDefinition.variants.length !== 1 ? 's' : ''}
                    </Badge>
                  </HStack>
                  <Heading size="6xl">{currentSymbol}</Heading>
                  {isLoading && (
                    <Text fontSize="sm" color="gray.600">Loading...</Text>
                  )}
                  <Button size="sm" onClick={handleSkip} colorScheme="gray">
                    Skip Symbol
                  </Button>
                </VStack>
              </Card.Root>
            )}

            {/* Similarity Progress */}
            <Card.Root p={4}>
              <VStack gap={2}>
                <HStack justify="space-between" w="full">
                  <Text fontWeight="bold">Match Similarity</Text>
                  <Text fontWeight="bold" color={similarity >= SIMILARITY_THRESHOLD ? "green.600" : "gray.600"}>
                    {Math.round(similarity * 100)}%
                  </Text>
                </HStack>
                <Progress.Root
                  value={similarity * 100}
                  size="lg"
                  colorScheme={similarity >= SIMILARITY_THRESHOLD ? "green" : "blue"}
                >
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
                {similarity >= SIMILARITY_THRESHOLD && (
                  <Text color="green.600" fontWeight="bold">
                    ✓ Match! Loading next symbol...
                  </Text>
                )}
              </VStack>
            </Card.Root>
          </>
        )}

        {/* Game Over */}
        {gameOver && (
          <Card.Root p={8} maxW="md" mx="auto">
            <VStack gap={4}>
              <Heading size="2xl" color="blue.600">
                Game Over!
              </Heading>
              <VStack gap={2}>
                <Text fontSize="3xl" fontWeight="bold">
                  Final Score: {score}
                </Text>
                <Text fontSize="xl">Symbols Completed: {symbolsCompleted}</Text>
                <Text fontSize="lg" color="gray.600">
                  Player: {playerName}
                </Text>
              </VStack>
              <Button colorScheme="green" size="lg" onClick={handleSubmitScore} w="full">
                Submit to Leaderboard
              </Button>
              <Button colorScheme="blue" size="lg" onClick={() => window.location.reload()} w="full">
                Play Again
              </Button>
              <Button size="lg" onClick={() => (window.location.href = "/")} w="full">
                Back to Menu
              </Button>
            </VStack>
          </Card.Root>
        )}

        {/* Back button */}
        {!gameStarted && !gameOver && (
          <Button onClick={() => (window.location.href = "/")} size="lg">
            ← Back to Menu
          </Button>
        )}
      </VStack>
    </Container>
  );
};

export default PlayMode;
