
import { 
    Box, 
    Container, 
    Heading, 
    Text, 
    VStack, 
    HStack,
    Button,
    Card,
    Image,
    Progress,
    Icon
} from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import { FiSkipForward, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useMusic } from '../context/MusicContext';
import { useEffect, useState } from "react";

interface TutorialSlide {
    title: string;
    description: string;
    image?: string;
    content: React.ReactNode;
}

const Tutorial: React.FC = () => {
    const navigate = useNavigate();

    const { setVolumePercentage } = useMusic();
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [slideProgress, setSlideProgress] = useState(0);
    const SLIDE_DURATION = 700000; // 7 seconds per slide
    const TOTAL_SLIDES = 6; // Total number of slides

    useEffect(() => {
        // Only handle countdown logic here, slide progression is handled by progress bar
        if (countdown !== null) {
            if (countdown > 0) {
                const timer = setTimeout(() => {
                    setCountdown(countdown - 1);
                }, 1000);
                return () => clearTimeout(timer);
            } else {
                // Countdown finished, navigate to game
                setVolumePercentage(80);
                navigate('../BodyGameMenu');
            }
        }
    }, [countdown, navigate]);

    // Slide progress animation
    useEffect(() => {
        if (countdown !== null) {
            // Don't show progress bar during countdown
            setSlideProgress(100);
            return;
        }

        setSlideProgress(0);
        let hasAdvanced = false; // Flag to prevent multiple advances
        
        const interval = setInterval(() => {
            setSlideProgress(prev => {
                const increment = (100 / SLIDE_DURATION) * 50; // Update every 50ms
                const newProgress = Math.min(prev + increment, 100);
                
                // When progress reaches 100%, advance to next slide (only once)
                if (newProgress >= 100 && !hasAdvanced) {
                    hasAdvanced = true;
                    
                    if (currentSlideIndex < TOTAL_SLIDES - 1) {
                        setTimeout(() => {
                            setCurrentSlideIndex(prevIndex => prevIndex + 1);
                        }, 50);
                    } else if (currentSlideIndex === TOTAL_SLIDES - 1) {
                        // Start countdown on last slide when progress completes
                        setTimeout(() => {
                            setCountdown(3);
                        }, 50);
                    }
                }
                
                return newProgress;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [currentSlideIndex, countdown]);

    const tutorialSlides: TutorialSlide[] = [
        {
            title: "Welcome to VIS Minigame! 🎮",
            description: "Learn how to play the LaTeX symbol recognition game",
            image: "/pic1.png",
            content: null
        },
        {
            title: "Backend Integration ⚙️",
            description: "Understanding how the system works",
            image: "/pic2.png",
            content: null
        },
        {
            title: "How Recognition Works 🔍",
            description: "The four-step process",
            image: "/pic3.png",
            content: null
        },
        {
            title: "Game Rules ⏱️",
            description: "Time-based challenge",
            image: "/hexagon.png",
            content: null
        },
        {
            title: "High Score System 🏆",
            description: "Track your progress",
            image: "/hexagon.png",
            content: null
        },
        {
            title: "Pro Tips 💡",
            description: "Get the best results",
            image: "/hexagon.png",
            content: null
        }
    ];

    const currentSlide = tutorialSlides[currentSlideIndex];
    const isFirstSlide = currentSlideIndex === 0;
    const isLastSlide = currentSlideIndex === tutorialSlides.length - 1;

    const handleSkip = () => {
        setVolumePercentage(80);
        navigate('../BodyGameMenu');
    };

    const handlePrevious = () => {
        if (!isFirstSlide) {
            setCurrentSlideIndex(prev => prev - 1);
            setCountdown(null); // Reset countdown if going back
        }
    };

    const handleNext = () => {
        if (!isLastSlide) {
            setCurrentSlideIndex(prev => prev + 1);
            setCountdown(null); // Reset countdown if manually advancing
        } else if (countdown === null) {
            // If on last slide and countdown hasn't started, start it
            setCountdown(3);
        }
    };

    return (
        <Box minH="80vh"  bg="gray.50" display="flex" alignItems="center" justifyContent="center" py={6}>
            <Container maxW="80vw">
                <Card.Root size="lg" boxShadow="xl">
                    <Card.Body p={{ base: 4, md: 6 }}>
                        {/* Header with Skip Button and Progress */}
                        <HStack justify="space-between" mb={4} align="center">
                            <Box flex="1">
                                <Heading size="xl">{currentSlide.title}</Heading>
                                <Text color="gray.600" mt={1}>{currentSlide.description}</Text>
                            </Box>
                            
                            <HStack gap={30} align="center" >
                                {/* Slide Counter */}
                                <Text textStyle="4xl" fontWeight="semibold" color="gray.700">
                                    {currentSlideIndex + 1}/{tutorialSlides.length}
                                </Text>
                                
                                
                                
                                <Button
                                    variant="solid"
                                    colorPalette="red"                               
                                    size="xl"
                                    onClick={handleSkip}
                                >
                                    <Icon>
                                        <FiSkipForward />
                                    </Icon>
                                    Skip
                                </Button>
                            </HStack>
                        </HStack>

                        {/* Slide Timer Bar */}
                        <Box mb={4}>
                            <Progress.Root value={slideProgress} size="xl" colorPalette="blue" animated>
                                <Progress.Track bg="gray.200">
                                    <Progress.Range transition="all 0.05s linear" />
                                </Progress.Track>
                            </Progress.Root>
                        </Box>

                        {/* Navigation Buttons */}
                        <HStack justify="right" gap={4} mb={4}>
                            <Button
                                variant="outline"
                                onClick={handlePrevious}
                                disabled={isFirstSlide}
                                size="lg"
                                colorPalette="blue"
                            >
                                <Icon>
                                    <FiChevronLeft />
                                </Icon>
                                Previous
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleNext}
                                disabled={isLastSlide && countdown !== null}
                                size="lg"
                                colorPalette="blue"
                            >
                                Next
                                <Icon>
                                    <FiChevronRight />
                                </Icon>
                            </Button>
                        </HStack>

                        {/* Image Section - Takes Most Space */}
                        {currentSlide.image && (
                            <Box 
                                mb={4} 
                                display="flex" 
                                justifyContent="center" 
                                bg="gray.100" 
                                borderRadius="sm" 
                                p={4}
                                minH="50vh"
                                alignItems="center"
                                position="relative"
                            >
                                <Image 
                                    src={currentSlide.image} 
                                    alt={currentSlide.title}
                                    maxH="70vh"
                                    maxW="70%"
                                    objectFit="contain"
                                    opacity={countdown !== null ? 0.3 : 1}
                                    transition="opacity 0.3s"
                                />
                                
                                {/* Countdown Overlay */}
                                {countdown !== null && countdown > 0 && (
                                    <Box
                                        position="absolute"
                                        top="50%"
                                        left="50%"
                                        transform="translate(-50%, -50%)"
                                        textAlign="center"
                                    >
                                        <Text
                                            fontSize="200px"
                                            fontWeight="bold"
                                            color="blue.500"
                                            lineHeight="1"
                                            animation="pulse 0.5s ease-in-out"
                                        >
                                            {countdown}
                                        </Text>
                                        <Text
                                            fontSize="2xl"
                                            fontWeight="semibold"
                                            color="gray.700"
                                            mt={4}
                                        >
                                            Get Ready!
                                        </Text>
                                    </Box>
                                )}
                                
                                {countdown === 0 && (
                                    <Box
                                        position="absolute"
                                        top="50%"
                                        left="50%"
                                        transform="translate(-50%, -50%)"
                                        textAlign="center"
                                    >
                                        <Text
                                            fontSize="4xl"
                                            fontWeight="bold"
                                            color="green.500"
                                        >
                                            Let's Go! 🚀
                                        </Text>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Card.Body>
                </Card.Root>
            </Container>
        </Box>
    );
};

export default Tutorial;