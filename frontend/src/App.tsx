import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import TutorialFinger from "@/pages/TutorialFinger";
import TutorialBody from "@/pages/TutorialBody";
import FingerGame from "@/pages/FingerGame";
import BodyGame from "./pages/BodyGame";
import FingerGameMenu from "./pages/FingerGameMenu";
import BodyGameMenu from "./pages/BodyGameMenu";
import { MusicProvider } from "./context/MusicContext";

const App = () => {
  return (
    <MusicProvider autoPlay={false} defaultVolume={0.5}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fingerGameMenu" element={<FingerGameMenu />} />
          <Route path="/bodyGameMenu" element={<BodyGameMenu />} />
          <Route path="/tutorialFinger" element={<TutorialFinger />} />
          <Route path="/tutorialBody" element={<TutorialBody />} />
          <Route path="/game-1" element={<FingerGame />} />
          <Route path="/game-2" element={<BodyGame />} />
        </Routes>
      </Router>
    </MusicProvider>
  );
};

export default App;