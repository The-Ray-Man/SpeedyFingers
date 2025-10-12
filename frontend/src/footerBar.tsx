import { Box, HStack, Text, Button, Icon } from "@chakra-ui/react";
import { FiVolume2, FiVolumeX, FiUser } from 'react-icons/fi';
import { FaHandPaper, FaKeyboard } from 'react-icons/fa';
import { useMusic } from './context/MusicContext';
import { useUser } from './context/UserContext';
import { useGesture } from "./context/GestureContext";
import { useEffect, useRef, useState } from "react";


const FooterBar: React.FC = () => {
        const { isPlaying, toggle } = useMusic();
    const { user } = useUser();
    const { gesture, enabled, toggleGesture } = useGesture();
    
    const currentUser = user?.username || "Guest User";

    const [selectGestureBtn, setSelectGestureBtn] = useState(false);
    const [selectMusicBtn, setSelectMusicBtn] = useState(false);
    const lastConfirmRef = useRef<number>(0);
    const CONFIRM_COOLDOWN_MS = 1200;

    useEffect(() => {
        // Reset visual selections each frame
        let gestureSelected = false;
        let musicSelected = false;

        if (!enabled || !gesture) {
            setSelectGestureBtn(false);
            setSelectMusicBtn(false);
            return;
        }

        const left = gesture.left;
        const right = gesture.right;

        const isThumbsUp = (g: typeof left) => !!g && g.type === "THUMBS_UP";
        const isILoveYou = (g: typeof left) => !!g && g.type === "ILOVEYOU";

        // Iterate both hands for selection visuals
        // New mapping: ILY -> Music (pause/play), THUMBS_UP -> Keyboard (gesture)
        if (left) {
            if (isILoveYou(left)) gestureSelected = true; // ILY selects music
            if (isThumbsUp(left)) musicSelected = true; // thumbs up selects gesture
        }
        if (right) {
            if (isILoveYou(right)) gestureSelected = true; // ILY selects music regardless of side
            if (isThumbsUp(right)) musicSelected = true; // thumbs up selects gesture regardless of side
        }

        setSelectGestureBtn(gestureSelected);
        setSelectMusicBtn(musicSelected);

        // Confirmation: only act if both hands show SAME gesture type and confirm is true
        const leftType = left && (left as any)?.type;
        const rightType = right && (right as any)?.type;
        const sameType = !!leftType && !!rightType && leftType === rightType;

        if (gesture.confirm && sameType && (leftType === "THUMBS_UP" || leftType === "ILOVEYOU")) {
            const now = Date.now();
            if (now - lastConfirmRef.current < CONFIRM_COOLDOWN_MS) return;
            lastConfirmRef.current = now;

            // If exactly one is selected, trigger that. If both or none selected, do nothing.
            const exactlyOne = (gestureSelected ? 1 : 0) + (musicSelected ? 1 : 0) === 1;
            if (!exactlyOne) return;

            if (gestureSelected) {
                toggleGesture();
            } else if (musicSelected) {
                toggle();
            }
        }
    }, [gesture, enabled, toggle, toggleGesture]);

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

                {/* Right Side - Controls */}
                <HStack gap={3}>
                    {/* Gesture Mode Toggle */}
                    <Button
                        
                        colorPalette="whiteAlpha"
                        size="lg"
                        
                       
                        px={6}
                        borderRadius="full"
                        onClick={toggleGesture}
                        
                        borderColor="rgba(255, 255, 255, 0.3)"
                        _hover={{
                            bg: "rgba(255, 255, 255, 0.25)",
                            transform: "translateY(-2px)",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)"
                        }}
                        transition="all 0.2s ease"
                        transform={selectGestureBtn ? "scale(1.06)" : undefined}
                        boxShadow={selectGestureBtn ? "0 0 12px rgba(255,255,255,0.35)" : undefined}
                    >
                        <Icon fontSize="xl">
                            {enabled ? <FaHandPaper /> : <FaKeyboard />}
                        </Icon>
                        <Text ml={2} fontWeight="600">
                            {enabled ? "Gesture" : "Keyboard"}
                        </Text>
                    </Button>

                    {/* Music Toggle */}
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
                        transition="all 0.2s ease"
                        transform={selectMusicBtn ? "scale(1.06)" : undefined}
                        boxShadow={selectMusicBtn ? "0 0 12px rgba(255,255,255,0.35)" : undefined}
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