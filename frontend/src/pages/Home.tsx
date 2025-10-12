import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  Center,
} from "@chakra-ui/react";
import { useGesture } from "../context/GestureContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const Home = () => {
  const navigate = useNavigate();
  const { gesture, enabled } = useGesture();

  const buttons = [
    { label: "👆 Finger Game", path: "/FingerGameMenu", finger: 1 },
    { label: "🏃 Body Game", path: "/BodyGameMenu", finger: 2 },
  ];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Update selection based on gesture state
  useEffect(() => {
    console.log("[Home] Gesture state:", gesture);
    if (!enabled || !gesture) {setSelectedIndex(null); return;};

    // Prefer left hand first, fallback to right
    const hand = gesture.left ?? gesture.right;
    if (!hand) {
      setSelectedIndex(null);
      return;
    }

    if (hand.type === "FINGERS_UP" && hand.count) {
      const idx = buttons.findIndex((b) => b.finger === hand.count);
      setSelectedIndex(idx >= 0 ? idx : null);
    } else {
      setSelectedIndex(null);
    }

    // Navigate if both hands match (confirm)
    if (gesture.confirm && selectedIndex !== null) {
      navigate(buttons[selectedIndex].path);
    }
  }, [gesture, enabled,navigate]);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="5xl" mb={2}>
            VIS Minigame Challenge
          </Heading>
        </Box>

        {/* Game Selection */}
        <VStack gap={6} py={8}>
          <Heading size="2xl" textAlign="center" mb={4}>
            Choose Your Game
          </Heading>

          <Center gap={4}>
            {buttons.map((btn, idx) => (
              <Button
                key={btn.path}
                size="lg"
                colorScheme={btn.finger === 1 ? "blue" : "green"}
                onClick={() => navigate(btn.path)}
                px={16}
                py={10}
                fontSize="2xl"
                _hover={{ transform: "scale(1.05)" }}
                transform={selectedIndex === idx ? "scale(1.1)" : "scale(1)"}
                boxShadow={
                  selectedIndex === idx
                    ? "0 0 12px rgba(0,0,0,0.5)"
                    : "none"
                }
                transition="all 0.2s"
              >
                {btn.label}
              </Button>
            ))}
          </Center>
        </VStack>
      </VStack>
    </Container>
  );
};

export default Home;
