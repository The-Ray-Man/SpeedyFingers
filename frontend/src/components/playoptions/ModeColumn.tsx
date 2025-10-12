import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { type LeaderboardEntry } from "@/leaderboardApi";
import { LeaderboardList } from "./LeaderboardList";

interface ModeColumnProps {
  title: string;
  description: string;
  ctaLabel: string;
  onClick: () => void;
  entries: LeaderboardEntry[];
  emptyMessage: string;
  highlight?: boolean;
  holdProgress?: number; // 0-1 for button fill animation
  borderProgress?: number; // 0-1 for border growth animation
}

export const ModeColumn = ({
  title,
  description,
  ctaLabel,
  onClick,
  entries,
  emptyMessage,
  highlight = false,
  holdProgress = 0,
  borderProgress = 0,
}: ModeColumnProps) => {
  return (
    <Box
      position="relative"
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
      overflow="hidden"
    >
      {/* Border growth animation */}
      {borderProgress > 0 && (
        <Box
          position="absolute"
          bottom="0"
          left="0"
          right="0"
          height={`${borderProgress * 100}%`}
          border="3px solid"
          borderColor={highlight ? "purple.400" : "blue.400"}
          borderRadius="2xl"
          pointerEvents="none"
          transition="height 0.1s linear"
          zIndex={0}
        />
      )}

      <VStack align="flex-start" gap={3} position="relative" zIndex={1}>
        <Heading size="lg">{title}</Heading>
        <Text color={highlight ? "rgba(240, 248, 255, 0.92)" : "gray.600"} _dark={{ color: "gray.300" }}>
          {description}
        </Text>
        <Box position="relative" overflow="hidden" borderRadius="md">
          {/* Button fill animation */}
          {holdProgress > 0 && (
            <Box
              position="absolute"
              left="0"
              top="0"
              bottom="0"
              width={`${holdProgress * 100}%`}
              bg={highlight ? "purple.600" : "blue.600"}
              opacity={0.5}
              transition="width 0.1s linear"
              zIndex={0}
            />
          )}
          <Button 
            colorScheme={highlight ? "purple" : "blue"} 
            size="lg" 
            onClick={onClick} 
            alignSelf="flex-start"
            position="relative"
            zIndex={1}
          >
            {ctaLabel}
          </Button>
        </Box>
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
    </Box>
  );
};
