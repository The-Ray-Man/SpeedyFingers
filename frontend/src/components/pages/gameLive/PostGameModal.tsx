export const POST_GAME_TIMEOUT_MS = 30_000;

export type PostGameState = {
  winnerId: number;
  score: number;
  symbols: number;
  remainingMs: number;
  submitting: boolean;
  error?: string;
};

interface PostGameModalProps {
  state: PostGameState;
  username: string | null;
  onSubmit: () => void;
  onSkip: () => void;
}

const PostGameModal = ({ state, username, onSubmit, onSkip }: PostGameModalProps) => (
  <div className="post-game-modal">
    <div className="post-game-card">
      <div>
        <h3 style={{ fontSize: "1.6rem", margin: 0, color: "#f5f7fb" }}>
          Victory! Player {state.winnerId}
        </h3>
        <p style={{ margin: "0.35rem 0 0", color: "rgba(220, 230, 255, 0.8)" }}>
          Score: {state.score} · Bonus coins: {state.symbols}
        </p>
      </div>

      <div className="post-game-progress">
        <div
          className="post-game-progress-bar"
          style={{ transform: `scaleX(${Math.max(0, 1 - state.remainingMs / POST_GAME_TIMEOUT_MS)})` }}
        />
      </div>
      <p style={{ color: "rgba(255, 205, 205, 0.85)", fontSize: "0.9rem", margin: 0 }}>
        Auto-return in {(state.remainingMs / 1000).toFixed(1)}s · show 👎👎 each to return now
      </p>

      <p style={{ fontSize: "0.95rem", color: "rgba(235, 245, 255, 0.85)", margin: 0 }}>
        {username ? `Submitting as ${username}` : "Log in to submit your score"}
      </p>

      {state.error && <p style={{ color: "#ff9a9a", margin: 0 }}>{state.error}</p>}

      <div className="post-game-actions">
        <button type="button" disabled={state.submitting || !username} onClick={onSubmit}>
          {state.submitting ? "Submitting…" : "Submit to Leaderboard"}
        </button>
        <button type="button" onClick={onSkip}>
          Skip & Return
        </button>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: "0.6rem", fontSize: "0.85rem", color: "rgba(200, 220, 255, 0.75)" }}>
        To play again, each give a 👍👍
      </div>
    </div>
  </div>
);

export default PostGameModal;
