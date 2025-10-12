import { Button } from "@chakra-ui/react"
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

const HomeButton = () => {
  const navigate = useNavigate();

  return (
    <Button 
      onClick={() => navigate('/')}
      variant="outline"
      borderColor="#7451AA"
      color="#7451AA"
      size="lg"
      borderRadius="full"
      borderWidth="2px"
      px={8}
      py={6}
      fontWeight="bold"
      fontSize="md"
      mb={4}
      _hover={{ 
        transform: "translateY(-2px)",
        shadow: "lg",
        bg: "#F5F4FF",
        borderColor: "#5B57B3"
      }}
      _active={{
        transform: "translateY(0)",
        shadow: "md"
      }}
      transition="all 0.2s ease-in-out"
      boxShadow="md"
      display="flex"
      alignItems="center"
      gap={2}
    >
      <FaHome />
      Home
    </Button>
  );
}

export default HomeButton;