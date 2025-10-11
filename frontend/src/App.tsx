import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Index from "@/pages/index";
import Tutorial from "@/pages/Tutorial";
import FingerGame from "@/pages/Game_single_player";
import BodyGame from "./pages/Game";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/home" element={<Home />} />
        <Route path="/tutorial" element={<Tutorial />} />
        <Route path="/game-1" element={<FingerGame />} />
        <Route path="/game-2" element={<BodyGame />} />
      </Routes>
    </Router>
  );
};

export default App;
