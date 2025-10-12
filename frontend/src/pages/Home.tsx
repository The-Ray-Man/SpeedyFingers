import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  Text,
  Stack,
  SimpleGrid,
  Flex,
  HStack,
  Icon
} from "@chakra-ui/react";
import { FiActivity, FiCamera, FiPlayCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import type { ElementType } from "react";
import MusicButton from "../components/design/MusicButton.tsx";
// import { useGesture } from "../context/GestureContext";
// import { useNavigate } from "react-router-dom";
// import { useEffect, useState } from "react";


const Home = () => {
  const navigate = useNavigate();
  // const { gesture, enabled } = useGesture();

  // const buttons = [
  //   { label: "👆 Finger Game", path: "/FingerGameMenu", finger: 1 },
  //   { label: "🏃 Body Game", path: "/BodyGameMenu", finger: 2 },
  // ];

  // const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // // Update selection based on gesture state
  // useEffect(() => {
  //   console.log("[Home] Gesture state:", gesture);
  //   if (!enabled || !gesture) {setSelectedIndex(null); return;};

  //   // Prefer left hand first, fallback to right
  //   const hand = gesture.left ?? gesture.right;
  //   if (!hand) {
  //     setSelectedIndex(null);
  //     return;
  //   }

  //   if (hand.type === "FINGERS_UP" && hand.count) {
  //     const idx = buttons.findIndex((b) => b.finger === hand.count);
  //     setSelectedIndex(idx >= 0 ? idx : null);
  //   } else {
  //     setSelectedIndex(null);
  //   }

  //   // Navigate if both hands match (confirm)
  //   if (gesture.confirm && selectedIndex !== null) {
  //     navigate(buttons[selectedIndex].path);
  //   }
  // }, [gesture, enabled,navigate]);

  return (
    <Box
      minH="calc(100vh - var(--footer-height))"
      bg="gray.50"
      _dark={{ bg: "rgba(18, 22, 32, 0.75)" }}
    >
      <Container maxW="6xl" py={{ base: 12, md: 16 }}>
        <VStack gap={16} align="stretch">
          <Box
            borderRadius="2xl"
            bgGradient="linear(135deg, #e3f2ff, #f7ecff)"
            _dark={{ bgGradient: "linear(135deg, rgba(65, 88, 208, 0.25), rgba(200, 80, 192, 0.25))" }}
            px={{ base: 6, md: 16 }}
            py={{ base: 10, md: 16 }}
            boxShadow="2xl"
          >
            <Stack direction={{ base: "column", md: "row" }} gap={10} align="center">
              <Flex flex="1" direction="column" textAlign={{ base: "center", md: "left" }} gap={6}>
                <Heading size="3xl" fontWeight="extrabold" lineHeight="1.1">
                  VIS Camera Games
                </Heading>
                <Text fontSize="lg" color="gray.700" _dark={{ color: "gray.200" }}>
                  Train your reflexes, challenge your accuracy, and explore cooperative gesture recognition.
                  Jump into the latest interactive experiences crafted for teams and creators.
                </Text>
                <Button
                  size="lg"
                  colorScheme="purple"
                  onClick={() => navigate("/play")}
                  alignSelf={{ base: "center", md: "flex-start" }}
                >
                  <HStack gap={2}>
                    <Text as="span">Start Playing</Text>
                    <Icon as={FiPlayCircle} boxSize={5} />
                  </HStack>
                </Button>
              </Flex>
              <Flex
                flex="0.9"
                w="full"
                justify="center"
                align="center"
                position="relative"
                py={{ base: 4, md: 0 }}
              >
                <Box
                  w="full"
                  maxW="380px"
                  h="260px"
                  bgGradient="linear(to-br, purple.500, blue.400)"
                  borderRadius="2xl"
                  position="relative"
                  overflow="hidden"
                  boxShadow="xl"
                  _after={{
                    content: '""',
                    position: "absolute",
                    inset: "12px",
                    borderRadius: "xl",
                    border: "2px dashed rgba(255,255,255,0.35)"
                  }}
                >
                  <Box
                    position="absolute"
                    inset="0"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    color="white"
                    fontSize="5xl"
                  >
                    ✋🤝👏
                  </Box>
                </Box>
              </Flex>
            </Stack>
          </Box>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={8}>
            <FeatureCard
              icon={FiActivity}
              title="Challenge Mode"
              description="Race the clock with rapid-fire hand prompts designed to stretch your speed and accuracy."
              bg="white"
            />
            <FeatureCard
              icon={FiCamera}
              title="Live Game Arena"
              description="Sync up with a teammate, earn coins, and cooperate through gestures, claps, and high-fives."
              bg="white"
            />
            <FeatureCard
              icon={FiPlayCircle}
              title="Ready in Seconds"
              description="Just allow camera access and you are in. No installs needed, optimized for quick sessions."
              bg="white"
            />
          </SimpleGrid>
        </VStack>
      </Container>
      <MusicButton></MusicButton>
    </Box>
  );
};

interface FeatureCardProps {
  icon: ElementType;
  title: string;
  description: string;
  bg: string;
}

const FeatureCard = ({ icon, title, description, bg }: FeatureCardProps) => (
  <Box
    bg={bg}
    _dark={{ bg: "rgba(20, 24, 36, 0.75)" }}
    p={8}
    borderRadius="xl"
    boxShadow="md"
    h="100%"
    transition="transform 0.2s ease"
    _hover={{ transform: "translateY(-6px)" }}
  >
    <HStack gap={4} mb={4}>
      <Flex
        w={12}
        h={12}
        borderRadius="full"
        align="center"
        justify="center"
        bg="purple.500"
        color="white"
        fontSize="2xl"
      >
        <Icon as={icon} />
      </Flex>
      <Heading size="md">{title}</Heading>
    </HStack>
    <Text color="gray.600" _dark={{ color: "gray.300" }}>
      {description}
    </Text>
     
  </Box>
  
);

//         {/* Game Selection */}
//         <VStack gap={6} py={8}>
//           <Heading size="2xl" textAlign="center" mb={4}>
//             Choose Your Game
//           </Heading>

//           <Center gap={4}>
//             {buttons.map((btn, idx) => (
//               <Button
//                 key={btn.path}
//                 size="lg"
//                 colorScheme={btn.finger === 1 ? "blue" : "green"}
//                 onClick={() => navigate(btn.path)}
//                 px={16}
//                 py={10}
//                 fontSize="2xl"
//                 _hover={{ transform: "scale(1.05)" }}
//                 transform={selectedIndex === idx ? "scale(1.1)" : "scale(1)"}
//                 boxShadow={
//                   selectedIndex === idx
//                     ? "0 0 12px rgba(0,0,0,0.5)"
//                     : "none"
//                 }
//                 transition="all 0.2s"
//               >
//                 {btn.label}
//               </Button>
//             ))}
//           </Center>
//         </VStack>
//       </VStack>
//     </Container>
//   );
// };

export default Home;
