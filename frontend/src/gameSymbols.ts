/**
 * LaTeX symbols that can be recreated with hand gestures
 * Each symbol has a LaTeX representation and a difficulty level
 */

export type GameSymbol = {
  latex: string;
  display: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
};

export const GAME_SYMBOLS: GameSymbol[] = [
  // Easy symbols - Basic shapes and gestures
  {
    latex: "\\lambda",
    display: "✌️",
    difficulty: "easy",
    description: "Peace sign (index & middle fingers up)",
  },
  {
    latex: "\\Delta",
    display: "🤚",
    difficulty: "easy",
    description: "All fingers extended together (raised back of hand)",
  },
  {
    latex: "\\Sigma",
    display: "🖐️",
    difficulty: "easy",
    description: "Open hand (all fingers spread)",
  },
  {
    latex: "\\Pi",
    display: "🤟",
    difficulty: "easy",
    description: "Thumb, index & middle up (I love you sign)",
  },
  
  // Medium symbols - More complex hand positions
  {
    latex: "\\Omega",
    display: "👌",
    difficulty: "medium",
    description: "OK sign (thumb & index touching, others up)",
  },
  {
    latex: "\\Phi",
    display: "✊",
    difficulty: "medium",
    description: "Fist (all fingers closed)",
  },
  {
    latex: "\\Psi",
    display: "🤘",
    difficulty: "medium",
    description: "Three fingers up (index, middle, ring)",
  },
  {
    latex: "\\alpha",
    display: "👍",
    difficulty: "medium",
    description: "Thumbs up",
  },
  
  // Hard symbols - Complex poses
  {
    latex: "\\theta",
    display: "☝️",
    difficulty: "hard",
    description: "Pointing finger (only index up)",
  },
  {
    latex: "\\beta",
    display: "🤙",
    difficulty: "hard",
    description: "Pinky up (shaka/hang loose)",
  },
];

/**
 * Get a random symbol from the pool
 */
export function getRandomSymbol(): GameSymbol {
  const index = Math.floor(Math.random() * GAME_SYMBOLS.length);
  return GAME_SYMBOLS[index];
}

/**
 * Get symbols filtered by difficulty
 */
export function getSymbolsByDifficulty(difficulty: "easy" | "medium" | "hard"): GameSymbol[] {
  return GAME_SYMBOLS.filter((s) => s.difficulty === difficulty);
}

/**
 * Calculate points based on similarity and difficulty
 */
export function calculatePoints(similarity: number, difficulty: "easy" | "medium" | "hard"): number {
  const basePoints = {
    easy: 100,
    medium: 200,
    hard: 300,
  };
  
  return Math.round(basePoints[difficulty] * similarity);
}
