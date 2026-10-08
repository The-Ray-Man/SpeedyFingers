import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import TutorialFinger from "@/pages/TutorialFinger";
import FingerGame from "@/pages/FingerGame";
import FingerGameMenu from "./pages/FingerGameMenu";
import { MusicProvider } from "./context/MusicContext";
import { RewardSoundProvider } from "./context/rewardSoundContext";
import DevMode from "./pages/DevMode";
import { GestureProvider } from "./context/GestureContext";
import GameLive from "@/components/pages/gameLive/GameLive";
import PlayOptions from "@/pages/PlayOptions";
import Tutorial from "./pages/Tutorial.tsx";

const App = () => (
  <MusicProvider autoPlay={true} defaultVolume={0.5}>
    <RewardSoundProvider>
      <GestureProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/play" element={<PlayOptions />} />
            <Route path="/fingerGameMenu" element={<FingerGameMenu />} />
            <Route path="/tutorialFinger" element={<TutorialFinger />} />
            <Route path="/game-1" element={<FingerGame />} />
            <Route path="/live_game" element={<GameLive />} />
            <Route path="/dev-mode" element={<DevMode />} />
            <Route path="/tutorial" element={<Tutorial />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </GestureProvider>
    </RewardSoundProvider>
  </MusicProvider>
);

export default App;
