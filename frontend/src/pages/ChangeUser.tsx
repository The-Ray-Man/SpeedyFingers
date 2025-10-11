import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useInputMode } from '@/context/InputModeContext';
import { 
  Box, 
  Container, 
  VStack, 
  Heading, 
  Input, 
  Button, 
  HStack,
  Card,
  Icon,
  Text
} from '@chakra-ui/react';
import { FiUser, FiRefreshCw, FiCheck } from 'react-icons/fi';

const ChangeUser: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, resetUser } = useUser();
  const { setHandMode } = useInputMode();
  console.log("Current user:", user);

  const [username, setUsername] = useState<string>('');

  // Sync username state with user context
  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    }
  }, [user]);

  // Force keyboard/mouse mode on mount for this page
  useEffect(() => {
    setHandMode(false);
  }, [setHandMode]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setUser({ username: trimmed });
    navigate('/');
  };

  const onReset = () => {
    resetUser();
    navigate('/');
  };

  return (
    <Box
      minH="100vh"
      bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={8}
    >
      <Container maxW="md">
        <Card.Root
          bg="rgba(255, 255, 255, 0.95)"
          backdropFilter="blur(10px)"
          boxShadow="0 8px 32px rgba(0, 0, 0, 0.1)"
          borderRadius="2xl"
          p={8}
        >
          <VStack gap={6} align="stretch">
            {/* Header */}
            <VStack gap={2}>
              <Box
                bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                p={4}
                borderRadius="full"
                display="inline-flex"
              >
                <Icon fontSize="3xl" color="white">
                  <FiUser />
                </Icon>
              </Box>
              <Heading size="2xl" textAlign="center" color="gray.800">
                Change User
              </Heading>
              <Text color="gray.600" textAlign="center">
                Enter your username to continue
              </Text>
            </VStack>

            {/* Form */}
            <form onSubmit={onSubmit}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontWeight="semibold" mb={2} color="gray.700">
                    Username
                  </Text>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter a username"
                    size="lg"
                    borderColor="gray.300"
                    _hover={{ borderColor: "purple.400" }}
                    _focus={{ borderColor: "purple.500", boxShadow: "0 0 0 1px var(--chakra-colors-purple-500)" }}
                  />
                </Box>

                <HStack gap={3} pt={2}>
                  <Button
                    type="submit"
                    flex={1}
                    size="lg"
                    bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    color="white"
                    _hover={{
                      transform: "translateY(-2px)",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)"
                    }}
                    transition="all 0.3s ease"
                  >
                    <Icon mr={2}>
                      <FiCheck />
                    </Icon>
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    onClick={onReset}
                    flex={1}
                    size="lg"
                    variant="outline"
                    borderColor="gray.300"
                    color="gray.700"
                    _hover={{
                      bg: "gray.100",
                      transform: "translateY(-2px)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                    }}
                    transition="all 0.3s ease"
                  >
                    <Icon mr={2}>
                      <FiRefreshCw />
                    </Icon>
                    Reset
                  </Button>
                </HStack>
              </VStack>
            </form>
          </VStack>
        </Card.Root>
      </Container>
    </Box>
  );
};

export default ChangeUser;
