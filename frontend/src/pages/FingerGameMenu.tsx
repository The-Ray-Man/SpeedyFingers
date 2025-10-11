import GameMenu from "../components/GameMenu";
import { getGameSinglePlayerLeaderboard, getGameMultiPlayerLeaderboard } from "../leaderboardApi";

const FingerGameMenu = () => {
  const fetchLeaderboards = async () => {
    const [singlePlayer, multiPlayer] = await Promise.all([
      getGameSinglePlayerLeaderboard("finger"),
      getGameMultiPlayerLeaderboard("finger"),
    ]);

    return { singlePlayer, multiPlayer };
  };

  return (
    <GameMenu
      gameTitle="Finger Game"
      gameIcon="👆"
      singlePlayerRoute="/game-1"
      fetchLeaderboards={fetchLeaderboards}
    />
  );
};

export default FingerGameMenu;
