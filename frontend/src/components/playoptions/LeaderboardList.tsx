import { Flex, Stack, Text, VStack } from "@chakra-ui/react";
import { type LeaderboardEntry } from "@/leaderboardApi";

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  emptyMessage: string;
  highlight?: boolean;
}

export const LeaderboardList = ({ entries, emptyMessage, highlight = false }: LeaderboardListProps) => {
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
