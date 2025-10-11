import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Tutorial from "@/pages/Tutorial";
import FingerGame from "@/pages/FingerGame";
import BodyGame from "./pages/BodyGame";
import FingerGameMenu from "./pages/FingerGameMenu";
import BodyGameMenu from "./pages/BodyGameMenu";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fingerGameMenu" element={<FingerGameMenu />} />
        <Route path="/bodyGameMenu" element={<BodyGameMenu />} />
        <Route path="/tutorial" element={<Tutorial />} />
        <Route path="/game-1" element={<FingerGame />} />
        <Route path="/game-2" element={<BodyGame />} />
      </Routes>
    </Router>
  );
};

export default App;
