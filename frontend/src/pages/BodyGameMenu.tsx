import GameMenu from "../components/GameMenu";
import { getGameSinglePlayerLeaderboard, getGameMultiPlayerLeaderboard } from "../leaderboardApi";
import { 
    Button,
    VStack,
    Icon
} from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import { FiBook } from 'react-icons/fi';

const BodyGameMenu = () => {
  const navigate = useNavigate();

  const fetchLeaderboards = async () => {
    const [singlePlayer, multiPlayer] = await Promise.all([
      getGameSinglePlayerLeaderboard("body"),
      getGameMultiPlayerLeaderboard("body"),
    ]);

    return { singlePlayer, multiPlayer };
  };

  return (

    <VStack>
    <GameMenu
      gameTitle="Body Game"
      gameIcon="🏃"
      singlePlayerRoute="/game-2"
      fetchLeaderboards={fetchLeaderboards}
    />

  <Button 
    size="2xl" 
    onClick={() => navigate('/TutorialBody')}
    colorPalette="purple"
    variant="solid"
    px={8}
    py={6}
    fontSize="xl"
    fontWeight="bold"
    borderRadius="xl"
    boxShadow="lg"
    _hover={{ 
      transform: "scale(1.05)",
      boxShadow: "2xl"
    }}
    transition="all 0.2s"
  > 
    <Icon fontSize="2xl" mr={2}>
      <FiBook />
    </Icon>
    📚 View Tutorial 
  </Button>
</VStack>

                 

   
  );
};

export default BodyGameMenu;
