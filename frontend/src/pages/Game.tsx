import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from "react";
import { Text, HStack, Button, Box, Flex } from "@chakra-ui/react";
import VideoComponent from '@/components/game_components/VideoComponent';
import ProgressBar from '@/components/game_components/ProgressBar';
import ShapeWrapper from '@/components/game_components/ShapeWrapper';

const GAME_DURATION = 60; // 60 seconds game duration

const Game: React.FC = () => {
    const [score, setScore] = useState<number>(0);
    const [isScoreTrackable, setIsScoreTrackable] = useState<boolean>(false);
    const [elapsed, setElapsed] = useState<number>(0); // seconds
    const [progress, setProgress] = useState<number>(0); // percentage 0-100
    const intervalRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0); // Store the start time

    const handleScoreIncrement = useCallback(() => {
        setScore((prevScore) => prevScore + 1);
    }, []); // Empty dependency array since it only uses setScore which is stable

    // Timer logic
    useEffect(() => {
        if (isScoreTrackable) {
            startTimeRef.current = Date.now() - elapsed * 1000; // resume offset
            intervalRef.current = window.setInterval(() => {
                const newElapsed = (Date.now() - startTimeRef.current) / 1000;
                setElapsed(newElapsed);
                setProgress(Math.min((newElapsed / GAME_DURATION) * 100, 100));

                if (newElapsed >= GAME_DURATION) {
                    clearInterval(intervalRef.current!);
                    setIsScoreTrackable(false);
                }
            }, 100); // Update every 100ms
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isScoreTrackable]);

    const handleStartScoring = () => {
        setIsScoreTrackable(true);
    };

    const handleStopScoring = () => {
        setIsScoreTrackable(false);
    };

    const handleReset = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        setScore(0);
        setElapsed(0);
        setProgress(0);
        setIsScoreTrackable(false);
    };

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
                        scoreTrackable={isScoreTrackable}
                        onScoreIncrement={handleScoreIncrement}
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
                        progress={progress}
                        timeRemaining={`${Math.max(GAME_DURATION - elapsed, 0).toFixed(1)}s`}
                    />
                </Box>

                {/* Shape wrapper in bottom left */}
                <Box 
                    position="absolute" 
                    bottom={4} 
                    left={4}
                    zIndex={10}
                >
                    <ShapeWrapper text="\sigma" />
                </Box>
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
                        onClick={handleStartScoring}
                    >
                        Start Game
                    </Button>
                    
                    <Button 
                        colorScheme="red" 
                        onClick={handleStopScoring}
                    >
                        Pause Game
                    </Button>

                    <Button 
                        variant="outline" 
                        onClick={handleReset}
                    >
                        Reset
                    </Button>

                    <Text fontSize="xl" fontWeight="semibold" color="white" ml={4}>
                        Score: {score.toFixed(2)}
                    </Text>
                </HStack>
            </Box>
        </Flex>
    );
};

export default Game;