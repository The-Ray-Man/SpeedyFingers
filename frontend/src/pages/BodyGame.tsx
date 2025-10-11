import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from "react";
import { Text, HStack, Button, Box, Flex } from "@chakra-ui/react";
import VideoComponent from '@/components/game_components/VideoComponent';
import ProgressBar from '@/components/game_components/ProgressBar';
import type { Shape } from '@/components/game_components/ShapeOverlay';
import { generateShapeSequence } from '@/utils/collisionDetection';

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

type GameState = 'idle' | 'initial-countdown' | 'between-countdown' | 'shape-blinking' | 'shape-still' | 'game-over' | 'game-won';

const BodyGame: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('idle');
    const [countdown, setCountdown] = useState<number>(0);
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [currentShapeIndex, setCurrentShapeIndex] = useState<number>(0);
    const [currentShape, setCurrentShape] = useState<Shape | null>(null);
    const [shapeOpacity, setShapeOpacity] = useState<number>(0);
    const [hasCollision, setHasCollision] = useState<boolean>(false);
    const [collisionDuringStill, setCollisionDuringStill] = useState<boolean>(false);
    
    const blinkIntervalRef = useRef<number | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const countdownIntervalRef = useRef<number | null>(null);

    const handleCollisionDetected = useCallback((collision: boolean) => {
        setHasCollision(collision);
    }, []);

    // Initialize game
    const initializeGame = useCallback(() => {
        const shapeSequence = generateShapeSequence(TOTAL_SHAPES);
        setShapes(shapeSequence);
        setCurrentShapeIndex(0);
        setGameState('idle');
        setCurrentShape(null);
        setShapeOpacity(0);
        setHasCollision(false);
        setCollisionDuringStill(false);
    }, []);

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
            if (hasCollision && !collisionDuringStill) {
                console.log('Collision detected during evaluation phase!');
                setCollisionDuringStill(true);
            }
        }
    }, [gameState, hasCollision, collisionDuringStill]);

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

    // Initialize on mount
    useEffect(() => {
        initializeGame();
    }, [initializeGame]);

    return (
        <Flex 
            direction="column" 
            height="100vh" 
            width="100%" 
            overflow="hidden"
        >
            {/* Main content area with video background */}
            <Box 
                flex={1} 
                position="relative"
            >
                {/* Video Component as background */}
                <Box 
                    position="absolute" 
                    top={0} 
                    left={0} 
                    width="100%" 
                    height="100%"
                    zIndex={0}
                >
                    <VideoComponent 
                        scoreTrackable={gameState !== 'idle'}
                        currentShape={currentShape}
                        shapeOpacity={shapeOpacity}
                        onCollisionDetected={handleCollisionDetected}
                        showControls={false}
                    />
                </Box>

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
                        position="absolute"
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

                {/* Game Over overlay */}
                {gameState === 'game-over' && (
                    <Box
                        position="absolute"
                        top="50%"
                        left="50%"
                        transform="translate(-50%, -50%)"
                        zIndex={20}
                        bg="rgba(255, 0, 0, 0.9)"
                        p={8}
                        borderRadius="lg"
                        textAlign="center"
                        minWidth="400px"
                    >
                        <Text fontSize="4xl" fontWeight="bold" color="white" mb={4}>
                            Game Over!
                        </Text>
                        <Text fontSize="xl" color="white" mb={4}>
                            Collision detected during evaluation phase!
                        </Text>
                        <Text fontSize="3xl" fontWeight="bold" color="white" mb={2}>
                            Score: {currentShapeIndex}
                        </Text>
                        <Text fontSize="lg" color="white">
                            Shapes successfully dodged: {currentShapeIndex}/{TOTAL_SHAPES}
                        </Text>
                        <Text fontSize="md" color="whiteAlpha.800" mt={4}>
                            You reached difficulty level: {currentShapeIndex < 8 ? 'Easy' : currentShapeIndex < 16 ? 'Medium' : 'Hard'}
                        </Text>
                    </Box>
                )}

                {/* Game Won overlay */}
                {gameState === 'game-won' && (
                    <Box
                        position="absolute"
                        top="50%"
                        left="50%"
                        transform="translate(-50%, -50%)"
                        zIndex={20}
                        bg="rgba(0, 255, 0, 0.9)"
                        p={8}
                        borderRadius="lg"
                        textAlign="center"
                        minWidth="400px"
                    >
                        <Text fontSize="4xl" fontWeight="bold" color="white" mb={4}>
                            🎉 Perfect Victory! 🎉
                        </Text>
                        <Text fontSize="xl" color="white" mb={4}>
                            All shapes dodged successfully!
                        </Text>
                        <Text fontSize="3xl" fontWeight="bold" color="white" mb={2}>
                            Final Score: {TOTAL_SHAPES}
                        </Text>
                        <Text fontSize="lg" color="white">
                            You completed all {TOTAL_SHAPES} shapes!
                        </Text>
                        <Text fontSize="md" color="whiteAlpha.900" mt={4}>
                            🏆 Master Level Achieved! 🏆
                        </Text>
                    </Box>
                )}

                {/* Collision warning during still phase */}
                {gameState === 'shape-still' && hasCollision && (
                    <Box
                        position="absolute"
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
            </Box>

            {/* Footer with buttons */}
            <Box
                p={4}
                bg="rgba(0, 0, 0, 0.8)"
                borderTop="1px solid rgba(255, 255, 255, 0.1)"
            >
                <HStack gap={3} justifyContent="center">
                    <Button 
                        colorScheme="green" 
                        onClick={handleStartGame}
                        disabled={gameState !== 'idle' && gameState !== 'game-over' && gameState !== 'game-won'}
                        size="lg"
                    >
                        {gameState === 'idle' ? 'Start Game' : 'Play Again'}
                    </Button>

                    <Button 
                        variant="outline" 
                        onClick={handleReset}
                        size="lg"
                    >
                        Reset
                    </Button>

                    <Text fontSize="xl" fontWeight="semibold" color="white" ml={4}>
                        {gameState === 'idle' && 'Ready to play - Press Start!'}
                        {(gameState === 'initial-countdown' || gameState === 'between-countdown') && `Get ready: ${countdown}s`}
                        {gameState === 'shape-blinking' && `Blinking... Shape ${currentShapeIndex + 1}/${TOTAL_SHAPES}`}
                        {gameState === 'shape-still' && (hasCollision ? '❌ COLLISION!' : '✅ Hold position!')}
                        {gameState === 'game-over' && `Game Over - Score: ${currentShapeIndex}`}
                        {gameState === 'game-won' && `Perfect! Score: ${TOTAL_SHAPES}`}
                    </Text>
                    
                    {gameState === 'shape-still' && (
                        <Box 
                            ml={4}
                            px={3}
                            py={1}
                            borderRadius="md"
                            bg={hasCollision ? 'red.500' : 'green.500'}
                        >
                            <Text fontSize="lg" fontWeight="bold" color="white">
                                {hasCollision ? '⚠️ FAIL' : '✓ PASS'}
                            </Text>
                        </Box>
                    )}
                </HStack>
            </Box>
        </Flex>
    );
};

export default BodyGame;