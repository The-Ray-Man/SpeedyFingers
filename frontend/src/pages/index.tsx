import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  HStack,
  Table,
  Text,
  Card,
  Center,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { 
  getSinglePlayerLeaderboard, 
  getMultiPlayerLeaderboard,
  type LeaderboardEntry 
} from "../leaderboardApi";

// Helper function to get rank display (medal or number)
const getRankDisplay = (rank: number): string | number => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
};

// Reusable Game Mode Button Component
const GameModeButton = ({
  label,
  colorScheme,
  onClick,
}: {
  label: string;
  colorScheme: string;
  onClick: () => void;
}) => (
  <Center>
    <Button
      size="lg"
      colorScheme={colorScheme}
      onClick={onClick}
      px={12}
      py={8}
      w="33%"
      fontSize="xl"
      _hover={{ transform: "scale(1.05)" }}
      transition="transform 0.2s"
    >
      {label}
    </Button>
  </Center>
);

// Reusable Leaderboard Component
const Leaderboard = ({
  title,
  icon,
  color,
  data,
  nameKey,
}: {
  title: string;
  icon: string;
  color: string;
  data: LeaderboardEntry[];
  nameKey: "name" | "team";
}) => (
  <Card.Root p={6}>
    <Card.Header>
      <Heading size="lg" textAlign="center" color={color}>
        {icon} {title}
      </Heading>
    </Card.Header>
    <Card.Body>
      <Table.Root variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader textAlign="center">Rank</Table.ColumnHeader>
            <Table.ColumnHeader>{nameKey === "name" ? "Player" : "Team"}</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="center">Score</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="center">Symbols</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data.map((entry) => (
            <Table.Row key={entry.rank}>
              <Table.Cell textAlign="center" fontWeight="bold">
                {getRankDisplay(entry.rank)}
              </Table.Cell>
              <Table.Cell>{entry[nameKey]}</Table.Cell>
              <Table.Cell textAlign="center" fontWeight="semibold">
                {entry.score.toLocaleString()}
              </Table.Cell>
              <Table.Cell textAlign="center">{entry.symbols}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Card.Body>
  </Card.Root>
);

const App = () => {
  const [singlePlayerLeaderboard, setSinglePlayerLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [multiPlayerLeaderboard, setMultiPlayerLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch leaderboards from backend
  const fetchLeaderboards = async () => {
    try {
      const [singleData, multiData] = await Promise.all([
        getSinglePlayerLeaderboard(),
        getMultiPlayerLeaderboard(),
      ]);

      setSinglePlayerLeaderboard(singleData);
      setMultiPlayerLeaderboard(multiData);
    } catch (error) {
      console.error("Error fetching leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchLeaderboards();
  }, []);

  // Auto-refresh leaderboards every 5 seconds for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboards();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSinglePlayer = () => {
    window.location.href = "/game";
  };

  const handleMultiPlayer = () => {
    alert("Multiplayer mode coming soon!");
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="5xl" mb={2}>
            VIS Minigame Challenge
          </Heading>
          <Text fontSize="xl" color="gray.600">
            Test your skills by recreating LaTeX symbols and shapes!
          </Text>
        </Box>

        {/* Game Modes with Leaderboards */}
        {loading ? (
          <Text textAlign="center" fontSize="lg">Loading leaderboards...</Text>
        ) : (
          <HStack align="start" gap={6} justify="center">
            {/* Single Player Section */}
            <VStack flex={1} gap={4} align="stretch">
              <GameModeButton
                label="Single Player"
                colorScheme="blue"
                onClick={handleSinglePlayer}
              />
              <Leaderboard
                title="Single Player Leaderboard"
                icon="🏆"
                color="blue.600"
                data={singlePlayerLeaderboard}
                nameKey="name"
              />
            </VStack>

            {/* Multi Player Section */}
            <VStack flex={1} gap={4} align="stretch">
              <GameModeButton
                label="Multi Player"
                colorScheme="green"
                onClick={handleMultiPlayer}
              />
              <Leaderboard
                title="Multi Player Leaderboard"
                icon="👥"
                color="green.600"
                data={multiPlayerLeaderboard}
                nameKey="team"
              />
            </VStack> 
          </HStack>
        )}

        {/* Footer Info */}
        <Box textAlign="center" color="gray.500" fontSize="sm" pt={4}>
          <Text>
            Recreate as many LaTeX symbols and shapes as possible within the time limit!
          </Text>
          <Text mt={1}>Best played against a plain background with ≥2 players for team mode.</Text>
        </Box>
      </VStack>
    </Container>
  );1
};

export default App;
