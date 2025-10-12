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
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from "react";
import { type LeaderboardEntry } from "../leaderboardApi";
import HomeButton from "./design/ToHome.tsx";

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

interface GameMenuProps {
  gameTitle: string;
  gameIcon: string;
  singlePlayerRoute: string;
  multiPlayerRoute?: string;
  fetchLeaderboards: () => Promise<{
    singlePlayer: LeaderboardEntry[];
    multiPlayer: LeaderboardEntry[];
  }>;
}

const GameMenu = ({
  gameTitle,
  gameIcon,
  singlePlayerRoute,
  multiPlayerRoute,
  fetchLeaderboards,
}: GameMenuProps) => {
  const [singlePlayerLeaderboard, setSinglePlayerLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [multiPlayerLeaderboard, setMultiPlayerLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch leaderboards from backend
  const loadLeaderboards = async () => {
    try {
      const { singlePlayer, multiPlayer } = await fetchLeaderboards();
      setSinglePlayerLeaderboard(singlePlayer);
      setMultiPlayerLeaderboard(multiPlayer);
    } catch (error) {
      console.error("Error fetching leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    loadLeaderboards();
  }, []);

  // Auto-refresh leaderboards every 5 seconds for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadLeaderboards();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSinglePlayer = () => {
    navigate(singlePlayerRoute);
  };

  const handleMultiPlayer = () => {
    if (multiPlayerRoute) {
      navigate(multiPlayerRoute);
    } else {
      alert("Multiplayer mode coming soon!");
    }
  };



  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box>
          <HomeButton />
          <Box textAlign="center">
            <Heading size="5xl" mb={2}>
              {gameIcon} {gameTitle}
            </Heading>
          </Box>
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

        
      </VStack>
    </Container>
  );
};

export default GameMenu;
