import { Button, Icon, Text } from "@chakra-ui/react";
import { FiVolume2, FiVolumeX } from "react-icons/fi";
import { useMusic } from "../../context/MusicContext";

interface MusicButtonProps {
  selectMusicBtn?: boolean;
}

const MusicButton: React.FC<MusicButtonProps> = ({ selectMusicBtn = false }) => {
  const { isPlaying, toggle } = useMusic();
  
  // Color configuration - change this hex code to customize the button color
  const buttonColor = "#6d5ad8ff"; // Violet color

  return (
    <Button
      zIndex={1000}
      variant={isPlaying ? "solid" : "outline"}
      size="lg"
      onClick={toggle}
      title={isPlaying ? "Pause Music" : "Play Music"}
      px={6}
      borderRadius="full"
      bg={isPlaying ? buttonColor : "transparent"}
      borderColor={buttonColor}
      color={isPlaying ? "white" : buttonColor}
      _hover={{
        bg: isPlaying ? buttonColor : `${buttonColor}20`,
        transform: "translateY(-2px)",
        boxShadow: `0 4px 12px ${buttonColor}40`
      }}
      transition="all 0.2s ease"
      transform={selectMusicBtn ? "scale(1.06)" : undefined}
      boxShadow={selectMusicBtn ? `0 0 12px ${buttonColor}60` : undefined}
    >
      <Icon 
        fontSize="xl"
        transition="all 0.3s ease"
        animation={isPlaying ? "pulse 2s infinite" : "none"}
      >
        {isPlaying ? <FiVolume2 /> : <FiVolumeX />}
      </Icon>
      <Text ml={2} fontWeight="600">
        {isPlaying ? "Playing" : "Paused"}
      </Text>
    </Button>
  );
};

export default MusicButton;