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
import { GestureProvider } from "./context/GestureContext";
import GameLive from "@/components/pages/GameLive";
import PlayOptions from "@/pages/PlayOptions";
import Tutorial from "./pages/Tutorial.tsx";
{/* 


const RequireUserLayout: React.FC = () => {
  const { user, loading } = useUser();
  const location = useLocation();

  if (loading) return <div>Loading user...</div>;

  if (!user)
    return <Navigate to="/changeuser" replace state={{ from: location.pathname }} />;

  return (
    <>
    <div
      style={{
      height: "calc(100vh - var(--footer-height))",
      width: "100vw",
      overflow: "auto",
      }}
    >
      <Outlet />
    </div>
    <FooterBar />
    </>
  );
}; */}

const App = () => (
  <MusicProvider autoPlay={true} defaultVolume={0.5}>
    <RewardSoundProvider>
      <GestureProvider>
        
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
          <Route path="/dev-mode" element={<DevMode />} />
          <Route path="/tutorial" element={<Tutorial />} />
        </Routes>
      </Router>
   
      </GestureProvider>
    </RewardSoundProvider>
  </MusicProvider>
);


export default App;
