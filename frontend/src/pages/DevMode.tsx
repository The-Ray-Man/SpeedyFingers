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
  Table,
  Dialog,
} from "@chakra-ui/react";
import { Hands, type Results } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { saveGesture, getAllGestures, getGestureBySymbol, deleteGestureVariant, deleteGesture, updateGestureThreshold, matchGesture, type GestureSummary, type GestureDefinition } from "../gestureApi";
import { landmarksToArray, getHandPoseDebugInfo } from "../advancedGestureRecognition";
import { Toaster, toaster } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";

// ⚙️ ADMIN MODE CONFIGURATION
// Predefined admin password - change this to your desired code
const ADMIN_PASSWORD = "admin123";

const DevMode: React.FC = () => {
  const [isModelReady, setIsModelReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");
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
  
  // Admin mode state
  const [adminMode, setAdminMode] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const currentLandmarksRef = useRef<any>(null);
  const selectedSymbolRef = useRef<string | null>(null);
  const lastMatchTimeRef = useRef<number>(0);

  useEffect(() => {
    selectedSymbolRef.current = selectedSymbol;
  }, [selectedSymbol]);

  useEffect(() => {
    const initializeHands = async () => {
      try {
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

  const handleAdminCodeSubmit = () => {
    if (adminCodeInput === ADMIN_PASSWORD) {
      setAdminMode(true);
      setAdminCodeInput("");
      toaster.create({
        title: "Admin Mode Activated",
        description: "You now have full editing access.",
        type: "success",
      });
    } else {
      toaster.create({
        title: "Access Denied",
        description: "Incorrect admin code.",
        type: "error",
      });
      setAdminCodeInput("");
    }
  };

  const handleAdminLogout = () => {
    setAdminMode(false);
    toaster.create({
      title: "Admin Mode Deactivated",
      description: "Editing functions disabled.",
      type: "info",
    });
  };

  const onHandsResults = async (results: Results) => {
    if (!canvasRef.current) return;

    const canvasCtx = canvasRef.current.getContext("2d");
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.translate(canvasRef.current.width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.image) {
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }

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

        const info = getHandPoseDebugInfo(landmarks);
        setDebugInfo(info);
      }
      
      if (selectedSymbolRef.current) {
        const now = Date.now();
        const timeSinceLastMatch = now - lastMatchTimeRef.current;
        
        if (timeSinceLastMatch >= 200) {
          lastMatchTimeRef.current = now;
          
          try {
            const landmarksArray = results.multiHandLandmarks.map((hand) => landmarksToArray(hand));
            
            const matchResponse = await matchGesture({
              symbol: selectedSymbolRef.current,
              landmarks: landmarksArray,
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
        type: "error",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (!videoRef.current) throw new Error("Video element not initialized");
      
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            try {
              await handsRef.current.send({ image: videoRef.current });
            } catch (err) {
              console.error("Error sending frame:", err);
            }
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;
      setCameraActive(true);
      
      toaster.create({
        title: "Camera Started",
        description: "Camera is now active.",
        type: "success",
      });
    } catch (error) {
      console.error("Failed to start camera:", error);
      toaster.create({
        title: "Camera Error",
        description: "Failed to access camera.",
        type: "error",
      });
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      setCameraActive(false);
      toaster.create({
        title: "Camera Stopped",
        type: "info",
      });
    }
  };

  const handleCreateGesture = async () => {
    if (!newSymbolName.trim()) {
      toaster.create({
        title: "Error",
        description: "Please enter a symbol name!",
        type: "error",
      });
      return;
    }

    const existing = savedGestures.find(g => g.symbol === newSymbolName.trim());
    if (existing) {
      toaster.create({
        title: "Error",
        description: "This symbol already exists!",
        type: "error",
      });
      return;
    }

    try {
      setIsAddingNew(false);
      setSelectedSymbol(newSymbolName.trim());
      setSelectedGestureDetail({
        symbol: newSymbolName.trim(),
        variants: [],
        threshold: newSymbolThreshold / 100,
      });
      setNewSymbolName("");
      
      toaster.create({
        title: "Gesture Created",
        description: `"${newSymbolName.trim()}" created. Add captures now!`,
        type: "success",
      });
    } catch (error) {
      console.error("Error creating gesture:", error);
    }
  };

  const handleAddCapture = () => {
    if (!selectedSymbol) return;
    
    if (!handDetected || !currentLandmarksRef.current) {
      toaster.create({
        title: "Error",
        description: "No hand detected!",
        type: "error",
      });
      return;
    }

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

  const captureGesture = async () => {
    if (!currentLandmarksRef.current || !selectedSymbol) return;

    try {
      const landmarksArray = currentLandmarksRef.current.map((hand: any) => 
        landmarksToArray(hand)
      );

      const threshold = selectedGestureDetail?.threshold || (newSymbolThreshold / 100);

      const response = await saveGesture({
        symbol: selectedSymbol,
        handCount: landmarksArray.length,
        landmarks: landmarksArray,
        threshold: threshold,
      });

      toaster.create({
        title: "Capture Added!",
        description: `Total captures: ${response.totalVariants}`,
        type: "success",
      });

      const updatedGesture = await getGestureBySymbol(selectedSymbol);
      setSelectedGestureDetail(updatedGesture);
      await loadSavedGestures();
    } catch (error) {
      console.error("Failed to save capture:", error);
      toaster.create({
        title: "Error",
        description: "Failed to save capture.",
        type: "error",
      });
    }
  };

  const handleSelectGesture = async (symbol: string) => {
    if (!cameraActive) {
      toaster.create({
        title: "Error",
        description: "Please start the camera first!",
        type: "error",
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
    if (!selectedSymbol) return;

    try {
      await updateGestureThreshold(selectedSymbol, manageThreshold / 100);
      
      toaster.create({
        title: "Success",
        description: `Threshold updated to ${manageThreshold}%`,
        type: "success",
      });

      const updatedGesture = await getGestureBySymbol(selectedSymbol);
      setSelectedGestureDetail(updatedGesture);
      await loadSavedGestures();
    } catch (error) {
      console.error("Failed to update threshold:", error);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!selectedSymbol) return;

    // Save symbol name before any state changes
    const symbolName = selectedSymbol;

    // Check if this is the last variant - if so, treat it as delete all
    const isLastVariant = selectedGestureDetail && selectedGestureDetail.variants.length === 1;

    if (isLastVariant) {
      // Confirm deletion of the entire gesture
      if (!confirm("This is the last capture. Deleting it will remove the entire gesture. Continue?")) {
        return;
      }

      try {
        // Delete the entire gesture
        await deleteGesture(symbolName);
        
        // Close the manage dialog and reset ALL state immediately
        setIsManageDialogOpen(false);
        setSelectedSymbol(null);
        setSelectedGestureDetail(null);
        setLiveSimilarity(0);
        
        // Refresh the gestures list
        await loadSavedGestures();
        
        toaster.create({
          title: "Gesture Deleted",
          description: "Last capture deleted. Symbol removed from library.",
          type: "info",
        });
      } catch (error: any) {
        console.error("Failed to delete gesture:", error);
        toaster.create({
          title: "Error",
          description: "Failed to delete gesture.",
          type: "error",
        });
      }
    } else {
      // Normal variant deletion
      if (!confirm("Delete this capture?")) return;

      try {
        await deleteGestureVariant(symbolName, variantId);
        
        // Refresh the saved gestures list
        await loadSavedGestures();
        
        // Get the updated gesture
        const updatedGesture = await getGestureBySymbol(symbolName);
        setSelectedGestureDetail(updatedGesture);
        
        toaster.create({
          title: "Success",
          description: "Capture deleted!",
          type: "success",
        });
      } catch (error: any) {
        console.error("Failed to delete variant:", error);
        toaster.create({
          title: "Error",
          description: "Failed to delete capture.",
          type: "error",
        });
      }
    }
  };

  const handleDeleteAll = async () => {
    if (!selectedSymbol) return;

    // Save symbol name before resetting state
    const symbolToDelete = selectedSymbol;

    // First confirmation
    const firstConfirm = confirm(
      `⚠️ WARNING: This will delete ALL captures and the symbol "${symbolToDelete}"!\n\nAre you sure you want to continue?`
    );
    
    if (!firstConfirm) return;

    // Second confirmation
    const secondConfirm = confirm(
      `⚠️ FINAL CONFIRMATION: Delete "${symbolToDelete}" permanently?\n\nThis action CANNOT be undone!`
    );
    
    if (!secondConfirm) return;

    try {
      await deleteGesture(symbolToDelete);
      
      // Close the manage dialog and reset ALL state immediately
      setIsManageDialogOpen(false);
      setSelectedSymbol(null);
      setSelectedGestureDetail(null);
      setLiveSimilarity(0);
      
      // Refresh the gestures list
      await loadSavedGestures();
      
      toaster.create({
        title: "Gesture Deleted",
        description: `"${symbolToDelete}" has been permanently deleted.`,
        type: "success",
      });
    } catch (error: any) {
      console.error("Failed to delete gesture:", error);
      toaster.create({
        title: "Error",
        description: "Failed to delete gesture.",
        type: "error",
      });
    }
  };

  const getThreshold = () => {
    return selectedGestureDetail?.threshold || 0.55;
  };

  return (
    <Container maxW="container.xl" py={8} bg="rgba(15, 18, 36, 0.95)">
      <Toaster />
      <VStack gap={10} align="stretch">
        <Box position="relative">
          <Box textAlign="center">
            <Heading size="xl" mb={2}>
              🛠️ Dev Mode - Gesture Library
            </Heading>
            <Text fontSize="md" color="rgba(226, 232, 255, 0.75)">
              Create gestures and add training captures
            </Text>
          </Box>
          
          {/* Admin Mode Control - Top Right */}
          <Box position="absolute" top={0} right={0}>
            {!adminMode ? (
              <Card.Root p={3} bg="rgba(34, 28, 64, 0.9)" borderWidth="1px" borderColor="purple.500" minW="280px">
                <HStack gap={2} align="stretch">
                  <HStack justify="space-between">
                    <Badge colorScheme="purple" fontSize="xs">
                      🔒 Read-only
                    </Badge>
                  </HStack>
                  <HStack gap={2}>
                    <Input
                      type="password"
                      placeholder="Admin code"
                      value={adminCodeInput}
                      onChange={(e) => setAdminCodeInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAdminCodeSubmit();
                        }
                      }}
                      size="sm"
                      flex={1}
                    />
                    <Button
                      colorScheme="purple"
                      onClick={handleAdminCodeSubmit}
                      disabled={!adminCodeInput}
                      size="sm"
                    >
                      Unlock
                    </Button>
                  </HStack>
                </HStack>
              </Card.Root>
            ) : (
              <Card.Root p={3} bg="rgba(20, 40, 48, 0.9)" borderWidth="1px" borderColor="teal.400" minW="280px">
                <HStack justify="space-between" gap={2}>
                  <Badge colorScheme="teal" fontSize="xs">
                    🔓 Admin
                  </Badge>
                  <Button size="xs" colorScheme="pink" variant="outline" onClick={handleAdminLogout}>
                    Logout
                  </Button>
                </HStack>
              </Card.Root>
            )}
          </Box>
        </Box>

        <HStack gap={6} align="start">
          <VStack gap={4} flex={1}>
            <Card.Root p={4} w="full" bg="rgba(17, 22, 40, 0.9)">
              <VStack gap={4}>
                

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
                      border: "2px solid #805AD5",
                      borderRadius: "8px",
                      maxWidth: "100%",
                      height: "auto",
                      display: cameraActive ? "block" : "none",
                    }}
                  />
                  
                  {countdown !== null && (
                    <Box
                      position="absolute"
                      top="50%"
                      left="50%"
                      transform="translate(-50%, -50%)"
                    >
                      <Heading size="6xl" color="pink.400">
                        {countdown}
                      </Heading>
                    </Box>
                  )}

                  {cameraActive && (
                    <Box position="absolute" top={4} right={4}>
                      <Badge colorScheme={handDetected ? "teal" : "orange"}>
                        {handDetected ? "✓ Hand Detected" : "✗ No Hand"}
                      </Badge>
                    </Box>
                  )}

                  {cameraActive && (
                     <Box position="absolute" top={4} left={4}>
                  <Button 
                    colorScheme="pink" 
                    onClick={stopCamera}
                    size="lg"
                  >
                    Stop Camera
                  </Button>
                  </Box>
                )}



                </Box>

                {cameraActive && (
                  <Box w="full" p={3} bg="rgba(32, 38, 72, 0.85)" borderRadius="md" fontSize="sm">
                    <Text fontWeight="bold" mb={1} color="rgba(206, 214, 255, 0.9)">Debug Info:</Text>
                    <Text whiteSpace="pre-line" fontFamily="monospace" color="rgba(184, 196, 255, 0.82)">
                      {debugInfo}
                    </Text>
                  </Box>
                )}
                {!cameraActive  && (
                  <Button 
                    colorScheme="purple" 
                    onClick={startCamera}
                    disabled={!isModelReady}
                    size="lg"
                  >
                    {isModelReady ? "Start Camera" : "Loading Model..."}
                  </Button>
                )}
              </VStack>
            </Card.Root>

            {selectedSymbol && (
              <Card.Root p={4} w="full" bg="rgba(36, 30, 68, 0.85)" borderWidth="2px" borderColor="purple.500">
                <VStack gap={4}>
                  <HStack justify="space-between" w="full">
                    <VStack align="start" gap={0}>
                      <Text fontSize="xs" color="rgba(255, 200, 170, 0.85)" fontWeight="bold">
                        Editing:
                      </Text>
                      <Text fontSize="3xl" color="rgba(240, 236, 255, 0.95)">{selectedSymbol}</Text>
                    </VStack>
                    <Button size="sm" colorScheme="pink" onClick={handleDeselectGesture}>
                      Done
                    </Button>
                  </HStack>

                  {(selectedGestureDetail?.variants.length || 0) > 0 ? (
                    <Box w="full">
                      <HStack justify="space-between" mb={2}>
                        <Text fontWeight="bold" fontSize="sm" color="rgba(210, 218, 255, 0.85)">Live Similarity:</Text>
                        <Badge 
                          colorScheme={liveSimilarity >= getThreshold() ? "green" : liveSimilarity > 0 ? "orange" : "gray"}
                          fontSize="lg"
                        >
                          {Math.round(liveSimilarity * 100)}%
                        </Badge>
                      </HStack>
                      <Box 
                        w="full" 
                        h="20px" 
                        bg="rgba(32, 36, 62, 0.85)" 
                        borderRadius="md" 
                        overflow="hidden"
                        position="relative"
                      >
                        <Box
                          h="full"
                          w={`${liveSimilarity * 100}%`}
                          bg={liveSimilarity >= getThreshold() ? "rgba(78, 225, 184, 0.85)" : "rgba(255, 170, 92, 0.85)"}
                          transition="all 0.2s"
                        />
                        <Box
                          position="absolute"
                          left={`${getThreshold() * 100}%`}
                          top="0"
                          bottom="0"
                          w="2px"
                          bg="rgba(255, 92, 92, 0.9)"
                        />
                      </Box>
                      <HStack justify="space-between" mt={1}>
                        <Text fontSize="xs" color="rgba(170, 182, 230, 0.65)">0%</Text>
                        <Text fontSize="xs" color="rgba(255, 140, 140, 0.9)" fontWeight="bold">
                          Threshold: {Math.round(getThreshold() * 100)}%
                        </Text>
                        <Text fontSize="xs" color="rgba(170, 182, 230, 0.65)">100%</Text>
                      </HStack>
                    </Box>
                  ) : (
                    <Box w="full" p={4} bg="rgba(44, 36, 86, 0.55)" borderRadius="md" textAlign="center">
                      <Text fontSize="sm" color="rgba(210, 218, 255, 0.75)">
                        No captures yet. Add your first capture below!
                      </Text>
                    </Box>
                  )}

                  <Tooltip content="Admin mode required" disabled={adminMode}>
                    <Button
                      colorScheme="purple"
                      size="lg"
                      w="full"
                      onClick={handleAddCapture}
                      disabled={!adminMode || !cameraActive || !handDetected || countdown !== null}
                      opacity={adminMode ? 1 : 0.5}
                      cursor={adminMode ? "pointer" : "not-allowed"}
                    >
                      {countdown !== null ? "Capturing..." : "Add Capture (3s countdown)"}
                    </Button>
                  </Tooltip>

                  <Text fontSize="xs" color="rgba(255, 216, 190, 0.8)" textAlign="center">
                    {(selectedGestureDetail?.variants.length || 0)} capture(s) recorded
                  </Text>
                </VStack>
              </Card.Root>
            )}
          </VStack>

          <VStack gap={4} flex={1}>
            <Card.Root p={4} w="full" bg="rgba(19, 28, 52, 0.9)">
              <VStack gap={4} align="stretch">
                <HStack justify="space-between">
                  <Heading size="md" color="white">Gesture Library</Heading>
                  <Button size="sm" onClick={loadSavedGestures}>
                    Refresh
                  </Button>
                </HStack>

                {isAddingNew ? (
                  <Card.Root p={4} bg="rgba(32, 42, 78, 0.85)" borderWidth="2px" borderColor="purple.400">
                    <VStack gap={3}>
                      <Input
                        placeholder="Enter symbol (e.g., ✊, λ, →)"
                        value={newSymbolName}
                        onChange={(e) => setNewSymbolName(e.target.value)}
                        size="lg"
                        autoFocus
                      />
                      <Box w="full">
                        <HStack justify="space-between" mb={2}>
                          <Text fontSize="sm" fontWeight="bold" color="rgba(210, 218, 255, 0.85)">Threshold:</Text>
                          <Badge colorScheme="purple">{newSymbolThreshold}%</Badge>
                        </HStack>
                        <Input
                          type="range"
                          min="30"
                          max="90"
                          value={newSymbolThreshold}
                          onChange={(e) => setNewSymbolThreshold(Number(e.target.value))}
                        />
                      </Box>
                      <HStack w="full">
                        <Button
                          colorScheme="purple"
                          onClick={handleCreateGesture}
                          flex={1}
                        >
                          Create
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddingNew(false);
                            setNewSymbolName("");
                          }}
                          flex={1}
                        >
                          Cancel
                        </Button>
                      </HStack>
                    </VStack>
                  </Card.Root>
                ) : (
                  <Tooltip content="Admin mode required" disabled={adminMode}>
                    <Button
                      colorScheme="purple"
                      onClick={() => setIsAddingNew(true)}
                      w="full"
                      disabled={!adminMode}
                      opacity={adminMode ? 1 : 0.5}
                      cursor={adminMode ? "pointer" : "not-allowed"}
                    >
                      + Add New Gesture
                    </Button>
                  </Tooltip>
                )}

                {savedGestures.length === 0 ? (
                  <Text color="rgba(194, 206, 255, 0.75)" textAlign="center" py={8}>
                    No gestures yet. Create one!
                  </Text>
                ) : (
                  <Table.Root size="sm">
                    <Table.Header bg="rgba(46, 54, 96, 0.55)">
                      <Table.Row>
                        <Table.ColumnHeader color="rgba(210, 218, 255, 0.82)">Symbol</Table.ColumnHeader>
                        <Table.ColumnHeader color="rgba(210, 218, 255, 0.82)">Captures</Table.ColumnHeader>
                        <Table.ColumnHeader color="rgba(210, 218, 255, 0.82)">Actions</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {savedGestures.map((gesture) => (
                        <Table.Row key={gesture.symbol} _hover={{ bg: "rgba(46, 54, 92, 0.6)" }}>
                          <Table.Cell fontSize="2xl" color="rgba(215, 200, 255, 0.92)">{gesture.symbol}</Table.Cell>
                          <Table.Cell>
                            <Badge colorScheme={gesture.variantCount > 0 ? "purple" : "gray"}>
                              {gesture.variantCount}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <HStack gap={1}>
                              <Button
                                size="xs"
                                colorScheme={selectedSymbol === gesture.symbol ? "orange" : "purple"}
                                onClick={() => handleSelectGesture(gesture.symbol)}
                                disabled={!cameraActive}
                              >
                                {selectedSymbol === gesture.symbol ? "Editing..." : "Edit"}
                              </Button>
                              <Tooltip content="Admin mode required" disabled={adminMode}>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleOpenManage(gesture.symbol)}
                                  disabled={!adminMode}
                                  opacity={adminMode ? 1 : 0.5}
                                  cursor={adminMode ? "pointer" : "not-allowed"}
                                >
                                  Manage
                                </Button>
                              </Tooltip>
                            </HStack>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}
              </VStack>
            </Card.Root>

            <Card.Root p={4} w="full" bg="rgba(46, 28, 74, 0.6)">
              <VStack gap={2} align="start">
                <Heading size="sm" color="rgba(232, 236, 255, 0.9)">How to use:</Heading>
                <Text fontSize="sm" color="rgba(232, 236, 255, 0.8)">
                  1. Click "+ Add New Gesture" and enter a symbol
                </Text>
                <Text fontSize="sm" color="rgba(232, 236, 255, 0.8)">
                  2. Click "Edit" to start adding captures
                </Text>
                <Text fontSize="sm" color="rgba(232, 236, 255, 0.8)">
                  3. Make the gesture and click "Add Capture"
                </Text>
                <Text fontSize="sm" color="rgba(232, 236, 255, 0.8)">
                  4. Add 2-3 captures per gesture for best results
                </Text>
                <Text fontSize="sm" fontWeight="bold" color="rgba(248, 250, 255, 0.9)" mt={2}>
                  💡 The similarity bar shows how well your current hand matches!
                </Text>
              </VStack>
            </Card.Root>
          </VStack>
        </HStack>

        <Button onClick={() => (window.location.href = "/")} size="lg" colorScheme="purple">
          ← Back to Menu
        </Button>

        <Dialog.Root open={isManageDialogOpen} onOpenChange={(e) => setIsManageDialogOpen(e.open)}>
          <Dialog.Backdrop bg="rgba(12, 16, 30, 0.55)" backdropFilter="blur(6px)" />
          <Dialog.Positioner>
            <Dialog.Content
              maxW="2xl"
              bg="rgba(20, 24, 40, 0.95)"
            >
              <Dialog.Header>
                <Dialog.Title color="rgba(230, 234, 255, 0.95)">
                  Manage:{" "}
                  {selectedSymbol && (
                    <Box as="span" fontSize="2rem" ml={2}>
                      {selectedSymbol}
                    </Box>
                  )}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {selectedGestureDetail && (
                  <VStack gap={4} align="stretch">
                    <Card.Root
                      p={4}
                      bg="rgba(32, 42, 78, 0.85)"
                    >
                      <VStack gap={3} align="stretch">
                        <HStack justify="space-between" align="center">
                          <Text fontWeight="bold" color="rgba(210, 218, 255, 0.85)">Match Threshold:</Text>
                          <Badge colorScheme="purple" fontSize="md">{manageThreshold}%</Badge>
                        </HStack>
                        <Input
                          type="range"
                          min="30"
                          max="90"
                          value={manageThreshold}
                          onChange={(e) => setManageThreshold(Number(e.target.value))}
                        />
                        <Button
                          size="sm"
                          colorScheme="purple"
                          onClick={handleUpdateThreshold}
                          disabled={manageThreshold === Math.round((selectedGestureDetail.threshold || 0.55) * 100)}
                        >
                          Update Threshold
                        </Button>
                      </VStack>
                    </Card.Root>
                    
                    {selectedGestureDetail.variants.length === 0 ? (
                      <Text color="rgba(188, 198, 255, 0.75)" textAlign="center" py={4}>
                        No captures yet
                      </Text>
                    ) : (
                      <VStack gap={3} align="stretch">
                        <Text fontWeight="bold" fontSize="sm" color="rgba(210, 218, 255, 0.82)">
                          Captures ({selectedGestureDetail.variants.length}):
                        </Text>
                        {selectedGestureDetail.variants.map((variant, index) => (
                          <Card.Root
                            key={variant.id}
                            p={4}
                            bg="rgba(28, 32, 60, 0.82)"
                          >
                            <HStack justify="space-between" align="center" gap={4}>
                              <VStack align="start" gap={1} flex={1}>
                                <HStack gap={2}>
                                  <Badge colorScheme="purple">Capture {index + 1}</Badge>
                                  <Badge colorScheme="purple">
                                    {variant.handCount} hand{variant.handCount !== 1 ? 's' : ''}
                                  </Badge>
                                </HStack>
                                <Text fontSize="xs" color="rgba(188, 198, 255, 0.75)">
                                  {new Date(variant.createdAt).toLocaleString()}
                                </Text>
                              </VStack>
                              <Button
                                size="sm"
                                colorScheme="pink"
                                variant="outline"
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
                <HStack justify="space-between" w="full">
                  <Button
                    colorScheme="red"
                    variant="outline"
                    onClick={handleDeleteAll}
                  >
                    🗑️ Delete All
                  </Button>
                  <Dialog.CloseTrigger asChild>
                    <Button colorScheme="purple">Close</Button>
                  </Dialog.CloseTrigger>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      </VStack>
    </Container>
  );
};

export default DevMode;
