import { useEffect, useState, useRef, useMemo } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  SimpleGrid,
  Flex,
  Spinner,
  HStack,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import {
  getGameSinglePlayerLeaderboard,
  getGameMultiPlayerLeaderboard,
  type LeaderboardEntry,
} from "@/leaderboardApi";
import { useGesture } from "@/context/GestureContext";
import { type TwoHandGestureState } from "@/context/GestureService";
import { ModeColumn } from "@/components/playoptions/ModeColumn";

type GestureIntention = "single" | "multi" | "back" | "conflict" | null;
import HomeButton from "../components/design/ToHome.tsx";
import MusicButton from "../components/design/MusicButton.tsx";

const PlayOptions = () => {
  const navigate = useNavigate();
  const [singlePlayerBoard, setSinglePlayerBoard] = useState<LeaderboardEntry[]>([]);
  const [liveGameBoard, setLiveGameBoard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { gesture, setGestureEnabled } = useGesture();
  const [currentIntention, setCurrentIntention] = useState<GestureIntention>(null);
  const startTimeRef = useRef<number | null>(null);
  // Visual progress for each mode button (0..1)
  const [singleHoldProgress, setSingleHoldProgress] = useState(0);
  const [multiHoldProgress, setMultiHoldProgress] = useState(0);

  // Enable gesture tracking on mount
  useEffect(() => {
    setGestureEnabled(true);
    return () => {
      setGestureEnabled(false);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [single, multi] = await Promise.all([
          getGameSinglePlayerLeaderboard("finger"),
          getGameMultiPlayerLeaderboard("finger"),
        ]);
        if (!cancelled) {
          setSinglePlayerBoard(single);
          setLiveGameBoard(multi);
          setError(null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Failed to load leaderboards. Please try again in a moment.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Interpret gesture intention from gesture state
  const interpretIntention = useMemo(() => {
    return (gest: TwoHandGestureState | null): GestureIntention => {
      if (!gest) return null;
      const { firstHand, secondHand } = gest;

      // No hands detected
      if (!firstHand && !secondHand) return null;

      // Helper to check if gesture is one finger up
      const isOneFinger = (hand: typeof firstHand) =>
        hand?.type === "FINGERS_UP" && hand.count === 1;

      // Helper to check if gesture is two fingers up
      const isTwoFingers = (hand: typeof firstHand) =>
        hand?.type === "FINGERS_UP" && hand.count === 2;

      // Helper to check if gesture is thumbs down
      const isThumbsDown = (hand: typeof firstHand) =>
        hand?.type === "THUMBS_DOWN";

      // Helper to check if gesture is neutral/unused
      const isNeutral = (hand: typeof firstHand) =>
        !hand ||
        (hand.type === "FINGERS_UP" && hand.count !== 1 && hand.count !== 2) ||
        hand.type === "ILOVEYOU" ||
        hand.type === "THUMBS_UP" ||
        hand.type === "HEART";

      // Both hands with same intention
      if (firstHand && secondHand) {
        // Both one finger -> single player
        if (isOneFinger(firstHand) && isOneFinger(secondHand)) return "single";
        // Both two fingers -> multiplayer
        if (isTwoFingers(firstHand) && isTwoFingers(secondHand)) return "multi";
        // Both thumbs down -> back
        if (isThumbsDown(firstHand) && isThumbsDown(secondHand)) return "back";
        // One finger on one hand, neutral on other -> single
        if (
          (isOneFinger(firstHand) && isNeutral(secondHand)) ||
          (isNeutral(firstHand) && isOneFinger(secondHand))
        )
          return "single";
        // Two fingers on one hand, neutral on other -> show "1/2 players selecting"
        if (
          (isTwoFingers(firstHand) && isNeutral(secondHand)) ||
          (isNeutral(firstHand) && isTwoFingers(secondHand))
        )
          return null; // Not ready yet
        // Thumbs down on one hand, neutral on other -> back
        if (
          (isThumbsDown(firstHand) && isNeutral(secondHand)) ||
          (isNeutral(firstHand) && isThumbsDown(secondHand))
        )
          return "back";
        // Conflicting gestures
        return "conflict";
      }

      // Single hand
      if (isOneFinger(firstHand) || isOneFinger(secondHand)) return "single";
      if (isTwoFingers(firstHand) || isTwoFingers(secondHand)) return null; // Need two hands for multi
      if (isThumbsDown(firstHand) || isThumbsDown(secondHand)) return "back";
      return null;
    };
  }, []);

  // State machine: track gesture hold without animation frames
  useEffect(() => {
    const intention = interpretIntention(gesture);

    // Intention changed -> reset and (if valid) start new window
    if (intention !== currentIntention) {
      setCurrentIntention(intention);
      startTimeRef.current = intention && intention !== "conflict" ? Date.now() : null;
      // Reset visual progress on intention switch
      setSingleHoldProgress(0);
      setMultiHoldProgress(0);
      if (intention) {
        console.log("[PlayOptions] intention:", intention);
      }
      return;
    }

    // Same intention -> compute and log progress on this update tick
    if (intention && intention !== "conflict" && startTimeRef.current != null) {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / 4000, 1);
      console.log("[PlayOptions] progress:", { intention, progress });
      // Update per-mode visual progress
      if (intention === "single") {
        setSingleHoldProgress(progress);
        if (multiHoldProgress !== 0) setMultiHoldProgress(0);
      } else if (intention === "multi") {
        setMultiHoldProgress(progress);
        if (singleHoldProgress !== 0) setSingleHoldProgress(0);
      } else {
        // back or others -> clear both
        if (singleHoldProgress !== 0) setSingleHoldProgress(0);
        if (multiHoldProgress !== 0) setMultiHoldProgress(0);
      }
      if (progress >= 1) {
        if (intention === "single") navigate("/game-1");
        else if (intention === "multi") navigate("/live_game");
        else if (intention === "back") navigate("/");
        startTimeRef.current = null;
        // Clear visual progress after navigation trigger
        setSingleHoldProgress(0);
        setMultiHoldProgress(0);
      }
    }
  }, [gesture, navigate ]);

  return (
    <Box
      h="100vh"
      bg="gray.50"
      _dark={{ bg: "rgba(18, 22, 32, 0.75)" }}
      py={{ base: 10, md: 16 }}
    >
      <Container maxW="7xl">
        <VStack gap={{ base: 10, md: 12 }} align="stretch">
          <Button
            variant="outline"
            alignSelf="flex-start"
            size="sm"
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </Button>
          <HStack gap="7em" align="center" justify="center">
            <Heading size="5xl"><Text fontSize={"md"} position="absolute" transform="translate(-9.5em, -1em) rotate(8deg)">Show to select game {"->"}</Text>✌️</Heading>
            <VStack gap={3} textAlign="center">
              <Heading size="5xl">Choose Your Game Mode</Heading>
              <Text maxW="xl" color="gray.600" _dark={{ color: "gray.300" }}>
                Battle friends in real-time or show off your skills at mimicing more advanced shapes, emojis and even LaTeX shapes.
              </Text>
            </VStack>
            <Heading size="5xl">☝️<Text fontSize={"md"} position="absolute" transform="translate(3em, -5em) rotate(-16deg)">{"<-"} Show to select game </Text></Heading>
          </HStack>
          {/* Visual feedback temporarily removed – logging progress to console only */}
          {loading ? (
            <Flex justify="center" align="center" py={16}>
              <Spinner size="xl" color="purple.400" />
            </Flex>
          ) : (
            <>
              {error && (
                <Box
                  borderRadius="lg"
                  bg="red.500"
                  color="white"
                  px={6}
                  py={4}
                  textAlign="center"
                >
                  {error}
                </Box>
              )}
              <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8} alignItems="stretch">
                <ModeColumn
                  highlight
                  title="Gesture Battle"
                  description="Compete with a friend in 90s of fast-paced gesture mimicry and coin collecting. May the faster mimicker win!"
                  ctaLabel="Classic 1 vs. 1"
                  onClick={() => navigate("/live_game")}
                  entries={liveGameBoard}
                  emptyMessage="No teams on the board yet. Be the first dynamic duo!"
                  holdProgress={multiHoldProgress}
                  tutorialButton={{
                    label: "📚 Tutorial",
                    onClick: () => navigate("/tutorial")
                  }}
                />
                <ModeColumn
                  title="Single Player Challenge"
                  description="Master mimicing of more complex shapes and test your LaTeX skills. Create a set of custom hand gestures and corresponding labels"
                  ctaLabel="Play Solo"
                  onClick={() => navigate("/game-1")}
                  entries={singlePlayerBoard}
                  emptyMessage="No solo scores yet. Set the benchmark!"
                  holdProgress={singleHoldProgress}
                  
                />
              </SimpleGrid>
            </>
          )}
        </VStack>
      </Container>
      <MusicButton></MusicButton>
    </Box>
  );
};

export default PlayOptions;
