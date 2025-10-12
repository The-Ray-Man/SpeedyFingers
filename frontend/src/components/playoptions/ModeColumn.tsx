import { Box, Button, Heading, Text, VStack, HStack } from "@chakra-ui/react";
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
  tutorialButton?: {
    label: string;
    onClick: () => void;
  };
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
  tutorialButton,
}: ModeColumnProps) => {
  return (
    <Box
      position="relative"
      >

      
    <Box
      position="absolute"
      bg="rgb(59, 130, 246)"//#5f58d9"
      h={`${holdProgress * 100}%`}
      w={`${holdProgress * 100}%`}
      top="-2"
      left="-2"
      borderRadius="2xl"
      zIndex={0}
      pointerEvents="none"
      boxShadow="0 0 20px #5f58d9"
      style={{
        transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), height 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}
    ></Box>
      <Box
      position="absolute"
      bg="rgb(59, 130, 246)"//"#5f58d9"
      h={`${holdProgress * 100}%`}
      w={`${holdProgress * 100}%`}
      bottom="-2"
      right="-2"
      borderRadius="2xl"
      zIndex={0}
      pointerEvents="none"
      boxShadow="0 0 20px #5f58d9"
      style={{
        transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), height 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}
      ></Box>
      <Box
      position="relative"
      zIndex={10}
      borderRadius="2xl"
      boxShadow={highlight ? "0 20px 50px rgba(56, 54, 108, 0.35)" : "xl"}
      // Make highlight gradient opaque so nothing shows through
      bg={highlight ? "linear-gradient(140deg, #191032ff 0%, #1d3a63ff 100%)" : "rgba(248, 248, 255, 1)"}
      _dark={{
        bg: highlight
          ? "linear-gradient(140deg, #191032ff 0%, #1d3a63ff 100%)"
          : "rgba(22, 26, 38, 1)"
      }}
      border={highlight ? "1px solid rgba(62, 67, 72, 0.55)" : "1px solid rgba(255, 255, 255, 0.08)"}
      p={{ base: 6, md: 8 }}
      display="flex"
      flexDirection="column"
      gap={6}
      overflow="hidden"
    >

      <VStack align="flex-start" gap={3} position="relative" zIndex={1}>
        <Heading size="lg">{title}</Heading>
        <Text color={highlight ? "rgba(240, 248, 255, 0.92)" : "gray.600"} _dark={{ color: "gray.300" }}>
          {description}
        </Text>

        <HStack gap={150} align="flex-start">
           <Box position="relative" overflow="hidden" borderRadius="md">
          {/* Smooth, opaque gradient fill that sits behind the button */}
          <Box
            position="absolute"
            left={0}
            top={0}
            height="100%"
            width={`${Math.max(0, Math.min(1, holdProgress)) * 100}%`}
            bg="linear-gradient(90deg, #6E5AFF 0%, #9B6BFF 50%, #24B7FF 100%)"
            opacity={0.5}
            transition="width 0.3s cubic-bezier(0.4,0,0.2,1)"
            pointerEvents="none"
            zIndex={2}
          />
          <Button
            size="lg"
            onClick={onClick}
            alignSelf="flex-start"
            position="relative"
            zIndex={1}
            bg="transparent"
            borderWidth="2px"
            borderColor={highlight ? "rgba(210, 230, 255, 0.8)" : "rgba(40, 60, 120, 0.35)"}
            color={highlight ? "white" : "black"}
            _hover={{ bg: "rgba(255,255,255,0.06)" }}
            _dark={{
              borderColor: highlight ? "rgba(230, 245, 255, 0.9)" : "rgba(255,255,255,0.28)",
              color: "white",
              _hover: { bg: "rgba(255,255,255,0.08)" }
            }}
          >
            {ctaLabel}
          </Button>
        </Box>
          {tutorialButton && (
            <Button
              size="xl"
              onClick={tutorialButton.onClick}
              bg="purple.500"
              color="white"
              _hover={{ bg: "purple.600" }}
              _dark={{
                bg: "purple.600",
                _hover: { bg: "purple.700" }
              }}
            >
              {tutorialButton.label}
            </Button>
          )}
        </HStack>

      </VStack>

      <Box
        mt={2}
        borderRadius="xl"
        border="1px solid rgba(255, 255, 255, 0.12)"
        bg={highlight ? "rgba(15, 20, 38, 0.70)" : "rgba(240, 242, 255, 0.85)"}
        _dark={{ bg: highlight ? "rgba(12, 16, 28, 0.75)" : "rgba(25, 30, 48, 0.75)" }}
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
    </Box>
  );
};
