import logging
import random
import uuid
from contextlib import asynccontextmanager
from datetime import datetime

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, status

from models import (
    GameType,
    LeaderboardEntry,
    ScoreSubmission,
    GestureVariant,
    GestureSubmission,
    MatchRequest,
    MatchResponse,
)
from ai import compare_hand_poses
from auth import User, get_current_user, require_trusted_user
import database

# uvicorn only configures its own loggers, so set up the root logger for ours
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize storage on startup."""
    database.init_db()
    logger.info("Leaderboard backend initialized (database: %s)", database.DB_FILE)
    yield


app = FastAPI(
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)


# No CORS middleware: the frontend and API share one origin (Traefik in Docker,
# the Vite proxy in dev), so cross-origin requests are rejected by the browser.


@app.get("/api/leaderboard/{game_type}/single", response_model=list[dict])
def get_game_single_player_leaderboard(game_type: GameType):
    """Get single player leaderboard for a specific game type."""
    entries = database.load_leaderboard(game_type, "single")
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
def get_game_multi_player_leaderboard(game_type: GameType):
    """Get multi player leaderboard for a specific game type."""
    entries = database.load_leaderboard(game_type, "multi")
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
def submit_score(submission: ScoreSubmission, user: User = Depends(get_current_user)):
    """
    Submit a new score for either single or multi player mode.
    Returns the updated leaderboard.
    """
    if submission.score < 0 or submission.symbols < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Score and symbols must be non-negative"
        )

    # Create leaderboard entry
    entry = LeaderboardEntry(
        user_id=user.id,
        name=user.name,
        score=submission.score,
        symbols=submission.symbols,
        timestamp=datetime.now()
    )

    # Update appropriate leaderboard based on game type and mode
    updated_entries = database.update_leaderboard(submission.game_type, submission.game_mode, entry)

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


@app.get("/api/me")
def get_me(user: User = Depends(get_current_user)):
    """Get the current user as identified by the trusted proxy."""
    return {"id": user.id, "name": user.name, "canManageGestures": user.is_trusted}


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "VIS Minigame Leaderboard"}


# ==================== GESTURE MANAGEMENT ENDPOINTS ====================

@app.post("/api/gestures", status_code=status.HTTP_201_CREATED)
def save_gesture(submission: GestureSubmission, _: User = Depends(require_trusted_user)):
    """
    Save a new gesture variant for a symbol.
    Creates a new symbol entry if it doesn't exist.
    """
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

    # Add to existing symbol (updating its threshold if provided) or create new one
    total_variants = database.add_gesture_variant(submission.symbol, variant, submission.threshold)

    return {
        "success": True,
        "symbol": submission.symbol,
        "variantId": variant.id,
        "totalVariants": total_variants
    }


@app.get("/api/gestures")
def get_all_gestures():
    """Get a list of all known symbols and their variant counts."""
    return {
        "symbols": [
            {
                "symbol": symbol,
                "variantCount": len(variants),
                "lastUpdated": max(v.createdAt for v in variants) if variants else None
            }
            for symbol, variants in database.list_gesture_summaries()
        ]
    }


@app.get("/api/gestures/{symbol}")
def get_gesture_by_symbol(symbol: str):
    """Get all gesture variants for a specific symbol."""
    definition = database.load_gesture(symbol)

    if definition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No gestures found for symbol: {symbol}"
        )

    return definition.model_dump(mode="json")


@app.get("/api/gestures/random/get")
def get_random_gesture():
    """Get a random symbol and all its gesture variants."""
    symbols = database.list_symbols()

    # Select random symbol (retry if it was deleted in the meantime)
    while symbols:
        symbol = random.choice(symbols)
        definition = database.load_gesture(symbol)
        if definition is not None:
            return {
                "symbol": symbol,
                "definition": definition.model_dump(mode="json")
            }
        symbols = database.list_symbols()

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No gestures available. Please record some gestures first."
    )


@app.post("/api/gestures/match")
def match_gesture(request: MatchRequest):
    """
    Compare submitted landmarks with stored gesture variants.
    Returns the best similarity score and matched variant.
    """
    definition = database.load_gesture(request.symbol)

    if definition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No gestures found for symbol: {request.symbol}"
        )

    best_similarity = 0.0
    best_variant_id = None

    # Compare against all variants
    for variant in definition.variants:
        similarity = compare_hand_poses(request.landmarks, variant.landmarks)
        if similarity > best_similarity:
            best_similarity = similarity
            best_variant_id = variant.id

    # Get the threshold for this gesture
    gesture_threshold = definition.threshold

    return MatchResponse(
        similarity=best_similarity,
        variantId=best_variant_id or "",
        confidence=best_similarity,
        threshold=gesture_threshold
    )


@app.delete("/api/gestures/{symbol}/{variant_id}")
def delete_gesture_variant(symbol: str, variant_id: str, _: User = Depends(require_trusted_user)):
    """Delete a specific gesture variant (and the symbol if no variants are left)."""
    deleted = database.delete_gesture_variant(symbol, variant_id)

    if deleted is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No gestures found for symbol: {symbol}"
        )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Variant {variant_id} not found for symbol {symbol}"
        )

    return {"success": True, "message": "Variant deleted successfully"}


@app.delete("/api/gestures/{symbol}")
def delete_gesture(symbol: str, _: User = Depends(require_trusted_user)):
    """Delete an entire gesture symbol with all its variants."""
    if not database.delete_gesture(symbol):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No gestures found for symbol: {symbol}"
        )

    return {"success": True, "message": f"Gesture '{symbol}' and all its variants deleted successfully"}


@app.patch("/api/gestures/{symbol}/threshold")
def update_gesture_threshold(symbol: str, threshold: float, _: User = Depends(require_trusted_user)):
    """Update the threshold for a specific gesture."""
    not_found = HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No gestures found for symbol: {symbol}"
    )

    if symbol not in database.list_symbols():
        raise not_found

    if threshold < 0 or threshold > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Threshold must be between 0 and 1"
        )

    if not database.update_gesture_threshold(symbol, threshold):
        raise not_found

    return {"success": True, "symbol": symbol, "threshold": threshold}


if __name__ == "__main__":
    logger.info("Starting VIS Minigame Leaderboard Backend")
    uvicorn.run(
        "__main__:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
