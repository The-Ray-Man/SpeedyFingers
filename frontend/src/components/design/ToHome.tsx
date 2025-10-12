import { Box, Button } from "@chakra-ui/react"
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

type HomeButtonProps = {
  holdProgress?: number; // 0..1 progress for slide fill
};

const HomeButton = ({ holdProgress = 0 }: HomeButtonProps) => {
  const navigate = useNavigate();
  const borderColor = "rgba(110, 90, 255, 0.9)";
  const subtleBg = "rgba(110, 90, 255, 0.10)";

  return (
    <Box
      borderRadius="full"
      overflow="hidden"
      display="inline-block"
      boxShadow="sm"
    >
      {/* Sliding fill background */}
      
      <Button 
        onClick={() => navigate('/')}
        variant="outline"
        color="white"
        borderColor={borderColor}
        bg={subtleBg}
        size="md"
        borderRadius="full"
        px={6}
        py={2.5}
        fontWeight="semibold"
        fontSize="sm"
        _hover={{ 
          transform: "translateY(-2px)"
        }}
        _active={{
          transform: "translateY(0px)"
        }}
        transition="all 0.2s ease-in-out"
        display="flex"
        alignItems="center"
        gap={2}
        position="relative"
        zIndex={1}
        _dark={{
          color: "white",
          borderColor: "rgba(210, 230, 255, 0.75)",
          bg: "rgba(110, 90, 255, 0.18)"
        }}
      >
        <Box
        position="absolute"
        opacity={0.5}
        top={0}
        left={0}
        height="100%"
        width={`${Math.max(0, Math.min(1, holdProgress)) * 100}%`}
        bg="linear-gradient(90deg, #6E5AFF 0%, #9B6BFF 50%, #24B7FF 100%)"
        transition="width 0.24s cubic-bezier(0.22,1,0.36,1)"
        zIndex={0}
        pointerEvents="none"
      />
        <FaHome size={16} />
        Home
      </Button>
    </Box>
  );
}

export default HomeButton;