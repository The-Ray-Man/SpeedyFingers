import React, { useEffect, useRef, useState } from "react";
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
import { getRandomSymbol, calculatePoints, type GameSymbol } from "../gameSymbols";
import { submitScore } from "../leaderboardApi";
import { calculateAdvancedGestureSimilarity } from "../advancedGestureRecognition";

const GAME_DURATION = 60; // 60 seconds
const SIMILARITY_THRESHOLD = 0.6; // 60% similarity to accept

const FingerGame: React.FC = () => {
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [currentSymbol, setCurrentSymbol] = useState<GameSymbol | null>(null);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [symbolsCompleted, setSymbolsCompleted] = useState(0);
  const [similarity, setSimilarity] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const gameTimerRef = useRef<number | null>(null);
  const gameStateRef = useRef({ gameStarted: false, gameOver: false, currentSymbol: null as GameSymbol | null });
  const matchCooldownRef = useRef<boolean>(false); // Prevent multiple rapid matches

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
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(onHandsResults);
        
        handsRef.current = hands;
        
        // Wait a moment to ensure the model is fully loaded
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

  // Update game state ref whenever state changes
  useEffect(() => {
    gameStateRef.current = { gameStarted, gameOver, currentSymbol };
  }, [gameStarted, gameOver, currentSymbol]);

  // Handle hand detection results
  const onHandsResults = (results: Results) => {
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

    // Get current game state from ref (to avoid stale closure)
    const { gameStarted: isGameActive, gameOver: isGameOver, currentSymbol: symbol } = gameStateRef.current;

    // Draw hand landmarks
    if (results.multiHandLandmarks) {
      setHandDetected(true);
      
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

      // Calculate similarity using advanced gesture recognition
      if (symbol) {
        const calculatedSimilarity = calculateAdvancedGestureSimilarity(
          results.multiHandLandmarks,
          symbol.display
        );
        setSimilarity(calculatedSimilarity);

        // Auto-accept if similarity is high enough (with cooldown to prevent rapid matches)
        if (isGameActive && !isGameOver && calculatedSimilarity >= SIMILARITY_THRESHOLD && !matchCooldownRef.current) {
          console.log(`Match detected! Similarity: ${(calculatedSimilarity * 100).toFixed(1)}% for symbol: ${symbol.display}`);
          matchCooldownRef.current = true;
          
          // Call handleSymbolMatch with the current symbol
          handleSymbolMatch(calculatedSimilarity, symbol);
          
          // Reset cooldown after 1.5 seconds
          setTimeout(() => {
            matchCooldownRef.current = false;
          }, 1500);
        }
      }
    } else {
      setHandDetected(false);
      setSimilarity(0);
    }

    canvasCtx.restore();
  };

  // Handle when player successfully matches a symbol
  const handleSymbolMatch = (matchSimilarity: number, matchedSymbol: GameSymbol) => {
    console.log(`Symbol matched! ${matchedSymbol.display} - Similarity: ${(matchSimilarity * 100).toFixed(1)}%, Points: ${calculatePoints(matchSimilarity, matchedSymbol.difficulty)}`);
    
    const points = calculatePoints(matchSimilarity, matchedSymbol.difficulty);
    
    setScore((prev) => {
      const newScore = prev + points;
      console.log(`Score updated: ${prev} -> ${newScore}`);
      return newScore;
    });
    
    setSymbolsCompleted((prev) => {
      const newCount = prev + 1;
      console.log(`Symbols completed: ${prev} -> ${newCount}`);
      return newCount;
    });

    // Load next symbol
    const nextSymbol = getRandomSymbol();
    console.log(`Loading next symbol: ${nextSymbol.display}`);
    setCurrentSymbol(nextSymbol);
    setSimilarity(0);
  };

  // Start the game
  const startGame = async () => {
    console.log("Start game clicked");
    
    if (!playerName.trim()) {
      alert("Please enter your name!");
      return;
    }

    if (!handsRef.current) {
      alert("Hand detection model is still loading. Please wait a moment and try again.");
      return;
    }

    // Start camera
    try {
      console.log("Requesting camera access...");
      
      // Request camera permissions first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480 
        } 
      });
      
      console.log("Camera access granted");
      
      // Wait for video element to be ready
      if (!videoRef.current) {
        console.error("Video element not found!");
        throw new Error("Video element not initialized");
      }
      
      // Set up video element
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      
      console.log("Video playing");

      // Initialize Camera utility
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
      const firstSymbol = getRandomSymbol();
      setCurrentSymbol(firstSymbol);
      
      console.log("Game initialized with symbol:", firstSymbol);

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
      
      alert(errorMessage);
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

  // Submit score to leaderboard
  const handleSubmitScore = async () => {
    try {
      await submitScore({
        name: playerName,
        score: score,
        symbols: symbolsCompleted,
        gameMode: "single",
      });

      alert("Score submitted successfully! Check the leaderboard on the home page.");
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to submit score:", error);
      alert("Failed to submit score. Please try again.");
    }
  };

  // Manual skip button
  const handleSkip = () => {
    if (gameStarted && !gameOver) {
      setCurrentSymbol(getRandomSymbol());
      setSimilarity(0);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="2xl" mb={2}>
            Single Player Mode
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Match LaTeX symbols with your hand gestures!
          </Text>
        </Box>

        {/* Game Setup - Before game starts */}
        {!gameStarted && !gameOver && (
          <Card.Root p={8} maxW="md" mx="auto">
            <VStack gap={4}>
              <Heading size="lg">Ready to Play?</Heading>
              <Text textAlign="center">
                Use your hands to recreate the LaTeX symbols shown on screen.
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

        {/* Hidden video and canvas elements - always rendered so refs exist */}
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
          
          {/* Hand Detection Indicator */}
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
            {currentSymbol && (
              <Card.Root p={6} bg="blue.50">
                <VStack gap={3}>
                  <HStack>
                    <Text fontSize="lg" fontWeight="bold">
                      Current Symbol:
                    </Text>
                    <Badge colorScheme={
                      currentSymbol.difficulty === "easy" ? "green" :
                      currentSymbol.difficulty === "medium" ? "yellow" : "red"
                    }>
                      {currentSymbol.difficulty.toUpperCase()}
                    </Badge>
                  </HStack>
                  <Heading size="4xl">{currentSymbol.display}</Heading>
                  <Text fontSize="md" color="gray.700">
                    {currentSymbol.description}
                  </Text>
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
                Back to Home
              </Button>
            </VStack>
          </Card.Root>
        )}
      </VStack>
    </Container>
  );
};

export default FingerGame;