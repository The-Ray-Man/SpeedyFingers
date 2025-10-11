import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import Home from "@/pages/Home";
import TutorialFinger from "@/pages/TutorialFinger";
import TutorialBody from "@/pages/TutorialBody";
import FingerGame from "@/pages/FingerGame";
import BodyGame from "./pages/BodyGame";
import FingerGameMenu from "./pages/FingerGameMenu";
import BodyGameMenu from "./pages/BodyGameMenu";
import { MusicProvider } from "./context/MusicContext";
import FooterBar from "./footerBar"; 

import ChangeUser from "@/pages/ChangeUser";
import { useUser } from "@/context/UserContext";
import DevMode from "./pages/DevMode";

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
};



const App = () => {
  return (
    <MusicProvider autoPlay={true} defaultVolume={0.5}>
      <Router>
        <Routes>
          {/* Public route(s) */}
          <Route path="/changeuser" element={<ChangeUser />} />
          <Route path="/dev-mode" element={<DevMode />} />

          {/* Protected routes under a single guard */}
          <Route element={<RequireUserLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/fingerGameMenu" element={<FingerGameMenu />} />
            <Route path="/bodyGameMenu" element={<BodyGameMenu />} />
            <Route path="/tutorialFinger" element={<TutorialFinger />} />
            <Route path="/tutorialBody" element={<TutorialBody />} />
            <Route path="/game-1" element={<FingerGame />} />
            <Route path="/game-2" element={<BodyGame />} />
          </Route>
        </Routes>
      </Router>
    </MusicProvider>
  );
};

export default App;
