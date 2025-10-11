import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import TutorialFinger from "@/pages/TutorialFinger";
import TutorialBody from "@/pages/TutorialBody";
import FingerGame from "@/pages/FingerGame";
import BodyGame from "./pages/BodyGame";
import FingerGameMenu from "./pages/FingerGameMenu";
import BodyGameMenu from "./pages/BodyGameMenu";
import { MusicProvider } from "./context/MusicContext";
import FooterBar from "./footerBar"; // ✅ make sure the path is correct

const App = () => {
  return (
    <MusicProvider autoPlay={true} defaultVolume={0.5}>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/fingerGameMenu" element={<FingerGameMenu />} />
            <Route path="/bodyGameMenu" element={<BodyGameMenu />} />
            <Route path="/tutorialFinger" element={<TutorialFinger />} />
            <Route path="/tutorialBody" element={<TutorialBody />} />
            <Route path="/game-1" element={<FingerGame />} />
            <Route path="/game-2" element={<BodyGame />} />
          </Routes>
          <FooterBar />
        </div>
      </Router>
    </MusicProvider>
  );
};

export default App;
