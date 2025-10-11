import json
import threading
from pathlib import Path
from datetime import datetime

import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from models import LeaderboardEntry, ScoreSubmission

# File paths for persistent storage
LEADERBOARD_DIR = Path("data")
SINGLE_PLAYER_FILE = LEADERBOARD_DIR / "single_player.json"
MULTI_PLAYER_FILE = LEADERBOARD_DIR / "multi_player.json"

# Lock for thread-safe file operations
file_lock = threading.Lock()

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")

# CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def initialize_storage():
    """Create data directory and initialize leaderboard files if they don't exist."""
    LEADERBOARD_DIR.mkdir(exist_ok=True)
    
    if not SINGLE_PLAYER_FILE.exists():
        SINGLE_PLAYER_FILE.write_text("[]")
    
    if not MULTI_PLAYER_FILE.exists():
        MULTI_PLAYER_FILE.write_text("[]")


def load_leaderboard(file_path: Path) -> list[LeaderboardEntry]:
    """Load leaderboard from file with thread safety."""
    with file_lock:
        try:
            data = json.loads(file_path.read_text())
            return [LeaderboardEntry(**entry) for entry in data]
        except Exception:
            return []


def save_leaderboard(file_path: Path, entries: list[LeaderboardEntry]):
    """Save leaderboard to file with thread safety."""
    with file_lock:
        data = [entry.model_dump(mode="json") for entry in entries]
        file_path.write_text(json.dumps(data, indent=2))


def update_leaderboard(
    file_path: Path, 
    new_entry: LeaderboardEntry, 
    max_entries: int = 10
) -> list[LeaderboardEntry]:
    """
    Update leaderboard with new entry, maintaining top scores.
    Returns updated leaderboard with ranks.
    """
    entries = load_leaderboard(file_path)
    
    # Check if player/team already exists
    existing_index = next(
        (i for i, e in enumerate(entries) if e.name == new_entry.name), 
        None
    )
    
    if existing_index is not None:
        # Update only if new score is better
        if new_entry.score > entries[existing_index].score:
            entries[existing_index] = new_entry
    else:
        # Add new entry
        entries.append(new_entry)
    
    # Sort by score (descending), then by symbols (descending)
    entries.sort(key=lambda x: (x.score, x.symbols), reverse=True)
    
    # Keep only top entries
    entries = entries[:max_entries]
    
    # Save updated leaderboard
    save_leaderboard(file_path, entries)
    
    return entries


@app.on_event("startup")
async def startup_event():
    """Initialize storage on startup."""
    initialize_storage()
    print("✅ Leaderboard backend initialized")


@app.get("/api/leaderboard/single", response_model=list[dict])
def get_single_player_leaderboard():
    """Get single player leaderboard with ranks."""
    entries = load_leaderboard(SINGLE_PLAYER_FILE)
    return [
        {
            "rank": idx + 1,
            "name": entry.name,
            "score": entry.score,
            "symbols": entry.symbols,
        }
        for idx, entry in enumerate(entries)
    ]


@app.get("/api/leaderboard/multi", response_model=list[dict])
def get_multi_player_leaderboard():
    """Get multi player leaderboard with ranks."""
    entries = load_leaderboard(MULTI_PLAYER_FILE)
    return [
        {
            "rank": idx + 1,
            "team": entry.name,
            "score": entry.score,
            "symbols": entry.symbols,
        }
        for idx, entry in enumerate(entries)
    ]


@app.post("/api/score/submit", status_code=status.HTTP_201_CREATED)
def submit_score(submission: ScoreSubmission):
    """
    Submit a new score for either single or multi player mode.
    Returns the updated leaderboard.
    """
    if submission.game_mode not in ["single", "multi"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="game_mode must be 'single' or 'multi'"
        )
    
    if submission.score < 0 or submission.symbols < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Score and symbols must be non-negative"
        )
    
    # Create leaderboard entry
    entry = LeaderboardEntry(
        name=submission.name,
        score=submission.score,
        symbols=submission.symbols,
        timestamp=datetime.now()
    )
    
    # Update appropriate leaderboard
    file_path = SINGLE_PLAYER_FILE if submission.game_mode == "single" else MULTI_PLAYER_FILE
    updated_entries = update_leaderboard(file_path, entry)
    
    # Return updated leaderboard with rank info
    name_key = "name" if submission.game_mode == "single" else "team"
    return {
        "success": True,
        "leaderboard": [
            {
                "rank": idx + 1,
                name_key: e.name,
                "score": e.score,
                "symbols": e.symbols,
            }
            for idx, e in enumerate(updated_entries)
        ]
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "VIS Minigame Leaderboard"}


if __name__ == "__main__":
    print("🚀 Starting VIS Minigame Leaderboard Backend")
    uvicorn.run(
        "__main__:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )

