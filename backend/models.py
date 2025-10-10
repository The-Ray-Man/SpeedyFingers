from datetime import datetime
from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    name: str  # Player name or Team name
    score: int
    symbols: int  # Number of symbols completed
    timestamp: datetime = datetime.now()


class ScoreSubmission(BaseModel):
    name: str  # Player name or Team name
    score: int
    symbols: int
    game_mode: str  # "single" or "multi"
