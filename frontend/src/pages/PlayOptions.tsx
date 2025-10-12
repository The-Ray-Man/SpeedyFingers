import { useEffect, useState } from "react";
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
  Spinner
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import {
  getGameSinglePlayerLeaderboard,
  getGameMultiPlayerLeaderboard,
  type LeaderboardEntry
} from "@/leaderboardApi";
import HomeButton from "../components/design/ToHome.tsx";

const PlayOptions = () => {
  const navigate = useNavigate();
  const [singlePlayerBoard, setSinglePlayerBoard] = useState<LeaderboardEntry[]>([]);
  const [liveGameBoard, setLiveGameBoard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      minH="calc(100vh - var(--footer-height))"
      bg="gray.50"
      _dark={{ bg: "rgba(18, 22, 32, 0.75)" }}
      py={{ base: 10, md: 16 }}
    >
      <Container maxW="7xl">
        <VStack gap={{ base: 10, md: 12 }} align="stretch">
          <HomeButton/>
          <VStack gap={3} textAlign="center">
            <Heading size="2xl">Choose Your Game Mode</Heading>
            <Text maxW="3xl" color="gray.600" _dark={{ color: "gray.300" }}>
              Jump into the cooperative Live Arena or hone your skills solo. Leaderboards update instantly so you always
              know who holds the crown.
            </Text>
          </VStack>

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
                  title="Live Game Arena (1v1)"
                  description="Team up, sync your gestures, and chase the co-op high score in our signature experience."
                  ctaLabel="Enter Live Game"
                  onClick={() => navigate("/live_game")}
                  entries={liveGameBoard}
                  emptyMessage="No teams on the board yet. Be the first dynamic duo!"
                />
                <ModeColumn
                  title="Single Player Challenge"
                  description="Master the prompts solo, build streaks, and climb the leaderboard at your own pace."
                  ctaLabel="Play Solo"
                  onClick={() => navigate("/game-1")}
                  entries={singlePlayerBoard}
                  emptyMessage="No solo scores yet. Set the benchmark!"
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
}

const ModeColumn = ({
  title,
  description,
  ctaLabel,
  onClick,
  entries,
  emptyMessage,
  highlight = false
}: ModeColumnProps) => (
  <Box
    borderRadius="2xl"
    boxShadow={highlight ? "0 24px 60px rgba(56, 54, 108, 0.55)" : "xl"}
    bg={highlight ? "linear-gradient(140deg, rgba(110, 85, 255, 0.35), rgba(30, 180, 255, 0.2))" : "white"}
    _dark={{
      bg: highlight
        ? "linear-gradient(140deg, rgba(120, 95, 255, 0.35), rgba(40, 200, 255, 0.2))"
        : "rgba(20, 24, 36, 0.75)"
    }}
    border={highlight ? "1px solid rgba(140, 200, 255, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)"}
    p={{ base: 6, md: 8 }}
    display="flex"
    flexDirection="column"
    gap={6}
  >
    <VStack align="flex-start" gap={3}>
      <Heading size="lg">{title}</Heading>
      <Text color={highlight ? "rgba(240, 248, 255, 0.92)" : "gray.600"} _dark={{ color: "gray.300" }}>
        {description}
      </Text>
      <Button colorScheme={highlight ? "purple" : "blue"} size="lg" onClick={onClick} alignSelf="flex-start">
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
  </Box>
);

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
      {entries.slice(0, 8).map(entry => (
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
