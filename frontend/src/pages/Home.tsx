import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  Text,
  SimpleGrid,
  Flex,
  HStack,
  Icon
} from "@chakra-ui/react";
import { FiPlayCircle, FiSettings } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import MusicButton from "../components/design/MusicButton.tsx";

const Home = () => {
  const navigate = useNavigate();
  return (
    <Box
      height="100vh"
      bg="gray.50"
      overflowY="auto"
      _dark={{ bg: "rgba(18, 22, 32, 0.75)" }}
    >
      <div style={{ position: "absolute", bottom: "1rem", right: "1rem" }}>
          <MusicButton />
        </div>
      <Container maxW="6xl" py={{ base: 12, md: 16 }}>
        <VStack gap={16} align="stretch">
          {/* Header Section */}
          <Box textAlign="center">
            <Heading size="6xl" fontWeight="extrabold" lineHeight="1.1" mb={4}>
              Speedy Fingers
            </Heading>
            <Text fontSize="lg" color="gray.700" _dark={{ color: "gray.200" }} maxW="3xl" mx="auto">
              Train your reflexes, challenge your accuracy, and explore competitive gesture games.
            </Text>
          </Box>

          {/* Main Mode Cards */}
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={8}>
            {/* Play Mode Card */}
            <Box
              borderRadius="2xl"
              bgGradient="linear(135deg, #e3f2ff, #f7ecff)"
              _dark={{ bgGradient: "linear(135deg, rgba(65, 88, 208, 0.25), rgba(200, 80, 192, 0.25))" }}
              p={{ base: 8, md: 10 }}
              boxShadow="2xl"
              transition="transform 0.2s ease"
              _hover={{ transform: "translateY(-6px)" }}
              cursor="pointer"
              onClick={() => navigate("/play")}
            >
              <VStack gap={6} align="stretch" h="full">
                <Flex
                  w="full"
                  justify="center"
                  align="center"
                  position="relative"
                >
                  <Box
                    w="full"
                    maxW="280px"
                    h="200px"
                    bgGradient="linear(to-br, purple.500, blue.400)"
                    borderRadius="xl"
                    position="relative"
                    overflow="hidden"
                    boxShadow="lg"
                    _after={{
                      content: '""',
                      position: "absolute",
                      inset: "12px",
                      borderRadius: "lg",
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
                
                <VStack gap={4} align="stretch" flex={1}>
                  <Heading size="xl" textAlign="center">
                    Play Mode
                  </Heading>
                  <Text fontSize="md" color="gray.700" _dark={{ color: "gray.200" }} textAlign="center">
                    Jump into exciting gesture-based games. Compete with a friend in a competitive and chaotic 1 vs. 1 game.
                  </Text>
                  <Button
                    size="lg"
                    colorScheme="purple"
                    onClick={() => navigate("/play")}
                    mt="auto"
                  >
                    <HStack gap={2}>
                      <Text as="span">Start Playing</Text>
                      <Icon as={FiPlayCircle} boxSize={5} />
                    </HStack>
                  </Button>
                </VStack>
              </VStack>
            </Box>

            {/* Dev Mode Card */}
            <Box
              borderRadius="2xl"
              bgGradient="linear(135deg, #fff3e3, #ffe9f7)"
              _dark={{ bgGradient: "linear(135deg, rgba(208, 120, 65, 0.25), rgba(192, 80, 160, 0.25))" }}
              p={{ base: 8, md: 10 }}
              boxShadow="2xl"
              transition="transform 0.2s ease"
              _hover={{ transform: "translateY(-6px)" }}
              cursor="pointer"
              onClick={() => navigate("/dev-mode")}
            >
              <VStack gap={6} align="stretch" h="full">
                <Flex
                  w="full"
                  justify="center"
                  align="center"
                  position="relative"
                >
                  <Box
                    w="full"
                    maxW="280px"
                    h="200px"
                    bgGradient="linear(to-br, orange.500, pink.400)"
                    borderRadius="xl"
                    position="relative"
                    overflow="hidden"
                    boxShadow="lg"
                    _after={{
                      content: '""',
                      position: "absolute",
                      inset: "12px",
                      borderRadius: "lg",
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
                      ⚙️🔧
                    </Box>
                  </Box>
                </Flex>
                
                <VStack gap={4} align="stretch" flex={1}>
                  <Heading size="xl" textAlign="center">
                    Dev Mode
                  </Heading>
                  <Text fontSize="md" color="gray.700" _dark={{ color: "gray.200" }} textAlign="center">
                    Create and train custom gestures. Build your own gesture library, add training captures, and fine-tune recognition thresholds.
                  </Text>
                  <Button
                    size="lg"
                    colorScheme="orange"
                    onClick={() => navigate("/dev-mode")}
                    mt="auto"
                  >
                    <HStack gap={2}>
                      <Text as="span">Enter Dev Mode</Text>
                      <Icon as={FiSettings} boxSize={5} />
                    </HStack>
                  </Button>
                </VStack>
              </VStack>
            </Box>
          </SimpleGrid>
        </VStack>
      </Container>
      
    </Box>
  );
};

export default Home;
