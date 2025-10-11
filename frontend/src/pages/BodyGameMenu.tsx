import GameMenu from "../components/GameMenu";
import { getGameSinglePlayerLeaderboard, getGameMultiPlayerLeaderboard } from "../leaderboardApi";

const BodyGameMenu = () => {
  const fetchLeaderboards = async () => {
    const [singlePlayer, multiPlayer] = await Promise.all([
      getGameSinglePlayerLeaderboard("body"),
      getGameMultiPlayerLeaderboard("body"),
    ]);

    return { singlePlayer, multiPlayer };
  };

  return (
    <GameMenu
      gameTitle="Body Game"
      gameIcon="🏃"
      singlePlayerRoute="/game-2"
      fetchLeaderboards={fetchLeaderboards}
    />
  );
};

export default BodyGameMenu;
