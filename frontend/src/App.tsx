import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import TutorialFinger from "@/pages/TutorialFinger";
import TutorialBody from "@/pages/TutorialBody";
import FingerGame from "@/pages/FingerGame";
import BodyGame from "./pages/BodyGame";
import FingerGameMenu from "./pages/FingerGameMenu";
import BodyGameMenu from "./pages/BodyGameMenu";
import { MusicProvider } from "./context/MusicContext";
import { RewardSoundProvider } from "./context/rewardSoundContext";
import DevMode from "./pages/DevMode";
import ChangeUser from "@/pages/ChangeUser";
import GameLive from "@/components/pages/GameLive";
import PlayOptions from "@/pages/PlayOptions";

const App = () => (
  <MusicProvider autoPlay={true} defaultVolume={0.5}>
    <RewardSoundProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<PlayOptions />} />
          <Route path="/fingerGameMenu" element={<FingerGameMenu />} />
          <Route path="/bodyGameMenu" element={<BodyGameMenu />} />
          <Route path="/tutorialFinger" element={<TutorialFinger />} />
          <Route path="/tutorialBody" element={<TutorialBody />} />
          <Route path="/game-1" element={<FingerGame />} />
          <Route path="/game-2" element={<BodyGame />} />
          <Route path="/live_game" element={<GameLive />} />
          <Route path="/changeuser" element={<ChangeUser />} />
          <Route path="/dev-mode" element={<DevMode />} />
        </Routes>
      </Router>
    </RewardSoundProvider>
  </MusicProvider>
);

export default App;
