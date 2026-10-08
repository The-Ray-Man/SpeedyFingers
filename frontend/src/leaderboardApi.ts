/**
 * API Client for VIS Minigame Leaderboard Backend
 * 
 * Usage:
 * import { submitScore, getGameSinglePlayerLeaderboard, getGameMultiPlayerLeaderboard } from './leaderboardApi';
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export type LeaderboardEntry = {
  rank: number;
  name?: string;
  team?: string;
  score: number;
  symbols: number;
};

// The player is identified by the backend from the trusted proxy headers
export type ScoreSubmission = {
  score: number;
  symbols: number;
  gameMode: "single" | "multi";
  gameType?: "finger" | "body";
};

/**
 * Submit a score to the leaderboard
 * @param submission Score submission data
 * @returns Updated leaderboard
 */
export async function submitScore(submission: ScoreSubmission): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${API_BASE_URL}/score/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      score: submission.score,
      symbols: submission.symbols,
      game_mode: submission.gameMode,
      game_type: submission.gameType || "finger",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit score: ${response.statusText}`);
  }

  const result = await response.json();
  return result.leaderboard;
}

/**
 * Get the single player leaderboard for a specific game type
 * @param gameType Type of game ("finger" or "body")
 * @returns Array of single player leaderboard entries
 */
export async function getGameSinglePlayerLeaderboard(gameType: "finger" | "body"): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${API_BASE_URL}/leaderboard/${gameType}/single`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${gameType} single player leaderboard: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get the multi player leaderboard for a specific game type
 * @param gameType Type of game ("finger" or "body")
 * @returns Array of multi player leaderboard entries
 */
export async function getGameMultiPlayerLeaderboard(gameType: "finger" | "body"): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${API_BASE_URL}/leaderboard/${gameType}/multi`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${gameType} multi player leaderboard: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Health check for the backend
 * @returns True if backend is healthy
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return data.status === "healthy";
  } catch {
    return false;
  }
}
