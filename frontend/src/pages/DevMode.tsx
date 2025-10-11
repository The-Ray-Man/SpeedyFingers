import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  HStack,
  Text,
  Input,
  Card,
  Badge,
  Textarea,
  Table,
  Dialog,
} from "@chakra-ui/react";
import { Hands, type Results } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { saveGesture, getAllGestures, getGestureBySymbol, deleteGestureVariant, type GestureSummary, type GestureDefinition } from "../gestureApi";
import { landmarksToArray, getHandPoseDebugInfo } from "../advancedGestureRecognition";
import { Toaster, toaster } from "@/components/ui/toaster";

const DevMode: React.FC = () => {
  // UI state
  const [symbol, setSymbol] = useState("");
  const [metadata, setMetadata] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");
  const [savedGestures, setSavedGestures] = useState<GestureSummary[]>([]);
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedGestureDetail, setSelectedGestureDetail] = useState<GestureDefinition | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
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
        toaster.create({
          title: "Error",
          description: "Failed to load hand detection model. Please refresh the page.",
          type: "error",
        });
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

  // Load saved gestures
  useEffect(() => {
    loadSavedGestures();
  }, []);

  const loadSavedGestures = async () => {
    try {
      const response = await getAllGestures();
      setSavedGestures(response.symbols);
    } catch (error) {
      console.error("Failed to load gestures:", error);
    }
  };

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

        // Update debug info
        const info = getHandPoseDebugInfo(landmarks);
        setDebugInfo(info);
      }
    } else {
      setHandDetected(false);
      currentLandmarksRef.current = null;
      setDebugInfo("No hand detected");
    }

    canvasCtx.restore();
  };

  // Start camera
  const startCamera = async () => {
    if (!handsRef.current) {
      toaster.create({
        title: "Error",
        description: "Hand detection model is still loading. Please wait a moment.",
        type: "error",
      });
      return;
    }

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
      setCameraActive(true);
      
      console.log("Camera started successfully");
      
      toaster.create({
        title: "Camera Started",
        description: "Camera is now active. Position your hand in view.",
        type: "success",
      });
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
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      setCameraActive(false);
      
      toaster.create({
        title: "Camera Stopped",
        description: "Camera has been turned off.",
        type: "info",
      });
    }
  };

  // Start recording gesture
  const startRecording = () => {
    if (!symbol.trim()) {
      toaster.create({
        title: "Error",
        description: "Please enter a symbol first!",
        type: "error",
      });
      return;
    }

    if (!handDetected) {
      toaster.create({
        title: "Error",
        description: "No hand detected! Please show your hand to the camera.",
        type: "error",
      });
      return;
    }

    setIsRecording(true);
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          captureGesture();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Capture the current gesture
  const captureGesture = async () => {
    if (!currentLandmarksRef.current) {
      toaster.create({
        title: "Error",
        description: "No hand landmarks available to capture!",
        type: "error",
      });
      setIsRecording(false);
      return;
    }

    try {
      // Convert landmarks to array format
      const landmarksArray = currentLandmarksRef.current.map((hand: any) => 
        landmarksToArray(hand)
      );

      const submission = {
        symbol: symbol.trim(),
        handCount: landmarksArray.length,
        landmarks: landmarksArray,
        metadata: metadata.trim() ? { notes: metadata.trim() } : undefined,
      };

      const response = await saveGesture(submission);

      toaster.create({
        title: "Success!",
        description: `Gesture saved for symbol "${response.symbol}". Total variants: ${response.totalVariants}`,
        type: "success",
      });

      // Clear metadata but keep symbol for multiple recordings
      setMetadata("");
    } catch (error) {
      console.error("Failed to save gesture:", error);
      toaster.create({
        title: "Error",
        description: "Failed to save gesture. Please try again.",
        type: "error",
      });
    } finally {
      setIsRecording(false);
      // Reload saved gestures after successful or failed save
      await loadSavedGestures();
    }
  };

  // Open edit dialog for a symbol
  const handleEditSymbol = async (symbolToEdit: string) => {
    try {
      const gestureDetail = await getGestureBySymbol(symbolToEdit);
      setSelectedSymbol(symbolToEdit);
      setSelectedGestureDetail(gestureDetail);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Failed to load gesture details:", error);
      toaster.create({
        title: "Error",
        description: "Failed to load gesture details.",
        type: "error",
      });
    }
  };

  // Delete a specific variant
  const handleDeleteVariant = async (variantId: string) => {
    if (!selectedSymbol) return;

    if (!confirm("Are you sure you want to delete this variant?")) {
      return;
    }

    try {
      await deleteGestureVariant(selectedSymbol, variantId);
      
      toaster.create({
        title: "Success",
        description: "Variant deleted successfully!",
        type: "success",
      });

      // Reload the gesture details
      const updatedGesture = await getGestureBySymbol(selectedSymbol);
      setSelectedGestureDetail(updatedGesture);
      
      // Reload saved gestures list
      await loadSavedGestures();
    } catch (error: any) {
      // If symbol was completely deleted (no variants left), close dialog
      if (error.message.includes("404")) {
        setIsDialogOpen(false);
        setSelectedSymbol(null);
        setSelectedGestureDetail(null);
        await loadSavedGestures();
        
        toaster.create({
          title: "Symbol Removed",
          description: "All variants deleted. Symbol removed from library.",
          type: "info",
        });
      } else {
        console.error("Failed to delete variant:", error);
        toaster.create({
          title: "Error",
          description: "Failed to delete variant.",
          type: "error",
        });
      }
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Toaster />
      <VStack gap={6} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="2xl" mb={2}>
            🛠️ Dev Mode - Gesture Recording
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Record and label new hand gestures for your symbols
          </Text>
        </Box>

        {/* Main content grid */}
        <HStack gap={6} align="start">
          {/* Left: Camera and recording */}
          <VStack gap={4} flex={1}>
            <Card.Root p={4} w="full">
              <VStack gap={4}>
                <Heading size="md">Camera Feed</Heading>
                
                {!cameraActive ? (
                  <Button 
                    colorScheme="blue" 
                    onClick={startCamera}
                    disabled={!isModelReady}
                    size="lg"
                  >
                    {isModelReady ? "Start Camera" : "Loading Model..."}
                  </Button>
                ) : (
                  <Button 
                    colorScheme="red" 
                    onClick={stopCamera}
                    size="lg"
                  >
                    Stop Camera
                  </Button>
                )}

                {/* Video and Canvas */}
                <Box position="relative">
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
                      display: cameraActive ? "block" : "none",
                    }}
                  />
                  
                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <Box
                      position="absolute"
                      top="50%"
                      left="50%"
                      transform="translate(-50%, -50%)"
                    >
                      <Heading size="6xl" color="red.500">
                        {countdown}
                      </Heading>
                    </Box>
                  )}

                  {/* Hand detection indicator */}
                  {cameraActive && (
                    <Box position="absolute" top={4} right={4}>
                      <Badge colorScheme={handDetected ? "green" : "red"}>
                        {handDetected ? "✓ Hand Detected" : "✗ No Hand"}
                      </Badge>
                    </Box>
                  )}
                </Box>

                {/* Debug info */}
                {cameraActive && (
                  <Box w="full" p={3} bg="gray.50" borderRadius="md" fontSize="sm">
                    <Text fontWeight="bold" mb={1}>Debug Info:</Text>
                    <Text whiteSpace="pre-line" fontFamily="monospace">
                      {debugInfo}
                    </Text>
                  </Box>
                )}
              </VStack>
            </Card.Root>

            {/* Recording controls */}
            <Card.Root p={4} w="full">
              <VStack gap={4}>
                <Heading size="md">Record Gesture</Heading>
                
                <VStack gap={3} w="full">
                  <Box w="full">
                    <Text mb={2} fontWeight="bold">Symbol or Emoji:</Text>
                    <Input
                      placeholder="e.g., ∞, →, ✊, Σ"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      size="lg"
                    />
                  </Box>

                  <Box w="full">
                    <Text mb={2} fontWeight="bold">Notes (optional):</Text>
                    <Textarea
                      placeholder="Describe this variant..."
                      value={metadata}
                      onChange={(e) => setMetadata(e.target.value)}
                      rows={2}
                    />
                  </Box>

                  <Button
                    colorScheme="green"
                    size="lg"
                    w="full"
                    onClick={startRecording}
                    disabled={!cameraActive || isRecording || !handDetected}
                  >
                    {isRecording ? "Recording..." : "Record Gesture (3s countdown)"}
                  </Button>
                </VStack>
              </VStack>
            </Card.Root>
          </VStack>

          {/* Right: Saved gestures list */}
          <VStack gap={4} flex={1}>
            <Card.Root p={4} w="full">
              <VStack gap={4} align="stretch">
                <HStack justify="space-between">
                  <Heading size="md">Saved Gestures</Heading>
                  <HStack>
                    <Button 
                      size="sm" 
                      onClick={() => setEditMode(!editMode)}
                      colorScheme={editMode ? "red" : "gray"}
                    >
                      {editMode ? "Done Editing" : "Edit"}
                    </Button>
                    <Button size="sm" onClick={loadSavedGestures}>
                      Refresh
                    </Button>
                  </HStack>
                </HStack>

                {savedGestures.length === 0 ? (
                  <Text color="gray.500" textAlign="center" py={8}>
                    No gestures recorded yet. Start recording!
                  </Text>
                ) : (
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Symbol</Table.ColumnHeader>
                        <Table.ColumnHeader>Variants</Table.ColumnHeader>
                        <Table.ColumnHeader>Last Updated</Table.ColumnHeader>
                        {editMode && <Table.ColumnHeader>Actions</Table.ColumnHeader>}
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {savedGestures.map((gesture) => (
                        <Table.Row key={gesture.symbol}>
                          <Table.Cell fontSize="2xl">{gesture.symbol}</Table.Cell>
                          <Table.Cell>
                            <Badge>{gesture.variantCount}</Badge>
                          </Table.Cell>
                          <Table.Cell fontSize="xs">
                            {gesture.lastUpdated 
                              ? new Date(gesture.lastUpdated).toLocaleString()
                              : "N/A"}
                          </Table.Cell>
                          {editMode && (
                            <Table.Cell>
                              <Button
                                size="xs"
                                colorScheme="blue"
                                onClick={() => handleEditSymbol(gesture.symbol)}
                              >
                                Manage
                              </Button>
                            </Table.Cell>
                          )}
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}
              </VStack>
            </Card.Root>

            {/* Instructions */}
            <Card.Root p={4} w="full" bg="blue.50">
              <VStack gap={2} align="start">
                <Heading size="sm" color="blue.700">How to use Dev Mode:</Heading>
                <Text fontSize="sm" color="blue.900">
                  1. Start the camera and show your hand(s)
                </Text>
                <Text fontSize="sm" color="blue.900">
                  2. Enter a symbol (emoji, Unicode, or text)
                </Text>
                <Text fontSize="sm" color="blue.900">
                  3. Make the gesture with your hand(s)
                </Text>
                <Text fontSize="sm" color="blue.900">
                  4. Click "Record Gesture" - after 3 seconds it will capture
                </Text>
                <Text fontSize="sm" color="blue.900">
                  5. You can record multiple variants of the same symbol
                </Text>
                <Text fontSize="sm" fontWeight="bold" color="blue.700" mt={2}>
                  💡 Tip: Record 2-3 variants per symbol for better matching!
                </Text>
              </VStack>
            </Card.Root>
          </VStack>
        </HStack>

        {/* Back button */}
        <Button onClick={() => (window.location.href = "/")} size="lg">
          ← Back to Menu
        </Button>

        {/* Edit Dialog */}
        <Dialog.Root open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="2xl">
              <Dialog.Header>
                <Dialog.Title>
                  Manage Variants for: {selectedSymbol && <span style={{ fontSize: "2rem" }}>{selectedSymbol}</span>}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {selectedGestureDetail && (
                  <VStack gap={4} align="stretch">
                    <Text fontSize="sm" color="gray.600">
                      Total variants: {selectedGestureDetail.variants.length}
                    </Text>
                    
                    {selectedGestureDetail.variants.length === 0 ? (
                      <Text color="gray.500" textAlign="center" py={4}>
                        No variants available
                      </Text>
                    ) : (
                      <VStack gap={3} align="stretch">
                        {selectedGestureDetail.variants.map((variant, index) => (
                          <Card.Root key={variant.id} p={4} bg="gray.50">
                            <HStack justify="space-between">
                              <VStack align="start" gap={1} flex={1}>
                                <HStack>
                                  <Badge colorScheme="blue">Variant {index + 1}</Badge>
                                  <Badge colorScheme="purple">
                                    {variant.handCount} hand{variant.handCount !== 1 ? 's' : ''}
                                  </Badge>
                                </HStack>
                                <Text fontSize="xs" color="gray.600">
                                  Created: {new Date(variant.createdAt).toLocaleString()}
                                </Text>
                                {variant.metadata?.notes && (
                                  <Text fontSize="xs" color="gray.700">
                                    Notes: {variant.metadata.notes}
                                  </Text>
                                )}
                              </VStack>
                              <Button
                                size="sm"
                                colorScheme="red"
                                onClick={() => handleDeleteVariant(variant.id)}
                              >
                                Delete
                              </Button>
                            </HStack>
                          </Card.Root>
                        ))}
                      </VStack>
                    )}
                  </VStack>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.CloseTrigger asChild>
                  <Button>Close</Button>
                </Dialog.CloseTrigger>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      </VStack>
    </Container>
  );
};

export default DevMode;
