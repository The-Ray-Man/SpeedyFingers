import { Box, HStack, Text, Button, Icon } from "@chakra-ui/react";
import { FiVolume2, FiVolumeX, FiUser } from 'react-icons/fi';
import { useMusic } from './context/MusicContext';
import { useUser } from './context/UserContext';

const FooterBar: React.FC = () => {
    const { isPlaying, toggle } = useMusic();
    const { user } = useUser();
    
    const currentUser = user?.username || "Guest User";

    return (
        <Box
            bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            backdropFilter="blur(10px)"
            color="white"
            py={4}
            px={8}
            boxShadow="0 -4px 20px rgba(0, 0, 0, 0.15)"
            zIndex={1000}
            height= 'var(--footer-height)'
        >
            <HStack justify="space-between" align-items="center" alignSelf={"center" } height="100%">
                {/* Left Side - User Info */}
                <HStack 
                    gap={3} 
                    bg="rgba(255, 255, 255, 0.1)"
                    px={4}
                    py={2}
                    borderRadius="full"
                    transition="all 0.3s ease"
                    _hover={{
                        bg: "rgba(255, 255, 255, 0.15)",
                        transform: "translateY(-3px)"
                    }}
                >
                    <Box
                        bg="rgba(255, 255, 255, 0.2)"
                        p={2}
                        borderRadius="full"
                    >
                        <Icon fontSize="xl">
                            <FiUser />
                        </Icon>
                    </Box>
                    <Text 
                        fontSize="lg" 
                        fontWeight="600"
                        letterSpacing="0.5px"
                    >
                        {currentUser}
                    </Text>
                </HStack>

                {/* Right Side - Music Toggle */}
                <Button
                    variant={isPlaying ? "solid" : "outline"}
                    colorPalette="whiteAlpha"
                    size="lg"
                    onClick={toggle}
                    title={isPlaying ? "Pause Music" : "Play Music"}
                    px={6}
                    borderRadius="full"
                    bg={isPlaying ? "rgba(255, 255, 255, 0.2)" : "transparent"}
                    borderColor="rgba(255, 255, 255, 0.3)"
                    _hover={{
                        bg: "rgba(255, 255, 255, 0.25)",
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)"
                    }}
                    transition="all 0.3s ease"
                >
                    <Icon 
                        fontSize="xl"
                        transition="all 0.3s ease"
                        animation={isPlaying ? "pulse 2s infinite" : "none"}
                    >
                        {isPlaying ? <FiVolume2 /> : <FiVolumeX />}
                    </Icon>
                    <Text ml={2} fontWeight="600">
                        {isPlaying ? "Playing" : "Paused"}
                    </Text>
                </Button>
            </HStack>

            {/* CSS Animation */}
            <style>
                {`
                    @keyframes pulse {
                        0%, 100% {
                            opacity: 1;
                        }
                        50% {
                            opacity: 0.6;
                        }
                    }
                `}
            </style>
        </Box>
    );
};

export default FooterBar;