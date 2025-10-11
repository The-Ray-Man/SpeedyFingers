import json
import threading
import uuid
from pathlib import Path
from datetime import datetime

import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from models import (
    LeaderboardEntry, 
    ScoreSubmission,
    GestureDefinition,
    GestureVariant,
    GestureSubmission,
    MatchRequest,
    MatchResponse,
)

# File paths for persistent storage
LEADERBOARD_DIR = Path("data")
FINGER_SINGLE_PLAYER_FILE = LEADERBOARD_DIR / "finger_single_player.json"
FINGER_MULTI_PLAYER_FILE = LEADERBOARD_DIR / "finger_multi_player.json"
BODY_SINGLE_PLAYER_FILE = LEADERBOARD_DIR / "body_single_player.json"
BODY_MULTI_PLAYER_FILE = LEADERBOARD_DIR / "body_multi_player.json"
GESTURES_FILE = LEADERBOARD_DIR / "gestures.json"  # New gesture storage

# Legacy file paths (for backward compatibility)
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
    
    # Initialize all leaderboard files
    for file_path in [
        FINGER_SINGLE_PLAYER_FILE,
        FINGER_MULTI_PLAYER_FILE,
        BODY_SINGLE_PLAYER_FILE,
        BODY_MULTI_PLAYER_FILE,
        SINGLE_PLAYER_FILE,
        MULTI_PLAYER_FILE,
    ]:
        if not file_path.exists():
            file_path.write_text("[]")
    
    # Initialize gestures file
    if not GESTURES_FILE.exists():
        GESTURES_FILE.write_text("{}")


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
    """Get single player leaderboard with ranks (legacy - defaults to finger game)."""
    entries = load_leaderboard(FINGER_SINGLE_PLAYER_FILE)
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
    """Get multi player leaderboard with ranks (legacy - defaults to finger game)."""
    entries = load_leaderboard(FINGER_MULTI_PLAYER_FILE)
    return [
        {
            "rank": idx + 1,
            "team": entry.name,
            "score": entry.score,
            "symbols": entry.symbols,
        }
        for idx, entry in enumerate(entries)
    ]


@app.get("/api/leaderboard/{game_type}/single", response_model=list[dict])
def get_game_single_player_leaderboard(game_type: str):
    """Get single player leaderboard for a specific game type."""
    if game_type == "finger":
        file_path = FINGER_SINGLE_PLAYER_FILE
    elif game_type == "body":
        file_path = BODY_SINGLE_PLAYER_FILE
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="game_type must be 'finger' or 'body'"
        )
    
    entries = load_leaderboard(file_path)
    return [
        {
            "rank": idx + 1,
            "name": entry.name,
            "score": entry.score,
            "symbols": entry.symbols,
        }
        for idx, entry in enumerate(entries)
    ]


@app.get("/api/leaderboard/{game_type}/multi", response_model=list[dict])
def get_game_multi_player_leaderboard(game_type: str):
    """Get multi player leaderboard for a specific game type."""
    if game_type == "finger":
        file_path = FINGER_MULTI_PLAYER_FILE
    elif game_type == "body":
        file_path = BODY_MULTI_PLAYER_FILE
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="game_type must be 'finger' or 'body'"
        )
    
    entries = load_leaderboard(file_path)
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
    
    # Determine game type (default to finger for backward compatibility)
    game_type = getattr(submission, 'game_type', 'finger')
    if game_type not in ["finger", "body"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="game_type must be 'finger' or 'body'"
        )
    
    # Create leaderboard entry
    entry = LeaderboardEntry(
        name=submission.name,
        score=submission.score,
        symbols=submission.symbols,
        timestamp=datetime.now()
    )
    
    # Update appropriate leaderboard based on game type and mode
    if game_type == "finger":
        file_path = FINGER_SINGLE_PLAYER_FILE if submission.game_mode == "single" else FINGER_MULTI_PLAYER_FILE
    else:  # body
        file_path = BODY_SINGLE_PLAYER_FILE if submission.game_mode == "single" else BODY_MULTI_PLAYER_FILE
    
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


# ==================== GESTURE MANAGEMENT ENDPOINTS ====================

def load_gestures() -> dict[str, GestureDefinition]:
    """Load all gestures from file with thread safety."""
    with file_lock:
        try:
            data = json.loads(GESTURES_FILE.read_text())
            result = {}
            for symbol, gesture_data in data.items():
                result[symbol] = GestureDefinition(**gesture_data)
            return result
        except Exception as e:
            print(f"Error loading gestures: {e}")
            return {}


def save_gestures(gestures: dict[str, GestureDefinition]):
    """Save all gestures to file with thread safety."""
    with file_lock:
        data = {symbol: gesture.model_dump(mode="json") for symbol, gesture in gestures.items()}
        GESTURES_FILE.write_text(json.dumps(data, indent=2, default=str))


@app.post("/api/gestures", status_code=status.HTTP_201_CREATED)
def save_gesture(submission: GestureSubmission):
    """
    Save a new gesture variant for a symbol.
    Creates a new symbol entry if it doesn't exist.
    """
    gestures = load_gestures()
    
    # Create new variant with unique ID
    variant = GestureVariant(
        id=str(uuid.uuid4()),
        handCount=submission.handCount,
        landmarks=submission.landmarks,
        activeFingers=submission.activeFingers,
        activeRegions=submission.activeRegions,
        createdAt=datetime.now(),
        metadata=submission.metadata,
    )
    
    # Add to existing symbol or create new one
    if submission.symbol in gestures:
        gestures[submission.symbol].variants.append(variant)
    else:
        gestures[submission.symbol] = GestureDefinition(
            symbol=submission.symbol,
            variants=[variant]
        )
    
    save_gestures(gestures)
    
    return {
        "success": True,
        "symbol": submission.symbol,
        "variantId": variant.id,
        "totalVariants": len(gestures[submission.symbol].variants)
    }


@app.get("/api/gestures")
def get_all_gestures():
    """Get a list of all known symbols and their variant counts."""
    gestures = load_gestures()
    return {
        "symbols": [
            {
                "symbol": symbol,
                "variantCount": len(definition.variants),
                "lastUpdated": max(v.createdAt for v in definition.variants) if definition.variants else None
            }
            for symbol, definition in gestures.items()
        ]
    }


@app.get("/api/gestures/{symbol}")
def get_gesture_by_symbol(symbol: str):
    """Get all gesture variants for a specific symbol."""
    gestures = load_gestures()
    
    if symbol not in gestures:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No gestures found for symbol: {symbol}"
        )
    
    return gestures[symbol].model_dump(mode="json")


@app.get("/api/gestures/random/get")
def get_random_gesture():
    """Get a random symbol and all its gesture variants."""
    import random
    
    gestures = load_gestures()
    
    if not gestures:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No gestures available. Please record some gestures first."
        )
    
    # Select random symbol
    symbol = random.choice(list(gestures.keys()))
    return {
        "symbol": symbol,
        "definition": gestures[symbol].model_dump(mode="json")
    }


@app.post("/api/gestures/match")
def match_gesture(request: MatchRequest):
    """
    Compare submitted landmarks with stored gesture variants.
    Returns the best similarity score and matched variant.
    """
    gestures = load_gestures()
    
    if request.symbol not in gestures:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No gestures found for symbol: {request.symbol}"
        )
    
    # Import the comparison logic from ai.py
    from ai import compare_hand_poses
    
    best_similarity = 0.0
    best_variant_id = None
    
    # Compare against all variants
    for variant in gestures[request.symbol].variants:
        similarity = compare_hand_poses(request.landmarks, variant.landmarks)
        if similarity > best_similarity:
            best_similarity = similarity
            best_variant_id = variant.id
    
    return MatchResponse(
        similarity=best_similarity,
        variantId=best_variant_id or "",
        confidence=best_similarity
    )


@app.delete("/api/gestures/{symbol}/{variant_id}")
def delete_gesture_variant(symbol: str, variant_id: str):
    """Delete a specific gesture variant."""
    gestures = load_gestures()
    
    if symbol not in gestures:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No gestures found for symbol: {symbol}"
        )
    
    # Find and remove the variant
    variants = gestures[symbol].variants
    initial_count = len(variants)
    gestures[symbol].variants = [v for v in variants if v.id != variant_id]
    
    if len(gestures[symbol].variants) == initial_count:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Variant {variant_id} not found for symbol {symbol}"
        )
    
    # Remove symbol entirely if no variants left
    if not gestures[symbol].variants:
        del gestures[symbol]
    
    save_gestures(gestures)
    
    return {"success": True, "message": "Variant deleted successfully"}


if __name__ == "__main__":
    print("🚀 Starting VIS Minigame Leaderboard Backend")
    uvicorn.run(
        "__main__:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )

