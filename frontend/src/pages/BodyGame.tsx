import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from "react";
import { Text, HStack, Button, Box, Flex, VStack, Heading, Card, Badge } from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import VideoComponent from '@/components/game_components/VideoComponent';
import ProgressBar from '@/components/game_components/ProgressBar';
import type { Shape } from '@/components/game_components/ShapeOverlay';
import { generateShapeSequence } from '@/utils/collisionDetection';
import { submitScore, type LeaderboardEntry, getGameSinglePlayerLeaderboard } from '@/leaderboardApi';
import { Toaster, toaster } from "@/components/ui/toaster";
import { useUser } from '@/context/UserContext';

const INITIAL_COUNTDOWN = 5; // 5 seconds before first shape
const BETWEEN_COUNTDOWN = 4; // 4 seconds between shapes
const SHAPE_BLINK_DURATION = 5000; // 5 seconds of blinking (increased from 3)
const SHAPE_STILL_DURATION = 2000; // 2 seconds of still (check collision)
const OPACITY_INTERVAL_SLOW = 300; // Slow opacity fade: 300ms
const OPACITY_INTERVAL_FAST = 150; // Fast opacity fade: 150ms
const FAST_BLINK_START = 3000; // Start fast blinking after 3 seconds
const OPACITY_MIN = 0.2; // Minimum opacity (always visible)
const OPACITY_MAX = 0.7; // Maximum opacity
const OPACITY_STILL = 0.5; // Opacity during still phase
const TOTAL_SHAPES = 20;

type GameState = 'ready' | 'initial-countdown' | 'between-countdown' | 'shape-blinking' | 'shape-still' | 'game-over' | 'game-won';

const BodyGame: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const [gameState, setGameState] = useState<GameState>('ready');
    const [countdown, setCountdown] = useState<number>(0);
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [currentShapeIndex, setCurrentShapeIndex] = useState<number>(0);
    const [currentShape, setCurrentShape] = useState<Shape | null>(null);
    const [shapeOpacity, setShapeOpacity] = useState<number>(0);
    const [hasCollision, setHasCollision] = useState<boolean>(false);
    const [collisionDuringStill, setCollisionDuringStill] = useState<boolean>(false);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    
    const blinkIntervalRef = useRef<number | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const countdownIntervalRef = useRef<number | null>(null);
    const hasCollisionRef = useRef<boolean>(false);

    // Check if user exists, redirect if not
    useEffect(() => {
        if (!user) {
            navigate('/changeuser');
        }
    }, [user, navigate]);

    const handleCollisionDetected = useCallback((collision: boolean) => {
        hasCollisionRef.current = collision;
        setHasCollision(collision);
    }, []); // Empty dependency array - function never changes

    // Initialize game (reset to ready screen)
    const initializeGame = useCallback(() => {
        const shapeSequence = generateShapeSequence(TOTAL_SHAPES);
        setShapes(shapeSequence);
        setCurrentShapeIndex(0);
        setGameState('ready');
        setCurrentShape(null);
        setShapeOpacity(0);
        setHasCollision(false);
        setCollisionDuringStill(false);
    }, []);

    // Go back to menu
    const handleBackToMenu = useCallback(() => {
        navigate('/');
        if (blinkIntervalRef.current) {
            clearInterval(blinkIntervalRef.current);
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }
    }, [navigate]);

    // Start the game
    const handleStartGame = useCallback(() => {
        if (shapes.length === 0) {
            const shapeSequence = generateShapeSequence(TOTAL_SHAPES);
            setShapes(shapeSequence);
        }
        setCurrentShapeIndex(0);
        setGameState('initial-countdown');
        setCountdown(INITIAL_COUNTDOWN);
    }, [shapes.length]);

    // Handle countdown
    useEffect(() => {
        if (gameState !== 'initial-countdown' && gameState !== 'between-countdown') {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
            return;
        }

        countdownIntervalRef.current = window.setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    if (countdownIntervalRef.current) {
                        clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                    }
                    // Move to shape blinking
                    setGameState('shape-blinking');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, [gameState]);

    // Handle shape blinking and still phases
    useEffect(() => {
        if (gameState !== 'shape-blinking' && gameState !== 'shape-still') {
            if (blinkIntervalRef.current) {
                clearInterval(blinkIntervalRef.current);
                blinkIntervalRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            return;
        }

        // Handle shape-blinking state
        if (gameState === 'shape-blinking') {
            // Check if we've completed all shapes
            if (currentShapeIndex >= shapes.length) {
                setGameState('game-won');
                return;
            }

            const shape = shapes[currentShapeIndex];
            setCurrentShape(shape);
            setShapeOpacity(OPACITY_MAX);
            setHasCollision(false);
            setCollisionDuringStill(false);

            const shapeStartTime = Date.now();
            let opacityIncreasing = false; // Start by fading down
            let currentOpacityInterval = OPACITY_INTERVAL_SLOW;

            // Opacity fade logic (always visible, fades between min and max)
            const startOpacityFade = () => {
                blinkIntervalRef.current = window.setInterval(() => {
                    const elapsed = Date.now() - shapeStartTime;
                    
                    // Switch to fast fading after threshold
                    if (elapsed > FAST_BLINK_START && currentOpacityInterval === OPACITY_INTERVAL_SLOW) {
                        currentOpacityInterval = OPACITY_INTERVAL_FAST;
                        if (blinkIntervalRef.current) {
                            clearInterval(blinkIntervalRef.current);
                        }
                        startOpacityFade();
                        return;
                    }
                    
                    // Toggle between fading in and out
                    opacityIncreasing = !opacityIncreasing;
                    setShapeOpacity(opacityIncreasing ? OPACITY_MAX : OPACITY_MIN);
                }, currentOpacityInterval);
            };

            startOpacityFade();

            // After blinking duration, enter still phase
            timeoutRef.current = window.setTimeout(() => {
                if (blinkIntervalRef.current) {
                    clearInterval(blinkIntervalRef.current);
                    blinkIntervalRef.current = null;
                }
                
                // Shape is now still with fixed opacity
                setShapeOpacity(OPACITY_STILL);
                setCollisionDuringStill(false); // Reset collision flag
                setGameState('shape-still');
            }, SHAPE_BLINK_DURATION);
        }

        // Handle shape-still state (evaluation phase)
        if (gameState === 'shape-still') {
            // After still duration, check final collision
            timeoutRef.current = window.setTimeout(() => {
                if (collisionDuringStill) {
                    // Collision during still phase - game over
                    setGameState('game-over');
                } else {
                    // Success - move to next shape
                    const nextIndex = currentShapeIndex + 1;
                    setCurrentShapeIndex(nextIndex);
                    setShapeOpacity(0);
                    setCurrentShape(null);
                    
                    // Check if more shapes remain
                    if (nextIndex >= shapes.length) {
                        setGameState('game-won');
                    } else {
                        setGameState('between-countdown');
                        setCountdown(BETWEEN_COUNTDOWN);
                    }
                }
            }, SHAPE_STILL_DURATION);
        }

        return () => {
            if (blinkIntervalRef.current) {
                clearInterval(blinkIntervalRef.current);
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [gameState, currentShapeIndex, shapes, collisionDuringStill]);

    // Track collisions during still phase - ANY collision = fail
    useEffect(() => {
        if (gameState === 'shape-still') {
            if (hasCollisionRef.current && !collisionDuringStill) {
              
                setCollisionDuringStill(true);
            }
        }
    }, [gameState, collisionDuringStill]); // Removed hasCollision from dependencies

    // Stop the game
    const handleStopGame = useCallback(() => {
        if (blinkIntervalRef.current) {
            clearInterval(blinkIntervalRef.current);
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }
        setGameState('game-over');
    }, []);

    // Load leaderboard
    const loadLeaderboard = useCallback(async () => {
        try {
            const data = await getGameSinglePlayerLeaderboard('body');
            setLeaderboard(data);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        }
    }, []);

    // Submit score to leaderboard
    const handleSubmitScore = useCallback(async () => {
        if (!user) {
            toaster.create({
                title: "Error",
                description: "No user found. Please set your username.",
                type: "error",
            });
            navigate('/changeuser');
            return;
        }

        try {
            await submitScore({
                score: currentShapeIndex,
                symbols: currentShapeIndex,
                gameMode: 'single',
                gameType: 'body',
            });

            toaster.create({
                title: "Success!",
                description: "Score submitted successfully!",
                type: "success",
            });

            // Reload leaderboard
            await loadLeaderboard();
        } catch (error) {
            console.error('Failed to submit score:', error);
            toaster.create({
                title: "Error",
                description: "Failed to submit score. Please try again.",
                type: "error",
            });
        }
    }, [user, currentShapeIndex, loadLeaderboard, navigate]);

    const handleReset = useCallback(() => {
        if (blinkIntervalRef.current) {
            clearInterval(blinkIntervalRef.current);
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }
        initializeGame();
    }, [initializeGame]);

    // Load leaderboard on mount
    useEffect(() => {
        loadLeaderboard();
    }, [loadLeaderboard]);

    // Don't render if no user
    if (!user) {
        return null;
    }

    return (
        <Box width="100%" minHeight="100vh" bg="gray.50" position="relative">
            <Toaster />
            
            {/* Video Background - Always running */}
            <Box
                position="fixed"
                top={0}
                left={0}
                width="100%"
                height="100%"
                zIndex={0}
                opacity={gameState === 'ready' || gameState === 'game-over' || gameState === 'game-won' ? 0.3 : 1}
                transition="opacity 0.3s ease"
            >
                <VideoComponent 
                    scoreTrackable={gameState !== 'ready' && gameState !== 'game-over' && gameState !== 'game-won'}
                    currentShape={currentShape}
                    shapeOpacity={shapeOpacity}
                    onCollisionDetected={handleCollisionDetected}
                    showControls={false}
                    preloadCamera={true}
                />
            </Box>
            
            {/* Ready Screen with Video Background */}
            {gameState === 'ready' && (
                <Flex 
                    direction="column" 
                    align="center" 
                    justify="center" 
                    minHeight="100vh"
                    p={8}
                    position="relative"
                    zIndex={10}
                >
                    <VStack gap={6} maxW="700px" width="100%">
                        <Card.Root p={8} width="100%" bg="rgba(255, 255, 255, 0.95)" backdropFilter="blur(10px)">
                            <VStack gap={4}>
                                <Heading size="2xl" textAlign="center">Ready to Play?</Heading>
                                <Badge colorScheme="blue" fontSize="lg" p={2}>
                                    Player: {user.username}
                                </Badge>
                                <Text textAlign="center" fontSize="lg">
                                    Shapes will appear on screen and blink. Get out of them before they stop blinking!
                                    You'll face {TOTAL_SHAPES} shapes of increasing difficulty.
                                </Text>
                                
                                <Button 
                                    colorScheme="green" 
                                    size="lg" 
                                    onClick={handleStartGame}
                                    width="100%"
                                >
                                    Start Game
                                </Button>

                                <Button 
                                    size="lg" 
                                    onClick={handleBackToMenu}
                                    width="100%"
                                    variant="outline"
                                >
                                    ← Back to Menu
                                </Button>
                            </VStack>
                        </Card.Root>

                        {/* Leaderboard Preview */}
                        {leaderboard.length > 0 && (
                            <Card.Root p={6} width="100%" bg="rgba(255, 255, 255, 0.95)" backdropFilter="blur(10px)">
                                <VStack gap={3} align="stretch">
                                    <Heading size="md" textAlign="center">🏆 Top Scores</Heading>
                                    {leaderboard.slice(0, 5).map((entry) => (
                                        <HStack key={entry.rank} justify="space-between" p={2} bg="gray.50" borderRadius="md">
                                            <HStack gap={3}>
                                                <Badge colorScheme={entry.rank <= 3 ? "yellow" : "blue"}>#{entry.rank}</Badge>
                                                <Text fontWeight="bold">{entry.name}</Text>
                                            </HStack>
                                            <HStack gap={2}>
                                                <Text fontSize="lg" fontWeight="bold" color="green.600">
                                                    {entry.score}
                                                </Text>
                                                <Text fontSize="sm" color="gray.600">
                                                    shapes
                                                </Text>
                                            </HStack>
                                        </HStack>
                                    ))}
                                </VStack>
                            </Card.Root>
                        )}
                    </VStack>
                </Flex>
            )}

            {/* Game Screen */}
            {gameState !== 'ready' && gameState !== 'game-over' && gameState !== 'game-won' && (
                <Flex 
                    direction="column" 
                    height="100vh" 
                    width="100%" 
                    overflow="hidden"
                    position="relative"
                    zIndex={10}
                >
                    {/* Progress bar at the top */}
                    <Box 
                        position="relative" 
                        zIndex={10} 
                        p={4}
                        width="100%"
                    >
                        <ProgressBar 
                            progress={(currentShapeIndex / TOTAL_SHAPES) * 100}
                            timeRemaining={`Shape ${currentShapeIndex + 1}/${TOTAL_SHAPES}`}
                        />
                    </Box>

                        {/* Countdown overlay */}
                        {(gameState === 'initial-countdown' || gameState === 'between-countdown') && (
                            <Box
                                position="fixed"
                                top="50%"
                                left="50%"
                                transform="translate(-50%, -50%)"
                                zIndex={20}
                                bg="rgba(0, 0, 0, 0.8)"
                                p={8}
                                borderRadius="lg"
                                textAlign="center"
                            >
                                <Text fontSize="6xl" fontWeight="bold" color="white">
                                    {countdown}
                                </Text>
                                <Text fontSize="xl" color="white" mt={4}>
                                    {gameState === 'initial-countdown' ? 'Get Ready!' : 'Next Shape!'}
                                </Text>
                            </Box>
                        )}

                        {/* Collision warning during still phase */}
                        {gameState === 'shape-still' && hasCollision && (
                            <Box
                                position="fixed"
                                top={20}
                                left="50%"
                                transform="translateX(-50%)"
                                zIndex={15}
                                bg="rgba(255, 0, 0, 0.9)"
                                px={6}
                                py={3}
                                borderRadius="md"
                            >
                                <Text fontSize="2xl" fontWeight="bold" color="white">
                                    ⚠️ COLLISION DETECTED!
                                </Text>
                            </Box>
                        )}

                        {/* Status indicator */}
                        <Box
                            position="fixed"
                            top={24}
                            right={4}
                            zIndex={15}
                            bg="rgba(0, 0, 0, 0.8)"
                            px={4}
                            py={2}
                            borderRadius="md"
                        >
                            <VStack gap={1}>
                                <Text fontSize="sm" color="white" fontWeight="bold">
                                    {gameState === 'shape-blinking' && '⏱️ Dodge!'}
                                    {gameState === 'shape-still' && (hasCollision ? '❌ FAIL' : '✅ PASS')}
                                    {(gameState === 'initial-countdown' || gameState === 'between-countdown') && '⏳ Ready'}
                                </Text>
                                <Badge colorScheme={hasCollision ? 'red' : 'green'}>
                                    {user.username}
                                </Badge>
                            </VStack>
                        </Box>

                    {/* Footer with controls */}
                    <Box
                        position="fixed"
                        bottom={0}
                        left={0}
                        right={0}
                        p={4}
                        bg="rgba(0, 0, 0, 0.8)"
                        borderTop="1px solid rgba(255, 255, 255, 0.1)"
                        zIndex={10}
                    >
                        <HStack gap={3} justifyContent="center">
                            <Button 
                                colorScheme="red" 
                                onClick={handleStopGame}
                                size="lg"
                            >
                                Stop Game
                            </Button>

                            <Text fontSize="xl" fontWeight="semibold" color="white" ml={4}>
                                {(gameState === 'initial-countdown' || gameState === 'between-countdown') && `Get ready: ${countdown}s`}
                                {gameState === 'shape-blinking' && `Blinking... Shape ${currentShapeIndex + 1}/${TOTAL_SHAPES}`}
                                {gameState === 'shape-still' && (hasCollision ? '❌ COLLISION!' : '✅ Hold position!')}
                            </Text>
                        </HStack>
                    </Box>
                </Flex>
            )}

            {/* Game Over Screen */}
            {gameState === 'game-over' && (
                <Flex 
                    direction="column" 
                    align="center" 
                    justify="center" 
                    minHeight="100vh"
                    p={8}
                    position="relative"
                    zIndex={10}
                >
                    <Card.Root p={8} maxW="600px" width="100%" bg="rgba(255, 255, 255, 0.95)" backdropFilter="blur(10px)">
                        <VStack gap={4}>
                            <Heading size="2xl" color="red.600">
                                Game Over!
                            </Heading>
                            <Text fontSize="xl" textAlign="center">
                                Collision detected during evaluation phase!
                            </Text>
                            <VStack gap={2} my={4}>
                                <Text fontSize="3xl" fontWeight="bold">
                                    Final Score: {currentShapeIndex}
                                </Text>
                                <Text fontSize="lg" color="gray.600">
                                    Shapes successfully dodged: {currentShapeIndex}/{TOTAL_SHAPES}
                                </Text>
                                <Text fontSize="md" color="gray.600">
                                    Player: {user.username}
                                </Text>
                                <Badge colorScheme="purple" fontSize="md" p={2}>
                                    Level: {currentShapeIndex < 8 ? 'Easy' : currentShapeIndex < 14 ? 'Medium' : 'Hard'}
                                </Badge>
                            </VStack>
                            
                            <Button 
                                colorScheme="green" 
                                size="lg" 
                                onClick={handleSubmitScore}
                                width="100%"
                            >
                                Submit to Leaderboard
                            </Button>
                            
                            <Button 
                                colorScheme="blue" 
                                size="lg" 
                                onClick={handleReset}
                                width="100%"
                            >
                                Play Again
                            </Button>
                            
                            <Button 
                                size="lg" 
                                onClick={handleBackToMenu}
                                width="100%"
                                variant="outline"
                            >
                                Back to Menu
                            </Button>
                        </VStack>
                    </Card.Root>

                    {/* Leaderboard */}
                    {leaderboard.length > 0 && (
                        <Card.Root p={6} maxW="600px" width="100%" mt={6} bg="rgba(255, 255, 255, 0.95)" backdropFilter="blur(10px)">
                            <VStack gap={3} align="stretch">
                                <Heading size="md" textAlign="center">🏆 Leaderboard</Heading>
                                {leaderboard.slice(0, 10).map((entry) => (
                                    <HStack 
                                        key={entry.rank} 
                                        justify="space-between" 
                                        p={2} 
                                        bg={entry.name === user.username ? "blue.50" : "gray.50"}
                                        borderRadius="md"
                                        borderWidth={entry.name === user.username ? "2px" : "0"}
                                        borderColor="blue.500"
                                    >
                                        <HStack gap={3}>
                                            <Badge 
                                                colorScheme={entry.rank <= 3 ? "yellow" : "blue"}
                                            >
                                                #{entry.rank}
                                            </Badge>
                                            <Text fontWeight={entry.name === user.username ? "bold" : "medium"}>
                                                {entry.name}
                                            </Text>
                                        </HStack>
                                        <HStack gap={2}>
                                            <Text fontSize="lg" fontWeight="bold" color="green.600">
                                                {entry.score}
                                            </Text>
                                            <Text fontSize="sm" color="gray.600">
                                                shapes
                                            </Text>
                                        </HStack>
                                    </HStack>
                                ))}
                            </VStack>
                        </Card.Root>
                    )}
                </Flex>
            )}

            {/* Game Won Screen */}
            {gameState === 'game-won' && (
                <Flex 
                    direction="column" 
                    align="center" 
                    justify="center" 
                    minHeight="100vh"
                    p={8}
                    position="relative"
                    zIndex={10}
                >
                    <Card.Root p={8} maxW="600px" width="100%" bg="rgba(255, 255, 255, 0.95)" backdropFilter="blur(10px)">
                        <VStack gap={4}>
                            <Heading size="2xl" color="green.600">
                                🎉 Perfect Victory! 🎉
                            </Heading>
                            <Text fontSize="xl" textAlign="center">
                                All shapes dodged successfully!
                            </Text>
                            <VStack gap={2} my={4}>
                                <Text fontSize="3xl" fontWeight="bold">
                                    Final Score: {TOTAL_SHAPES}
                                </Text>
                                <Text fontSize="lg" color="gray.600">
                                    You completed all {TOTAL_SHAPES} shapes!
                                </Text>
                                <Text fontSize="md" color="gray.600">
                                    Player: {user.username}
                                </Text>
                                <Badge colorScheme="purple" fontSize="md" p={2}>
                                    🏆 Master Level Achieved! 🏆
                                </Badge>
                            </VStack>
                            
                            <Button 
                                colorScheme="green" 
                                size="lg" 
                                onClick={handleSubmitScore}
                                width="100%"
                            >
                                Submit to Leaderboard
                            </Button>
                            
                            <Button 
                                colorScheme="blue" 
                                size="lg" 
                                onClick={handleReset}
                                width="100%"
                            >
                                Play Again
                            </Button>
                            
                            <Button 
                                size="lg" 
                                onClick={handleBackToMenu}
                                width="100%"
                                variant="outline"
                            >
                                Back to Menu
                            </Button>
                        </VStack>
                    </Card.Root>

                    {/* Leaderboard */}
                    {leaderboard.length > 0 && (
                        <Card.Root p={6} maxW="600px" width="100%" mt={6} bg="rgba(255, 255, 255, 0.95)" backdropFilter="blur(10px)">
                            <VStack gap={3} align="stretch">
                                <Heading size="md" textAlign="center">🏆 Leaderboard</Heading>
                                {leaderboard.slice(0, 10).map((entry) => (
                                    <HStack 
                                        key={entry.rank} 
                                        justify="space-between" 
                                        p={2} 
                                        bg={entry.name === user.username ? "blue.50" : "gray.50"}
                                        borderRadius="md"
                                        borderWidth={entry.name === user.username ? "2px" : "0"}
                                        borderColor="blue.500"
                                    >
                                        <HStack gap={3}>
                                            <Badge 
                                                colorScheme={entry.rank <= 3 ? "yellow" : "blue"}
                                            >
                                                #{entry.rank}
                                            </Badge>
                                            <Text fontWeight={entry.name === user.username ? "bold" : "medium"}>
                                                {entry.name}
                                            </Text>
                                        </HStack>
                                        <HStack gap={2}>
                                            <Text fontSize="lg" fontWeight="bold" color="green.600">
                                                {entry.score}
                                            </Text>
                                            <Text fontSize="sm" color="gray.600">
                                                shapes
                                            </Text>
                                        </HStack>
                                    </HStack>
                                ))}
                            </VStack>
                        </Card.Root>
                    )}
                </Flex>
            )}
        </Box>
    );
};

export default BodyGame;
