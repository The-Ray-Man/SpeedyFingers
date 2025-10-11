# 🚀 Quick Start Guide - VIS Minigame Leaderboard

## Overview
Your backend has been completely overhauled! All the TODO app stuff is gone, replaced with a clean leaderboard system that's:
- ✅ Persistent (survives server restarts)
- ✅ Thread-safe (handles concurrent submissions)
- ✅ Live updating (frontend refreshes every 5 seconds)
- ✅ Simple to use

## Getting Started

### 1. Start the Backend

```bash
cd backend
python app.py
```

You should see:
```
🚀 Starting VIS Minigame Leaderboard Backend
✅ Leaderboard backend initialized
```

The server runs on `http://localhost:8000`

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

Visit the frontend URL (usually `http://localhost:5173`)

### 3. See It in Action!

The landing page now:
- Fetches real leaderboards from the backend
- Auto-refreshes every 5 seconds
- Shows "Loading leaderboards..." while fetching

## Testing the Backend

### Option 1: Use the Test Script

```bash
cd backend
python test_api.py
```

This will:
- Check health
- Submit sample scores
- Display leaderboards

### Option 2: Manual Testing with cURL

```bash
# Submit a single player score
curl -X POST http://localhost:8000/api/score/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TestPlayer",
    "score": 5000,
    "symbols": 50,
    "game_mode": "single"
  }'

# Get single player leaderboard
curl http://localhost:8000/api/leaderboard/single

# Get multi player leaderboard
curl http://localhost:8000/api/leaderboard/multi
```

### Option 3: Use the API Docs

Visit `http://localhost:8000/api/docs` for interactive API documentation where you can test all endpoints.

## Integration with Your Game

### When a game ends, submit the score:

```typescript
import { submitScore } from '../leaderboardApi';

// After game ends
async function onGameEnd(playerName: string, finalScore: number, symbolsCompleted: number) {
  try {
    const updatedLeaderboard = await submitScore({
      name: playerName,
      score: finalScore,
      symbols: symbolsCompleted,
      gameMode: 'single', // or 'multi' for multiplayer
    });
    
    // Show updated leaderboard or redirect to home
    console.log('New leaderboard:', updatedLeaderboard);
  } catch (error) {
    console.error('Failed to submit score:', error);
  }
}
```

### Example: Game Page Integration

```typescript
import { useState } from 'react';
import { submitScore } from '../leaderboardApi';
import { useNavigate } from 'react-router-dom';

function GamePage() {
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [symbols, setSymbols] = useState(0);
  const navigate = useNavigate();

  const handleGameEnd = async () => {
    if (!playerName) {
      alert('Please enter your name!');
      return;
    }

    try {
      await submitScore({
        name: playerName,
        score: score,
        symbols: symbols,
        gameMode: 'single',
      });

      // Navigate back to home to see updated leaderboard
      navigate('/');
    } catch (error) {
      console.error('Failed to submit score:', error);
      alert('Failed to submit score. Please try again.');
    }
  };

  return (
    <div>
      {/* Your game UI */}
      <input 
        value={playerName} 
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="Enter your name"
      />
      <button onClick={handleGameEnd}>Submit Score</button>
    </div>
  );
}
```

## File Structure

```
backend/
  app.py                    # Main backend server
  models.py                 # Data models
  test_api.py              # Test script
  LEADERBOARD_API.md       # API documentation
  data/                    # Created automatically
    single_player.json     # Single player scores
    multi_player.json      # Multi player scores

frontend/src/
  pages/
    index.tsx              # Landing page (updated with live leaderboards)
  leaderboardApi.ts        # API client helpers
```

## Key Features

### Automatic Best Score Updates
If a player/team submits multiple scores, only the best one is kept:

```bash
# First submission
{"name": "Player1", "score": 100}  # Saved

# Second submission (better)
{"name": "Player1", "score": 200}  # Updates previous

# Third submission (worse)
{"name": "Player1", "score": 150}  # Ignored, keeps 200
```

### Live Leaderboard Updates
The frontend automatically refreshes leaderboards every 5 seconds, so when someone gets a high score, it shows up for everyone almost immediately.

### Top 10 Only
Leaderboards automatically maintain only the top 10 entries to keep things fast and relevant.

## Troubleshooting

### Backend won't start
```bash
# Make sure dependencies are installed
cd backend
pip install -r requirements.txt
```

### Frontend can't connect to backend
1. Make sure backend is running on port 8000
2. Check CORS is enabled (it is by default)
3. Verify the API_BASE_URL in `leaderboardApi.ts`

### Leaderboards show empty
1. Check if backend is running: `curl http://localhost:8000/api/health`
2. Submit some test scores: `python backend/test_api.py`
3. Check browser console for errors

### Data gets lost
- Data is persisted in `backend/data/*.json` files
- Make sure the backend has write permissions to create the `data/` directory
- Don't delete these files unless you want to reset leaderboards

## What's Next?

1. ✅ Backend is ready and running
2. ✅ Landing page shows live leaderboards
3. 🔨 Build your game pages (single/multi player)
4. 🔨 Integrate score submission when game ends
5. 🎉 Enjoy automatic leaderboard updates!

## Need Help?

- Check `LEADERBOARD_API.md` for detailed API docs
- Run `python test_api.py` to verify backend works
- Visit `http://localhost:8000/api/docs` for interactive docs
- Check browser console and backend terminal for errors
