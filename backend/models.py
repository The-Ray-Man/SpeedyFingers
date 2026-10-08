from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class LeaderboardEntry(BaseModel):
    user_id: str  # Unique key, taken from the trusted X-User-Id header
    name: str  # Display name, taken from the trusted X-User-Name header
    score: int
    symbols: int  # Number of symbols completed
    timestamp: datetime = datetime.now()


class ScoreSubmission(BaseModel):
    # The player's identity is taken from the trusted proxy headers, not the body
    score: int
    symbols: int
    game_mode: str  # "single" or "multi"
    game_type: str  # "finger" or "body"


class GestureVariant(BaseModel):
    """A single variant of a gesture for a symbol"""
    id: str  # UUID for this variant
    handCount: int  # Number of hands required (1 or 2)
    landmarks: List[List[List[float]]]  # Hand landmarks data
    activeFingers: Optional[Dict[str, bool]] = None  # Which fingers are active
    activeRegions: Optional[Dict[str, bool]] = None  # Which palm regions are active
    createdAt: datetime = Field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = None  # User-defined notes


class GestureDefinition(BaseModel):
    """Complete gesture definition with all variants for a symbol"""
    symbol: str  # The symbol or emoji this gesture represents
    variants: List[GestureVariant] = []
    threshold: float = 0.55  # Similarity threshold for this gesture (default 55%)


class GestureSubmission(BaseModel):
    """Request model for saving a new gesture variant"""
    symbol: str
    handCount: int
    landmarks: List[List[List[float]]]
    activeFingers: Optional[Dict[str, bool]] = None
    activeRegions: Optional[Dict[str, bool]] = None
    metadata: Optional[Dict[str, Any]] = None
    threshold: Optional[float] = 0.55  # Similarity threshold for this gesture (default 55%)


class MatchRequest(BaseModel):
    """Request model for matching a gesture"""
    symbol: str
    landmarks: List[List[List[float]]]


class MatchResponse(BaseModel):
    """Response model for gesture matching"""
    similarity: float  # Best similarity score (0-1)
    variantId: str  # ID of the matched variant
    confidence: float  # Confidence score (0-1)
    threshold: float  # The threshold configured for this gesture
