# VIS Minigame Leaderboard API

## Overview
Simple, persistent leaderboard backend for the VIS Minigame Challenge with concurrency-safe operations.

## Features
- ✅ Persistent storage using JSON files
- ✅ Thread-safe file operations with locking
- ✅ Automatic score updates (only keeps best score per player/team)
- ✅ Top 10 leaderboard maintenance
- ✅ CORS enabled for frontend integration
- ✅ Live updates support

## API Endpoints

### 1. Get Single Player Leaderboard
```http
GET /api/leaderboard/single
```

**Response:**
```json
[
  {
    "rank": 1,
    "name": "LaTeX Master",
    "score": 2850,
    "symbols": 28
  },
  ...
]
```

### 2. Get Multi Player Leaderboard
```http
GET /api/leaderboard/multi
```

**Response:**
```json
[
  {
    "rank": 1,
    "team": "Team Alpha",
    "score": 3420,
    "symbols": 32
  },
  ...
]
```

### 3. Submit Score
```http
POST /api/score/submit
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "PlayerName",
  "score": 2850,
  "symbols": 28,
  "game_mode": "single"
}
```

**Fields:**
- `name`: Player name (single) or Team name (multi)
- `score`: Total score achieved
- `symbols`: Number of symbols completed
- `game_mode`: Either `"single"` or `"multi"`

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "name": "PlayerName",
      "score": 2850,
      "symbols": 28
    },
    ...
  ]
}
```

### 4. Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "VIS Minigame Leaderboard"
}
```

## Usage Examples

### Submit a Single Player Score
```bash
curl -X POST "http://localhost:8000/api/score/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "LaTeX Master",
    "score": 2850,
    "symbols": 28,
    "game_mode": "single"
  }'
```

### Submit a Multi Player Score
```bash
curl -X POST "http://localhost:8000/api/score/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Team Alpha",
    "score": 3420,
    "symbols": 32,
    "game_mode": "multi"
  }'
```

### Get Leaderboards
```bash
# Single player
curl http://localhost:8000/api/leaderboard/single

# Multi player
curl http://localhost:8000/api/leaderboard/multi
```

## Data Storage

Leaderboards are stored in JSON files:
- `data/single_player.json` - Single player leaderboard
- `data/multi_player.json` - Multi player leaderboard

Files are automatically created on first run.

## Concurrency Handling

- Thread-safe file operations using `threading.Lock()`
- Atomic read-modify-write operations
- Multiple simultaneous score submissions are handled safely

## Score Update Logic

When a score is submitted:
1. If player/team exists: Update only if new score is better
2. If player/team is new: Add to leaderboard
3. Sort by score (primary) and symbols (secondary) in descending order
4. Keep only top 10 entries
5. Persist to disk

## Running the Backend

```bash
cd backend
python app.py
```

Server runs on `http://localhost:8000`

API documentation available at `http://localhost:8000/api/docs`

## Frontend Integration

The frontend automatically:
- Fetches leaderboards on page load
- Refreshes every 5 seconds for live updates
- Displays top entries with rank, name/team, score, and symbols
