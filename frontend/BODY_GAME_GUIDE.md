# Body Game - Multiplayer Shape Dodging Game

## Overview
A multiplayer body-tracking game where players must dodge colored shapes by positioning their entire body to avoid collision. The game uses pose detection to track up to 6 people simultaneously, detecting 17+ body keypoints per person.

## Game Flow

### 1. Initial Countdown
- **Duration**: 5 seconds
- **Purpose**: Give players time to get into position
- Players can see themselves on camera with pose tracking active

### 2. Shape Sequence (20 shapes total)
For each shape:

#### Phase A: Blinking Phase (5 seconds)
- Shape appears and blinks to indicate where it will be
- **First 3 seconds**: Slow blinking (300ms intervals)
- **Last 2 seconds**: Fast blinking (150ms intervals)
- Color indication:
  - **Green**: No collision detected (safe)
  - **Red**: Collision detected (warning)
- Players should move to safe positions during this time

#### Phase B: Evaluation Phase (2 seconds)
- Shape stops blinking and remains fully visible
- Shape opacity: 50% (players can see themselves behind it)
- **Pass/Fail Check**:
  - **PASS** ✅: No collision detected during entire 2 seconds → Next shape
  - **FAIL** ❌: ANY collision detected during 2 seconds → Game Over

#### Between Shapes
- **Countdown**: 4 seconds between shapes
- Gives players time to prepare for next shape

### 3. Game End Conditions

#### Victory 🎉
- All 20 shapes successfully dodged
- Score: 20/20
- Master level achieved!

#### Game Over ❌
- Collision detected during any evaluation phase
- Score: Number of shapes successfully dodged (0-19)
- Difficulty level reached: Easy (0-7), Medium (8-15), Hard (16-19)

## Shape Patterns

### Easy Shapes (Shapes 1-8)
Alternating half-screen patterns:
1. Right half → Left half
2. Top half → Bottom half
3. Left half → Right half
4. Bottom half → Top half

### Medium Shapes (Shapes 9-16)
Alternating quarter-screen patterns:
1. Top-left → Bottom-right
2. Top-right → Bottom-left
3. Bottom-left → Top-right
4. Bottom-right → Top-left

### Hard Shapes (Shapes 17-20)
Mix of halves and quarters with alternating patterns

## Multiplayer Support
- **Simultaneous Players**: Up to 6 people
- **Collision Detection**: ANY player colliding = game over for the team
- **Cooperative Play**: All players must work together to avoid shapes
- No individual player names/labels (removed for simplicity)

## Controls
- **Start Game**: Begin new game (only available when idle)
- **Reset**: Reset game at any time
- **Play Again**: Restart after game over or victory

## Technical Details

### Pose Tracking
- **Model**: MediaPipe Pose Detection (MultiPose Lightning)
- **Keypoints**: 17+ body landmarks per person
- **Tracking**: Real-time pose tracking with person ID persistence
- **Performance**: Optimized for smooth gameplay

### Collision Detection
- All 17+ keypoints checked for each person
- Keypoints with confidence < 0.3 are ignored
- Real-time collision feedback during blinking
- Pass/fail determination during evaluation phase

### Visual Feedback
- Progress bar showing current shape number
- Countdown timers between phases
- Color-coded shapes (green=safe, red=collision)
- Status indicators at bottom
- Game over/victory overlays with detailed scores

## Files Modified/Created

### Created
- `/frontend/src/components/game_components/ShapeOverlay.tsx` - Shape rendering
- `/frontend/src/utils/collisionDetection.ts` - Collision detection logic

### Modified
- `/frontend/src/pages/BodyGame.tsx` - Complete rewrite with new game logic
- `/frontend/src/components/game_components/VideoComponent.tsx` - Added collision support

### Removed Features
- LaTeX symbol display (ShapeWrapper)
- Individual player name labels
- Timer-based scoring
- Old score increment system

## How to Play
1. Stand in front of camera (1-6 players)
2. Click "Start Game"
3. Wait for 5-second countdown
4. Watch the shape blink (5 seconds) and move to safe area
5. Hold position during evaluation (2 seconds)
6. If no collision detected → next shape
7. Repeat for all 20 shapes to win!

## Tips for Success
- Stay completely visible to the camera
- Watch the blinking pattern for faster/slower phases
- Move quickly during blinking phase
- Stay perfectly still during evaluation phase
- Coordinate with teammates in multiplayer
- Practice predicting opposite shape patterns
