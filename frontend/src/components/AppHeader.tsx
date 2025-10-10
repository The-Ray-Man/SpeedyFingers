import { useEffect, useState } from "react";
import type { User } from "../apiClient";
import { getMe } from "../apiClient";
import "./AppHeader.css";
import Scrolldown from "./Scrolldown";
import Spacer from "./Spacer";

const AppHeader = () => {
  const [now] = useState(new Date());
  const [me, setMe] = useState<User | undefined>();

  async function updateMe() {
    setMe(await getMe());
  }

  useEffect(() => {
    updateMe();
  }, []);

  return (
    <header className="app-header">
      <h1>Welcome to VIScon {now.getFullYear()}</h1>
      <Spacer height={40} />
      <img src="/hexagon.png" className="logo" alt="logo" />
      <Spacer height={60} />
      <p>
        Hello <strong>{me?.name ?? "Hacker"}</strong>!
        <br />
        <br />
        We've provided you with an example app to get you started quickly. Feel
        free to change anything you'd like or discard it completely.{" "}
        <a href="https://github.com/SleepyMorpheus/viscon-hackathon-2025-template">
          Link
        </a>{" "}
        to the GitHub repository.
        <br />
        <br />
        Cheers!
        <br />
        Your Hackathon Team
      </p>
      <Spacer height={40} />
      <Scrolldown />
    </header>
  );
};

export default AppHeader;
