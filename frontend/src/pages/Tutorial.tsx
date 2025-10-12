import {
    Box, 
    Container, 
    Heading, 
    Text, 
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
import { LightMode } from '@/components/ui/color-mode';

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
    const [slideProgress, setSlideProgress] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const SLIDE_DURATION = 7000; // 7 seconds per slide
    const TOTAL_SLIDES = 4; // Total number of slides

    // Slide progress animation
    useEffect(() => {
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
                        setIsTransitioning(true);
                        setTimeout(() => {
                            setCurrentSlideIndex(prevIndex => prevIndex + 1);
                            setIsTransitioning(false);
                        }, 300);
                    } else if (currentSlideIndex === TOTAL_SLIDES - 1) {
                        // Navigate directly to game on last slide
                        setTimeout(() => {
                            setVolumePercentage(80);
                            navigate('../play');
                        }, 50);
                    }
                }
                
                return newProgress;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [currentSlideIndex, navigate, setVolumePercentage]);

    const tutorialSlides: TutorialSlide[] = [
        {
            title: "1️⃣ START THE GAME:",
            description: "Hold two Thumbs up to start the game❗ (or be boring and just press Start )",
            image: "/pic1.png",
            content: null
        },
        {
            title: "2️⃣ GOAL:",
            description: "Try your best to recreate the symbols 🔍",
            image: "/pic2.png",
            content: null
        },
        {
            title: "3️⃣ ACCURACY:",
            description: "see how the computer is interpreting your signs 🎯",
            image: "/pic3.png",
            content: null
        },
        {
            title: "4️⃣ BONUS POINTS:",
            description: "Try to collect the coins for extra points 🎉",
             image: "/pic4.png",
            content: null
        }
    ];

    const currentSlide = tutorialSlides[currentSlideIndex];
    const isFirstSlide = currentSlideIndex === 0;
    const isLastSlide = currentSlideIndex === tutorialSlides.length - 1;

    const handleSkip = () => {
        setVolumePercentage(80);
        navigate('../play');
    };

    const handlePrevious = () => {
        if (!isFirstSlide) {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentSlideIndex(prev => prev - 1);
                setIsTransitioning(false);
            }, 300);
        }
    };

    const handleNext = () => {
        if (!isLastSlide) {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentSlideIndex(prev => prev + 1);
                setIsTransitioning(false);
            }, 300);
        } else {
            // If on last slide, navigate directly to game
            setVolumePercentage(80);
            navigate('../play');
        }
    };

    return (
        <LightMode>
        <Box minH="80vh"  bg="gray.50" display="flex" alignItems="center" justifyContent="center" py={6}>
            <Container maxW="80vw">
                <Card.Root size="lg" boxShadow="xl">
                    <Card.Body p={{ base: 4, md: 6 }}>
                        {/* Header with Skip Button and Progress */}
                        <HStack 
                            justify="space-between" 
                            mb={4} 
                            align="center"
                            opacity={isTransitioning ? 0 : 1}
                            transition="opacity 0.3s ease-in-out"
                        >
                            <Box flex="1">
                                <Text fontSize="2xl" color="gray.700">
                                    <Text as="span" fontWeight="bold">{currentSlide.title}</Text>
                                    <Text as="span" mx={5}></Text>
                                    {currentSlide.description}
                                </Text>
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
                                opacity={isTransitioning ? 0 : 1}
                                transform={isTransitioning ? "translateX(20px)" : "translateX(0)"}
                                transition="all 0.3s ease-in-out"
                            >
                                <Image 
                                    src={currentSlide.image} 
                                    alt={currentSlide.title}
                                    maxH="70vh"
                                    maxW="70%"
                                    objectFit="contain"
                                />
                            </Box>
                        )}
                    </Card.Body>
                </Card.Root>
            </Container>
        </Box>
        </LightMode>
    );
};

export default Tutorial;
