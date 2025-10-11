#!/usr/bin/env python3
"""
Simple test script for the leaderboard API.
Run the backend server first (python app.py), then run this script.
"""

import requests
import json

API_BASE = "http://localhost:8000/api"

def test_health():
    """Test health check endpoint."""
    print("🔍 Testing health check...")
    response = requests.get(f"{API_BASE}/health")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}\n")

def test_submit_scores():
    """Test score submission."""
    print("📝 Submitting test scores...")
    
    # Single player scores
    single_scores = [
        {"name": "LaTeX Master", "score": 2850, "symbols": 28, "game_mode": "single"},
        {"name": "Shape Wizard", "score": 2340, "symbols": 23, "game_mode": "single"},
        {"name": "Symbol Ninja", "score": 2120, "symbols": 21, "game_mode": "single"},
    ]
    
    # Multi player scores
    multi_scores = [
        {"name": "Team Alpha", "score": 3420, "symbols": 32, "game_mode": "multi"},
        {"name": "Code Warriors", "score": 3150, "symbols": 30, "game_mode": "multi"},
        {"name": "Symbol Squad", "score": 2890, "symbols": 27, "game_mode": "multi"},
    ]
    
    for score in single_scores + multi_scores:
        response = requests.post(f"{API_BASE}/score/submit", json=score)
        print(f"   Submitted: {score['name']} - {response.status_code}")
    
    print()

def test_get_leaderboards():
    """Test fetching leaderboards."""
    print("📊 Fetching leaderboards...")
    
    # Single player
    response = requests.get(f"{API_BASE}/leaderboard/single")
    print(f"\n🏆 Single Player Leaderboard:")
    print(json.dumps(response.json(), indent=2))
    
    # Multi player
    response = requests.get(f"{API_BASE}/leaderboard/multi")
    print(f"\n👥 Multi Player Leaderboard:")
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    print("=" * 60)
    print("🎮 VIS Minigame Leaderboard API Test")
    print("=" * 60 + "\n")
    
    try:
        test_health()
        test_submit_scores()
        test_get_leaderboards()
        print("\n" + "=" * 60)
        print("✅ All tests completed!")
        print("=" * 60)
    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to backend. Make sure it's running on port 8000")
    except Exception as e:
        print(f"❌ Error: {e}")
