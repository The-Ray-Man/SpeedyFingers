import React from 'react';
import { 
    Box, 
    Container, 
    Heading, 
    Text, 
    VStack, 
    HStack,
    Button,
    Card,
    List,
    Badge,
    Code,
    Image,
    Progress,
    Icon
} from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiHome, FiSkipForward  } from 'react-icons/fi';

interface TutorialSlide {
    title: string;
    description: string;
    image?: string;
    content: React.ReactNode;
}

const Tutorial: React.FC = () => {
    const navigate = useNavigate();
    const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);

    const tutorialSlides: TutorialSlide[] = [
        {
            title: "Welcome to VIS Minigame! 🎮",
            description: "Learn how to play the LaTeX symbol recognition game",
            image: "/imgs/pic1.png",
            content: null
        },
        {
            title: "Backend Integration ⚙️",
            description: "Understanding how the system works",
            image: "/imgs/pic2.png",
            content: null
        },
        {
            title: "How Recognition Works 🔍",
            description: "The four-step process",
            image: "/imgs/pic3.png",
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
    const progress = ((currentSlideIndex + 1) / tutorialSlides.length) * 100;
    const isLastSlide = currentSlideIndex === tutorialSlides.length - 1;
    const isFirstSlide = currentSlideIndex === 0;

    const handleNext = () => {
        if (currentSlideIndex < tutorialSlides.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentSlideIndex > 0) {
            setCurrentSlideIndex(prev => prev - 1);
        }
    };

    const handleSkip = () => {
        navigate('/game');
    };

    const handleStartGame = () => {
        navigate('/game');
    };

    return (
        <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center" py={6}>
            <Container maxW="90vw">
                <Card.Root size="lg" boxShadow="xl">
                    <Card.Body p={{ base: 4, md: 6 }}>
                        {/* Header with Skip Button */}
                        <HStack justify="space-between" mb={4}>
                            <Box>
                                <Heading size="xl">{currentSlide.title}</Heading>
                                <Text color="gray.600" mt={1}>{currentSlide.description}</Text>
                            </Box>
                            <Button
                                variant="solid"
                                colorPalette= "red"                               
                                size="2xl"
                                onClick={handleSkip}
                            >
                                <Icon>
                                    <FiSkipForward />
                                </Icon>
                                Skip
                            </Button>
                        </HStack>

                        {/* Progress Bar */}
                        <Box mb={4}>
                            <HStack justify="space-between" mb={2}>
                                <Text fontSize="sm" color="gray.600">
                                    Slide {currentSlideIndex + 1} of {tutorialSlides.length}
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                    {Math.round(progress)}% Complete
                                </Text>
                            </HStack>
                            <Progress.Root value={progress} size="sm" colorScheme="blue">
                                <Progress.Track>
                                    <Progress.Range />
                                </Progress.Track>
                            </Progress.Root>
                        </Box>

                        {/* Image Section - Takes Most Space */}
                        {currentSlide.image && (
                            <Box 
                                mb={4} 
                                display="flex" 
                                justifyContent="center" 
                                bg="gray.100" 
                                borderRadius="lg" 
                                p={4}
                                minH="70vh"
                                alignItems="center"
                            >
                                <Image 
                                    src={currentSlide.image} 
                                    alt={currentSlide.title}
                                    maxH="70vh"
                                    maxW="100%"
                                    objectFit="contain"
                                />
                            </Box>
                        )}

                        {/* Navigation Buttons */}
                        <HStack justify="space-between" mt={4}>
                            <Button
                                variant="outline"
                                onClick={handlePrevious}
                                disabled={isFirstSlide}
                                size="lg"
                            >
                                <Icon mr={2}>
                                    <FiArrowLeft />
                                </Icon>
                                Previous
                            </Button>

                            {isLastSlide ? (
                                <Button
                                    colorScheme="blue"
                                    size="lg"
                                    onClick={handleStartGame}
                                    fontWeight="bold"
                                >
                                    Start Game
                                </Button>
                            ) : (
                                <Button
                                    colorScheme="blue"
                                    onClick={handleNext}
                                    size="lg"
                                >
                                    Next
                                    <Icon ml={2}>
                                        <FiArrowRight />
                                    </Icon>
                                </Button>
                            )}
                        </HStack>
                    </Card.Body>
                </Card.Root>
            </Container>
        </Box>
    );
};

export default Tutorial;