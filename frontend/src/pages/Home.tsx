import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  Center,
} from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="5xl" mb={2}>
            VIS Minigame Challenge
          </Heading>
        </Box>

        {/* Game Selection */}
        <VStack gap={6} py={8}>
          <Heading size="2xl" textAlign="center" mb={4}>
            Choose Your Game
          </Heading>
          
          <Center>
            <Button
              size="lg"
              colorScheme="blue"
              onClick={() => navigate('/fingerGameMenu')}
              px={16}
              py={10}
             
              fontSize="2xl"
              _hover={{ transform: "scale(1.05)" }}
              transition="transform 0.2s"
            >
              👆 Finger Game
            </Button>
          </Center>

          <Center>
            <Button
              size="lg"
              colorScheme="green"
              onClick={() => navigate('/bodyGameMenu')}
              px={16}
              py={10}
             
              fontSize="2xl"
              _hover={{ transform: "scale(1.05)" }}
              transition="transform 0.2s"
            >
              🏃 Body Game
            </Button>
          </Center>
        </VStack>

      </VStack>
    </Container>
  );
};

export default Home;