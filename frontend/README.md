# SpeedyFingers frontend

The browser game: React 19, TypeScript, Vite and Chakra UI v3. Hand tracking
and gesture recognition run in the browser with
[`@mediapipe/tasks-vision`](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker).
The webcam image never leaves the device; only scores and recorded gesture
landmarks are sent to the backend.

See the [root README](../README.md) for the game modes, the backend API and
deployment.

## Development

Requires Node.js 22 (the version the Docker image builds with).

```bash
npm ci
npm run dev        # http://localhost:5173
```

The dev server forwards `/api` to the backend at `http://localhost:8000`, so
start the backend too (see the root README).

| Script | What it does |
| :----- | :----------- |
| `npm run dev` | Dev server with hot reload |
| `npm run lint` | ESLint |
| `npm run build` | Type-check (`tsc -b`) and build into `dist/` |
| `npm run preview` | Serve the production build locally |

CI runs `lint` and `build` on every pull request.

## Configuration

| Variable | Default | Description |
| :------- | :------ | :---------- |
| `VITE_API_BASE_URL` | `/api` | Base URL of the backend API. Read at build time; the Docker image takes it as a build argument. |

## MediaPipe assets

Nothing is loaded from a CDN. `src/mediapipe.ts` is the only module that
talks to MediaPipe. A plugin in `vite.config.ts` copies the WASM runtime from
the pinned npm package to `public/mediapipe/wasm` on every dev start and
build (that folder is git-ignored), and the `.task` models are committed under
`public/mediapipe/models`. To upgrade MediaPipe, change the exact version in
`package.json` and replace the models.

## Project structure

```
src/
  App.tsx                  Routes and global providers
  apiConfig.ts             API base URL
  gestureApi.ts            Client for the /api/gestures endpoints
  leaderboardApi.ts        Client for the leaderboard and score endpoints
  mediapipe.ts             MediaPipe setup, camera access, error messages
  advancedGestureRecognition.ts, utils/localGestureMatcher.ts
                           Landmark conversion and in-browser matching of
                           recorded gesture variants
  context/                 Music, sounds, current user and gesture navigation
  pages/                   One component per route (Home, PlayOptions,
                           FingerGame, DevMode, tutorials)
  components/
    pages/gameLive/        The two-player "Gesture Battle" (/live_game):
      GameLive.tsx           page and game loop
      hands.ts               assigns detected hands to players
      targets.ts             target gestures and matching
      coins.ts               falling coins
      drawing.ts             hand skeleton and hitbox drawing
      PostGameModal.tsx      result and score submission
    playoptions/, design/, game_components/
                           Shared UI pieces
    ui/                    Chakra UI snippets
public/                    Images, sounds, icons and MediaPipe assets
```
