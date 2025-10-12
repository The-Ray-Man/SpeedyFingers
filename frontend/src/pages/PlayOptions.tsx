import { useEffect, useState, useRef, useMemo } from "react";
import {
  Box,
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

import { useMusic } from "@/context/MusicContext";
type GestureIntention = "single" | "multi" | "back" | "music" | "conflict" | null;
import HomeButton from "../components/design/ToHome.tsx";
import MusicButton from "../components/design/MusicButton.tsx";

const PlayOptions = () => {
  const navigate = useNavigate();
  const [singlePlayerBoard, setSinglePlayerBoard] = useState<LeaderboardEntry[]>([]);
  const [liveGameBoard, setLiveGameBoard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { gesture, setGestureEnabled } = useGesture();
  const [currentIntention, setCurrentIntention] = useState<GestureIntention>(null);
  const { toggle } = useMusic();
  const startTimeRef = useRef<number | null>(null);
  // Unified visual hold progress for the current intention (0..1)
  const [holdProgress, setHoldProgress] = useState(0);
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
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
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
        hand.type === "THUMBS_UP" ||
        hand.type === "HEART";

          // Helper to check I LOVE YOU gesture
          const isILoveYou = (hand: typeof firstHand) => hand?.type === "ILOVEYOU";

      // Both hands with same intention
      if (firstHand && secondHand) {
        // Both one finger -> single player
        if (isOneFinger(firstHand) && isOneFinger(secondHand)) return "single";
        // Both two fingers -> multiplayer
        if (isTwoFingers(firstHand) && isTwoFingers(secondHand)) return "multi";
        // Both thumbs down -> back
        if (isThumbsDown(firstHand) && isThumbsDown(secondHand)) return "back";
        // Both ILY -> music
        if (isILoveYou(firstHand) && isILoveYou(secondHand)) return "music";
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
        // ILY on one hand, neutral on other -> music
        if (
          (isILoveYou(firstHand) && isNeutral(secondHand)) ||
          (isNeutral(firstHand) && isILoveYou(secondHand))
        )
          return "music";
        // Conflicting gestures
        return "conflict";
      }

      // Single hand
      if (isOneFinger(firstHand) || isOneFinger(secondHand)) return "single";
      if (isTwoFingers(firstHand) || isTwoFingers(secondHand)) return null; // Need two hands for multi
      if (isThumbsDown(firstHand) || isThumbsDown(secondHand)) return "back";
      if (isILoveYou(firstHand) || isILoveYou(secondHand)) return "music";
      return null;
    };
  }, []);

  // Detect the specific case: exactly one hand shows two fingers (✌️) and the other is neutral/missing
  const showTwoFingerJoinHint = useMemo(() => {
    const gest = gesture;
    if (!gest) return false;
    const { firstHand, secondHand } = gest;

    const isTwoFingers = (hand: typeof firstHand) =>
      hand?.type === "FINGERS_UP" && hand.count === 2;

    const isNeutral = (hand: typeof firstHand) =>
      !hand ||
      (hand.type === "FINGERS_UP" && hand.count !== 1 && hand.count !== 2) ||
      hand.type === "THUMBS_UP" ||
      hand.type === "HEART";

    // one hand with ✌️, the other neutral/missing
    const oneHandTwoFingersOnly =
      (isTwoFingers(firstHand) && isNeutral(secondHand)) ||
      (isTwoFingers(secondHand) && isNeutral(firstHand));

    // Do not show if both hands are already ✌️ (ready for multiplayer)
    const bothTwoFingers = isTwoFingers(firstHand) && isTwoFingers(secondHand);

    return oneHandTwoFingersOnly && !bothTwoFingers;
  }, [gesture]);

  // State machine: track gesture hold without animation frames
  useEffect(() => {
    const intention = interpretIntention(gesture);

    // Intention changed -> reset and (if valid) start new window
    if (intention !== currentIntention) {
      setCurrentIntention(intention);
      startTimeRef.current = intention && intention !== "conflict" ? Date.now() : null;
  // Reset visual progress on intention switch
  setHoldProgress(0);
      if (intention) {
        console.log("[PlayOptions] intention:", intention);
      }
      return;
    }

    // Same intention -> compute and log progress on this update tick
    if (intention && intention !== "conflict" && startTimeRef.current != null) {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / 2500, 1);
      console.log("[PlayOptions] progress:", { intention, progress });
      // Update unified progress regardless of intention
      setHoldProgress(progress);
      if (progress >= 1) {
        if (intention === "single") navigate("/game-1");
        else if (intention === "multi") navigate("/live_game");
        else if (intention === "back") navigate("/");
        else if (intention === "music") toggle();
        startTimeRef.current = null;
        // Clear visual progress after navigation trigger
        setHoldProgress(0);
      }
    }
  }, [gesture, navigate]);

  return (
    <>
    <div style={{ position: "fixed", bottom: "1rem", right: "1rem" }}>
      <Text
        position="absolute"
        right="calc(100% + 0.5rem)"
        width="100px"
        bottom="0.5rem"
        fontSize="sm"
        fontWeight="bold"
        color="gray.700"
        _dark={{ color: "gray.200" }}
        transform="rotate(-6deg)"
        letterSpacing="0.02em"
      >
        Show <Box as="span" aria-label="i love you" role="img">🤟</Box> to toggle <Box as="span">{"->"}</Box>
      </Text>
      <div style={{ position: "relative", display: "inline-block", borderRadius: 9999, overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <MusicButton />
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${Math.max(0, Math.min(1, currentIntention === "music" ? holdProgress : 0)) * 100}%`,
            background:
              "linear-gradient(90deg, rgba(110,90,255,0.35) 0%, rgba(155,107,255,0.35) 50%, rgba(36,183,255,0.35) 100%)",
            transition: "width 0.24s, smooth",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      </div>
    </div>
    <Box position="fixed" top={4} left={4} zIndex={10}>
      <HStack gap={3} align="center">
  <HomeButton holdProgress={currentIntention === "back" ? holdProgress : 0} />
        <Text transform="rotate(-5deg)
        translate(0em, -0.5em)"
          fontSize="sm"
          fontWeight="bold"
          color="gray.700"
          _dark={{ color: "gray.200" }}
          display="flex"
          alignItems="center"
          gap={1.5}
          letterSpacing="0.02em"
        >
          <Box as="span" display="inline-block"  transformOrigin="left center">{"<-"}</Box>
          Show <Box as="span" aria-label="thumbs down" role="img">👎</Box> to press
        </Text>
      </HStack>
    </Box>
    <Box
      h="100vh"
      bg="gray.50"
      _dark={{ bg: "rgba(18, 22, 32, 0.75)" }}
      py={{ base: 10, md: 16 }}
    >
      
      <Container maxW="7xl">
        <VStack gap={{ base: 10, md: 12 }} align="stretch">
          <HStack gap="7em" align="end" justify="center">
            <Box position="relative" display="inline-block">
              {showTwoFingerJoinHint && (
                <Box
                  position="absolute"
                  top="-2.25rem"
                  left="50%"
                  transform="translateX(-50%) rotate(-6deg)"
                  bg="orange.200"
                  color="orange.900"
                  borderWidth="1px"
                  borderColor="orange.300"
                  rounded="md"
                  px={3}
                  py={1}
                  shadow="sm"
                  fontSize="xs"
                  fontWeight="semibold"
                  whiteSpace="nowrap"
                  zIndex={1}
                >
                  Waiting for second two-finger hand
                </Box>
              )}
              <Heading size="5xl">
                <Text fontSize={"md"} width="200px" position="absolute" transform="translate(-10.5em, -1em) rotate(8deg)">Show to select game {"->"}</Text>
                ✌️+✌️
              </Heading>
            </Box>
            <VStack gap={3} textAlign="center">
              <Heading size="5xl">Choose Your Game Mode</Heading>
              <Text maxW="xl" color="gray.600" _dark={{ color: "gray.300" }}>
                Battle friends in real-time or show off your skills at mimicing more advanced shapes, emojis and even LaTeX shapes.
              </Text>
            </VStack>
            <Heading size="5xl" >☝️<Text fontSize={"md"} position="absolute" transform="translate(3.5em, -5em) rotate(-16deg)">{"<-"} Show to select game </Text></Heading>
          </HStack>
          {/* Visual feedback temporarily removed – logging progress to console only */}
          {loading ? (
            <Flex justify="center" align="center" py={16}>
              <Spinner size="xl" color="purple.400" />
            </Flex>
          ) : (
            <>
             
              <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8} alignItems="stretch">
                <ModeColumn
                  highlight
                  title="Gesture Battle"
                  description="Compete with a friend in 90s of fast-paced gesture mimicry and coin collecting. May the faster mimicker win!"
                  ctaLabel="Classic 1 vs. 1"
                  onClick={() => navigate("/live_game")}
                  entries={liveGameBoard}
                  emptyMessage="No teams on the board yet. Be the first dynamic duo!"

                  holdProgress={currentIntention === "multi" ? holdProgress : 0}
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
                  holdProgress={currentIntention === "single" ? holdProgress : 0}
                  
                />
              </SimpleGrid>
            </>
          )}
        </VStack>
      </Container>
      
    </Box>
    </>
  );
};

export default PlayOptions;
