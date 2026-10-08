"""
SQLite storage for leaderboards and gestures.

Every write runs in its own `BEGIN IMMEDIATE` transaction, so concurrent
requests (threads or multiple uvicorn workers) can't lose each other's updates
and a crash never leaves half-written data behind.
"""

import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Iterator, Optional

from models import GestureDefinition, GestureVariant, LeaderboardEntry

logger = logging.getLogger(__name__)

# In Docker, DATA_DIR points at a mounted volume so the database survives
# container rebuilds.
DATA_DIR = Path(os.environ.get("DATA_DIR", "data"))
DB_FILE = DATA_DIR / "speedyfingers.db"
# Committed gestures shipped with the code, imported into a new database
SEED_GESTURES_FILE = Path(__file__).parent / "data" / "gestures.json"

SCHEMA_VERSION = 1

SCHEMA = """
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    game_type TEXT NOT NULL,
    game_mode TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    name      TEXT NOT NULL,
    score     INTEGER NOT NULL,
    symbols   INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    -- Increases every time an entry gets a new score. Among equal
    -- (score, symbols), the entry that reached it first ranks higher.
    position  INTEGER NOT NULL,
    PRIMARY KEY (game_type, game_mode, user_id)
);

CREATE TABLE IF NOT EXISTS gestures (
    -- Insertion order of symbols is the order the API lists them in
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol    TEXT NOT NULL UNIQUE,
    threshold REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS gesture_variants (
    -- Insertion order of variants is the order the API lists them in
    seq            INTEGER PRIMARY KEY AUTOINCREMENT,
    gesture_id     INTEGER NOT NULL REFERENCES gestures(id) ON DELETE CASCADE,
    id             TEXT NOT NULL,
    hand_count     INTEGER NOT NULL,
    landmarks      TEXT NOT NULL,  -- JSON
    active_fingers TEXT,           -- JSON
    active_regions TEXT,           -- JSON
    created_at     TEXT NOT NULL,
    metadata       TEXT            -- JSON
);

CREATE INDEX IF NOT EXISTS gesture_variants_gesture_id
    ON gesture_variants (gesture_id);
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE, timeout=30, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def _read() -> Iterator[sqlite3.Connection]:
    """Run several reads as one transaction, so they all see the same snapshot."""
    conn = _connect()
    try:
        conn.execute("BEGIN")
        try:
            yield conn
        finally:
            conn.execute("COMMIT")
    finally:
        conn.close()


@contextmanager
def _write() -> Iterator[sqlite3.Connection]:
    """Run a read-modify-write as one transaction holding the write lock."""
    conn = _connect()
    try:
        conn.execute("BEGIN IMMEDIATE")
        try:
            yield conn
        except BaseException:
            conn.execute("ROLLBACK")
            raise
        conn.execute("COMMIT")
    finally:
        conn.close()


def _dumps(value) -> Optional[str]:
    return None if value is None else json.dumps(value)


def _loads(value: Optional[str]):
    return None if value is None else json.loads(value)


# ==================== SETUP ====================

def init_db():
    """Create the schema, and import the gestures when the database is new."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = _connect()
    try:
        conn.execute("PRAGMA journal_mode = WAL")
        # Every statement is CREATE ... IF NOT EXISTS, so this is safe to rerun
        conn.executescript(SCHEMA)
    finally:
        conn.close()

    with _write() as conn:
        version = conn.execute("PRAGMA user_version").fetchone()[0]
        if version >= SCHEMA_VERSION:
            return
        _import_gestures(conn)
        conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")


def _import_gestures(conn: sqlite3.Connection):
    """Load the gestures from JSON into a new database.

    Prefers DATA_DIR/gestures.json, which holds the gestures of deployments
    that predate the database, and falls back to the committed seed file.
    A file that can't be imported is logged and left in place, so the
    backend still starts.
    """
    for source in (DATA_DIR / "gestures.json", SEED_GESTURES_FILE):
        if not source.exists():
            continue
        conn.execute("SAVEPOINT import_gestures")
        try:
            count = _import_gestures_from(conn, source)
        except Exception:
            conn.execute("ROLLBACK TO import_gestures")
            conn.execute("RELEASE import_gestures")
            logger.exception("Could not import gestures from %s", source)
            continue
        conn.execute("RELEASE import_gestures")
        logger.info("Imported %d gestures from %s", count, source)
        return


def _import_gestures_from(conn: sqlite3.Connection, source: Path) -> int:
    data = json.loads(source.read_text(encoding="utf-8"))
    # The old JSON storage looked symbols up by their key, so the key wins
    for symbol, gesture_data in data.items():
        definition = GestureDefinition(**gesture_data)
        gesture_id = conn.execute(
            "INSERT INTO gestures (symbol, threshold) VALUES (?, ?)",
            (symbol, definition.threshold),
        ).lastrowid
        for variant in definition.variants:
            _insert_variant(conn, gesture_id, variant)
    return len(data)


# ==================== LEADERBOARD ====================

def _load_leaderboard(conn: sqlite3.Connection, game_type: str, game_mode: str) -> list[LeaderboardEntry]:
    rows = conn.execute(
        """
        SELECT user_id, name, score, symbols, timestamp
        FROM leaderboard_entries
        WHERE game_type = ? AND game_mode = ?
        ORDER BY score DESC, symbols DESC, position ASC
        """,
        (game_type, game_mode),
    ).fetchall()
    return [LeaderboardEntry(**dict(row)) for row in rows]


def load_leaderboard(game_type: str, game_mode: str) -> list[LeaderboardEntry]:
    """Load a leaderboard, best entry first."""
    with _read() as conn:
        return _load_leaderboard(conn, game_type, game_mode)


def update_leaderboard(
    game_type: str,
    game_mode: str,
    new_entry: LeaderboardEntry,
    max_entries: int = 10,
) -> list[LeaderboardEntry]:
    """
    Update leaderboard with new entry, maintaining top scores.
    Returns the updated leaderboard, best entry first.
    """
    board = (game_type, game_mode)
    with _write() as conn:
        next_position = conn.execute(
            "SELECT COALESCE(MAX(position), 0) + 1 FROM leaderboard_entries"
            " WHERE game_type = ? AND game_mode = ?",
            board,
        ).fetchone()[0]

        # Check if the user already has an entry (keyed by the unique user id)
        existing = conn.execute(
            "SELECT score FROM leaderboard_entries"
            " WHERE game_type = ? AND game_mode = ? AND user_id = ?",
            (*board, new_entry.user_id),
        ).fetchone()

        values = (
            new_entry.name,
            new_entry.score,
            new_entry.symbols,
            new_entry.timestamp.isoformat(),
            next_position,
        )
        if existing is None:
            conn.execute(
                "INSERT INTO leaderboard_entries"
                " (name, score, symbols, timestamp, position, game_type, game_mode, user_id)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (*values, *board, new_entry.user_id),
            )
        elif new_entry.score > existing["score"]:
            # Update only if new score is better
            conn.execute(
                "UPDATE leaderboard_entries"
                " SET name = ?, score = ?, symbols = ?, timestamp = ?, position = ?"
                " WHERE game_type = ? AND game_mode = ? AND user_id = ?",
                (*values, *board, new_entry.user_id),
            )
        else:
            # Keep the displayed name in sync with the user's current name
            conn.execute(
                "UPDATE leaderboard_entries SET name = ?"
                " WHERE game_type = ? AND game_mode = ? AND user_id = ?",
                (new_entry.name, *board, new_entry.user_id),
            )

        # Keep only top entries
        conn.execute(
            """
            DELETE FROM leaderboard_entries
            WHERE game_type = ? AND game_mode = ? AND user_id NOT IN (
                SELECT user_id FROM leaderboard_entries
                WHERE game_type = ? AND game_mode = ?
                ORDER BY score DESC, symbols DESC, position ASC
                LIMIT ?
            )
            """,
            (*board, *board, max_entries),
        )

        return _load_leaderboard(conn, game_type, game_mode)


# ==================== GESTURES ====================

def _insert_variant(conn: sqlite3.Connection, gesture_id: int, variant: GestureVariant):
    data = variant.model_dump(mode="json")
    conn.execute(
        """
        INSERT INTO gesture_variants
            (gesture_id, id, hand_count, landmarks, active_fingers,
             active_regions, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            gesture_id,
            data["id"],
            data["handCount"],
            _dumps(data["landmarks"]),
            _dumps(data["activeFingers"]),
            _dumps(data["activeRegions"]),
            data["createdAt"],
            _dumps(data["metadata"]),
        ),
    )


def _variant_from_row(row: sqlite3.Row) -> GestureVariant:
    return GestureVariant(
        id=row["id"],
        handCount=row["hand_count"],
        landmarks=json.loads(row["landmarks"]),
        activeFingers=_loads(row["active_fingers"]),
        activeRegions=_loads(row["active_regions"]),
        createdAt=row["created_at"],
        metadata=_loads(row["metadata"]),
    )


def _gesture_row(conn: sqlite3.Connection, symbol: str) -> Optional[sqlite3.Row]:
    return conn.execute(
        "SELECT id, symbol, threshold FROM gestures WHERE symbol = ?", (symbol,)
    ).fetchone()


def _variant_count(conn: sqlite3.Connection, gesture_id: int) -> int:
    return conn.execute(
        "SELECT COUNT(*) FROM gesture_variants WHERE gesture_id = ?", (gesture_id,)
    ).fetchone()[0]


def gesture_exists(symbol: str) -> bool:
    with _read() as conn:
        return _gesture_row(conn, symbol) is not None


def list_gesture_summaries() -> list[tuple[str, int, Optional[datetime]]]:
    """All symbols with their variant count and newest variant time, in insertion order."""
    with _read() as conn:
        rows = conn.execute(
            """
            SELECT g.symbol, COUNT(v.seq) AS variant_count, MAX(v.created_at) AS last_updated
            FROM gestures g LEFT JOIN gesture_variants v ON v.gesture_id = g.id
            GROUP BY g.id
            ORDER BY g.id
            """
        ).fetchall()
    return [
        (
            row["symbol"],
            row["variant_count"],
            datetime.fromisoformat(row["last_updated"]) if row["last_updated"] else None,
        )
        for row in rows
    ]


def _load_gesture(conn: sqlite3.Connection, gesture: sqlite3.Row) -> GestureDefinition:
    rows = conn.execute(
        "SELECT * FROM gesture_variants WHERE gesture_id = ? ORDER BY seq",
        (gesture["id"],),
    ).fetchall()
    return GestureDefinition(
        symbol=gesture["symbol"],
        variants=[_variant_from_row(row) for row in rows],
        threshold=gesture["threshold"],
    )


def load_gesture(symbol: str) -> Optional[GestureDefinition]:
    """Load one symbol with all its variants, or None if it doesn't exist."""
    with _read() as conn:
        gesture = _gesture_row(conn, symbol)
        return None if gesture is None else _load_gesture(conn, gesture)


def load_random_gesture() -> Optional[GestureDefinition]:
    """Load a random symbol with all its variants, or None if there are none."""
    with _read() as conn:
        gesture = conn.execute(
            "SELECT id, symbol, threshold FROM gestures ORDER BY RANDOM() LIMIT 1"
        ).fetchone()
        return None if gesture is None else _load_gesture(conn, gesture)


def add_gesture_variant(symbol: str, variant: GestureVariant, threshold: Optional[float]) -> int:
    """
    Add a variant to a symbol, creating the symbol if it doesn't exist.
    Returns the symbol's total number of variants.
    """
    with _write() as conn:
        gesture = _gesture_row(conn, symbol)
        if gesture is None:
            gesture_id = conn.execute(
                "INSERT INTO gestures (symbol, threshold) VALUES (?, ?)",
                (symbol, threshold if threshold is not None else 0.55),
            ).lastrowid
        else:
            gesture_id = gesture["id"]
            # Update threshold if provided
            if threshold is not None:
                conn.execute(
                    "UPDATE gestures SET threshold = ? WHERE id = ?", (threshold, gesture_id)
                )
        _insert_variant(conn, gesture_id, variant)
        return _variant_count(conn, gesture_id)


def delete_gesture_variant(symbol: str, variant_id: str) -> Optional[bool]:
    """
    Delete a variant; the symbol is removed when its last variant is gone.
    Returns None if the symbol doesn't exist, False if the variant doesn't.
    """
    with _write() as conn:
        gesture = _gesture_row(conn, symbol)
        if gesture is None:
            return None
        deleted = conn.execute(
            "DELETE FROM gesture_variants WHERE gesture_id = ? AND id = ?",
            (gesture["id"], variant_id),
        ).rowcount
        if not deleted:
            return False
        # Remove symbol entirely if no variants left
        if _variant_count(conn, gesture["id"]) == 0:
            conn.execute("DELETE FROM gestures WHERE id = ?", (gesture["id"],))
        return True


def delete_gesture(symbol: str) -> bool:
    """Delete a symbol with all its variants. Returns False if it doesn't exist."""
    with _write() as conn:
        return conn.execute("DELETE FROM gestures WHERE symbol = ?", (symbol,)).rowcount > 0


def update_gesture_threshold(symbol: str, threshold: float) -> bool:
    """Set a symbol's threshold. Returns False if the symbol doesn't exist."""
    with _write() as conn:
        return conn.execute(
            "UPDATE gestures SET threshold = ? WHERE symbol = ?", (threshold, symbol)
        ).rowcount > 0
