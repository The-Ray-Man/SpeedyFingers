import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  SimpleGrid,
  Stack,
  Flex,
  Spinner,
  HStack
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import {
  getGameSinglePlayerLeaderboard,
  getGameMultiPlayerLeaderboard,
  type LeaderboardEntry
} from "@/leaderboardApi";
import { useGesture } from "@/context/GestureContext";
import { keyframes } from "@emotion/react";

const PlayOptions = () => {
  const navigate = useNavigate();
  const [singlePlayerBoard, setSinglePlayerBoard] = useState<LeaderboardEntry[]>([]);
  const [liveGameBoard, setLiveGameBoard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { gesture, enabled, toggleGesture, loading: gestureLoading } = useGesture();
  const HOLD_DURATION_MS = 3200;
  const [singleProgress, setSingleProgress] = useState(0);
  const [multiProgress, setMultiProgress] = useState(0);
  const singleStartRef = useRef<number | null>(null);
  const multiStartRef = useRef<number | null>(null);
  const triggeredRef = useRef<{ single: boolean; multi: boolean }>({ single: false, multi: false });
  const autoManagedRef = useRef(false);
  const latestEnabledRef = useRef(enabled);
  const permissionRequestedRef = useRef(false);

  useEffect(() => {
    latestEnabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (gestureLoading || permissionRequestedRef.current) {
      return;
    }
    permissionRequestedRef.current = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      return;
    }
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("[PlayOptions] Camera access request failed:", err);
      }
    })();
  }, [gestureLoading]);

  useEffect(() => {
    if (gestureLoading) {
      return;
    }
    if (!autoManagedRef.current) {
      if (!latestEnabledRef.current) {
        toggleGesture();
      }
      autoManagedRef.current = true;
    }

    return () => {
      if (autoManagedRef.current) {
        if (latestEnabledRef.current) {
          toggleGesture();
        }
        autoManagedRef.current = false;
      }
    };
  }, [gestureLoading, toggleGesture]);

  const updateHold = (
    key: "single" | "multi",
    active: boolean,
    startRef: MutableRefObject<number | null>,
    setProgress: Dispatch<SetStateAction<number>>,
    onComplete: () => void,
    now: number
  ) => {
    if (active) {
      if (startRef.current === null) {
        startRef.current = now;
      }
      const elapsed = now - startRef.current;
      const progress = Math.min(1, elapsed / HOLD_DURATION_MS);
      setProgress(progress);
      if (progress >= 1 && !triggeredRef.current[key]) {
        triggeredRef.current[key] = true;
        onComplete();
      }
    } else {
      startRef.current = null;
      if (triggeredRef.current[key]) {
        triggeredRef.current[key] = false;
      }
      setProgress(0);
    }
  };

  useEffect(() => {
    const now = performance.now();
    const left = gesture?.left;
    const right = gesture?.right;

    const getFingerCount = (hand: typeof left) =>
      hand?.type === "FINGERS_UP" ? hand.count ?? null : null;

    const leftCount = getFingerCount(left);
    const rightCount = getFingerCount(right);

    const multiActive =
      leftCount !== null &&
      rightCount !== null &&
      leftCount >= 2 &&
      rightCount >= 2;

    let singleActive =
      (leftCount === 1 || rightCount === 1) && !multiActive;

    const hasGesture = !!gesture;
    if (!hasGesture) {
      singleActive = false;
    }

    updateHold(
      "single",
      singleActive,
      singleStartRef,
      setSingleProgress,
      () => navigate("/game-1"),
      now
    );
    updateHold(
      "multi",
      multiActive,
      multiStartRef,
      setMultiProgress,
      () => navigate("/live_game"),
      now
    );
  }, [gesture, navigate]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [single, multi] = await Promise.all([
          getGameSinglePlayerLeaderboard("finger"),
          getGameMultiPlayerLeaderboard("finger")
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
                  selectionProgress={multiProgress}
                />
                <ModeColumn
                  title="Single Player Challenge"
                  description="Master mimicing of more complex shapes and test your LaTeX skills. Create a set of custom hand gestures and corresponding labels"
                  ctaLabel="Play Solo"
                  onClick={() => navigate("/game-1")}
                  entries={singlePlayerBoard}
                  emptyMessage="No solo scores yet. Set the benchmark!"
                  selectionProgress={singleProgress}
                />
              </SimpleGrid>
            </>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

interface ModeColumnProps {
  title: string;
  description: string;
  ctaLabel: string;
  onClick: () => void;
  entries: LeaderboardEntry[];
  emptyMessage: string;
  highlight?: boolean;
  selectionProgress?: number;
}

const selectionPulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(120, 255, 180, 0.45), 0 0 18px rgba(120, 255, 180, 0.35);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(120, 255, 180, 0.2), 0 0 26px rgba(120, 255, 180, 0.55);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(120, 255, 180, 0.45), 0 0 18px rgba(120, 255, 180, 0.35);
  }
`;

const ModeColumn = ({
  title,
  description,
  ctaLabel,
  onClick,
  entries,
  emptyMessage,
  highlight = false,
  selectionProgress = 0
}: ModeColumnProps) => {
  const safeProgress = Math.max(0, Math.min(1, selectionProgress));
  const isSelecting = safeProgress > 0;

  return (
    <Box
      position="relative"
      borderRadius="2xl"
      boxShadow={
        highlight
          ? "0 24px 60px rgba(56, 54, 108, 0.55)"
          : "0 10px 30px rgba(20, 30, 45, 0.16)"
      }
      bg={
        highlight
          ? "linear-gradient(140deg, rgba(110, 85, 255, 0.35), rgba(30, 180, 255, 0.2))"
          : "white"
      }
      _dark={{
        bg: highlight
          ? "linear-gradient(140deg, rgba(120, 95, 255, 0.35), rgba(40, 200, 255, 0.2))"
          : "rgba(20, 24, 36, 0.75)"
      }}
      border={
        highlight
          ? "1px solid rgba(140, 200, 255, 0.35)"
          : "1px solid rgba(255, 255, 255, 0.08)"
      }
      p={{ base: 6, md: 8 }}
      display="flex"
      flexDirection="column"
      gap={6}
      transition="transform 0.3s ease, box-shadow 0.3s ease"
      transform={isSelecting ? "translateY(-6px)" : undefined}
      animation={isSelecting ? `${selectionPulse} 2.4s ease-in-out infinite` : undefined}
      overflow="hidden"
    >
      {isSelecting && (
        <Box
          position="absolute"
          inset={0}
          pointerEvents="none"
          bgGradient="linear(to-br, rgba(120, 255, 180, 0.12), transparent 55%)"
          zIndex={0}
        />
      )}

      <VStack align="flex-start" gap={3} position="relative" zIndex={1}>
        <Heading size="lg">{title}</Heading>
        <Text
          color={highlight ? "rgba(240, 248, 255, 0.92)" : "gray.600"}
          _dark={{ color: "gray.300" }}
        >
          {description}
        </Text>
        <Button
          colorScheme={highlight ? "purple" : "blue"}
          size="lg"
          onClick={onClick}
          alignSelf="flex-start"
        >
          {ctaLabel}
        </Button>
      </VStack>

      <Box
        mt={2}
        borderRadius="xl"
        border="1px solid rgba(255, 255, 255, 0.12)"
        bg={highlight ? "rgba(15, 20, 38, 0.45)" : "rgba(240, 242, 255, 0.65)"}
        _dark={{ bg: highlight ? "rgba(12, 16, 28, 0.55)" : "rgba(25, 30, 48, 0.65)" }}
        px={{ base: 4, md: 5 }}
        py={{ base: 4, md: 5 }}
        position="relative"
        zIndex={1}
      >
        <Heading
          size="sm"
          mb={3}
          textTransform="uppercase"
          letterSpacing="0.18em"
          color="rgba(220, 230, 255, 0.85)"
        >
          Leaderboard
        </Heading>
        <LeaderboardList entries={entries} emptyMessage={emptyMessage} highlight={highlight} />
      </Box>

      {isSelecting && (
        <Box
          position="absolute"
          bottom={{ base: 4, md: 6 }}
          left="12%"
          right="12%"
          height="6px"
          borderRadius="full"
          bg="rgba(255, 255, 255, 0.2)"
          overflow="hidden"
          zIndex={1}
        >
          <Box
            height="100%"
            borderRadius="inherit"
            bgGradient="linear(to-r, #78ffb4, #4cc3ff)"
            width={`${safeProgress * 100}%`}
            transition="width 0.15s ease-out"
          />
        </Box>
      )}
    </Box>
  );
};

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  emptyMessage: string;
  highlight?: boolean;
}

const LeaderboardList = ({ entries, emptyMessage, highlight = false }: LeaderboardListProps) => {
  if (!entries.length) {
    return (
      <Text fontSize="sm" color={highlight ? "rgba(220, 235, 255, 0.85)" : "rgba(60, 70, 110, 0.8)"}>
        {emptyMessage}
      </Text>
    );
  }

  return (
    <Stack gap={3}>
      {entries.slice(0, 3).map(entry => (
        <Flex
          key={`${entry.rank}-${entry.name ?? entry.team ?? entry.score}`}
          justify="space-between"
          align="center"
          gap={4}
          px={3}
          py={2}
          borderRadius="md"
          bg={highlight ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.6)"}
          _dark={{ bg: highlight ? "rgba(12, 16, 28, 0.6)" : "rgba(12, 16, 28, 0.5)" }}
        >
          <Flex align="center" gap={3}>
            <Flex
              align="center"
              justify="center"
              w={9}
              h={9}
              borderRadius="full"
              bg={highlight ? "purple.500" : "blue.500"}
              color="white"
              fontWeight="bold"
              fontSize="sm"
            >
              {entry.rank}
            </Flex>
            <VStack align="flex-start" gap={0}>
              <Text fontWeight="semibold" fontSize="sm">
                {entry.name ?? entry.team ?? "Unknown"}
              </Text>
              <Text fontSize="xs" color={highlight ? "rgba(220, 235, 255, 0.75)" : "rgba(70, 80, 120, 0.75)"}>
                Symbols: {entry.symbols}
              </Text>
            </VStack>
          </Flex>
          <Text fontWeight="bold" fontSize="lg" color="#ffe066">
            {entry.score}
          </Text>
        </Flex>
      ))}
    </Stack>
  );
};

export default PlayOptions;
