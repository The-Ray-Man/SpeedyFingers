import { Button } from "@chakra-ui/react"
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

const HomeButton = () => {
  const navigate = useNavigate();
  const buttonColor = "#2914a0ff"; // Customize this color

  return (
    <Button 
      onClick={() => navigate('/')}
      variant="outline"
      color={buttonColor}
      borderColor={buttonColor}
      size="md"
      borderRadius="full"
      px={6}
      py={2.5}
      fontWeight="semibold"
      fontSize="sm"
      _hover={{ 
        bg: `${buttonColor}15`,
        transform: "translateY(-2px)"
      }}
      _active={{
        transform: "translateY(0px)"
      }}
      transition="all 0.2s ease-in-out"
      display="flex"
      alignItems="center"
      gap={2}
      position="absolute"
      top={8}
      left={8}
    >
      <FaHome size={16} />
      Home
    </Button>
  );
}

export default HomeButton;