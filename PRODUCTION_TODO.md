# Production readiness checklist

Findings from a review of the codebase on 2026-10-08. The frontend builds
(`npm run build` passes). `npm run lint` reports 90 problems (77 errors and
13 warnings).

## 🔴 Blockers

### Security and abuse

- [ ] **Anyone can delete or overwrite the gesture data.** These endpoints have
  no authentication: `POST /api/gestures`, `DELETE /api/gestures/{symbol}`,
  `DELETE /api/gestures/{symbol}/{variant_id}` and
  `PATCH /api/gestures/{symbol}/threshold` (`backend/app.py`). One curl
  request can wipe every symbol the game depends on. Protect them, for
  example with an admin token or by disabling them when not in dev, or move
  gesture authoring into a separate tool.
- [ ] **Dev Mode is public.** The home page has a card linking to `/dev-mode`
  (`frontend/src/pages/Home.tsx:126`, `:176`), and the route is always
  registered (`App.tsx`). Hide it behind a build flag such as
  `import.meta.env.DEV` or an auth check.
- [ ] **Scores can be faked.** `POST /api/score/submit` accepts any
  name and score from the client. Add at least rate limiting and an upper
  bound on score and symbols. If the leaderboard matters, also add
  server-issued game sessions or a plausibility check on the score.
- [ ] **Player names aren't validated.** `name` has no length limit, no
  character set restriction, and no profanity filter (`models.py`).
- [ ] **No request size limits.** `landmarks` is an unbounded
  `List[List[List[float]]]`, so a large payload can exhaust memory and CPU in
  `/gestures/match` and on save. Limit hands to 2 and points to 21 per hand
  with `conlist` or Field constraints, and set a body size limit in Traefik.
- [ ] **CORS is wide open.** `allow_origins=["*"]` combined with
  `allow_credentials=True` (`app.py`). Restrict it to the real origin.
  Behind the single Traefik origin, CORS can probably be removed entirely.
- [ ] **Traefik has full access to the Docker socket** and uses the unpinned
  `traefik` image. Pin a version (for example `traefik:v3.x`). Also set
  `--providers.docker.exposedbydefault=false`, because every service already
  sets `traefik.enable`.
- [ ] **No HTTPS.** Only port 8080 over HTTP is exposed. Browsers block
  `getUserMedia` (the webcam) on non-secure origins, so **the game can't run
  on a public host without TLS.** Add a `websecure` entrypoint with Let's
  Encrypt (ACME) and redirect HTTP to HTTPS.
- [ ] Add security headers: a `Content-Security-Policy` that allows jsDelivr,
  storage.googleapis.com, and `wasm-unsafe-eval`; HSTS; and
  `Permissions-Policy: camera=(self)`. `X-XSS-Protection` in `nginx.conf` is
  obsolete and can be removed.

### Data persistence

- [x] **Data is lost on redeploy.** `backend/data/*.json` lives inside the
  container image and docker-compose has no volume. Every rebuild resets the
  leaderboards and gestures to the copies in git. Mount a named volume, or
  move to SQLite or Postgres.
  *Done in [#1](https://github.com/The-Ray-Man/SpeedyFingers/pull/1): the
  backend reads `DATA_DIR` (`/data` in Docker), docker-compose mounts the
  named volume `backend-data` there, and missing files are seeded from
  `backend/data/` on first start. Back up the running container's data
  before the first redeploy.*
- [ ] **JSON writes aren't atomic.** `write_text` can leave a truncated
  `gestures.json` (684 KB) after a crash. `load_gestures` then silently
  returns `{}`, and the next save overwrites everything. Write to a temp file
  and `os.replace` it, and stop swallowing parse errors.
- [ ] **Race conditions.** `update_leaderboard`, `save_gesture` and the
  delete handlers load and then save under two separate lock acquisitions,
  so concurrent requests can lose updates. Hold one lock for the whole
  read-modify-write. The lock also only works with a single uvicorn worker.
- [ ] Separate seed data from runtime data. Committed leaderboard entries,
  such as test scores, shouldn't ship as production state.
  *Partly done in #1: runtime data now lives in the volume, but the
  committed leaderboard files (with test scores) are still used as seed
  data on first start.*

### Backend runtime

- [x] **The server runs with `reload=True`** (`app.py` `__main__`), which is
  a file-watching dev server. In the Dockerfile, use
  `uvicorn app:app --host 0.0.0.0 --port 8000 --proxy-headers` with no
  reload.
- [x] The container runs as root. Add a non-root `USER` and
  `pip install --no-cache-dir`.

## 🟠 Should fix

### Reliability and external dependencies

- [ ] **Runtime CDN dependencies.** MediaPipe WASM and models are loaded from
  jsDelivr and storage.googleapis.com, and `GestureService.ts` uses
  `tasks-vision@latest`, so an upstream release can break the game without
  any change on your side. The project also uses **two versions at once**:
  `0.10.0` via a CDN import in `GameLive.tsx`, and `@latest` plus the npm
  package `^0.10.22-rc`. Pin one version, preferably the npm package, and
  self-host the WASM and `.task` files in `public/`.
- [ ] Remove unused or duplicated ML dependencies: the legacy
  `@mediapipe/hands`, `camera_utils` and `drawing_utils`, and
  `@tensorflow/tfjs` and `pose-detection`, which only the disabled body mode
  uses. Remove `@babel/core` and `@babel/traverse` from runtime
  `dependencies`.
- [ ] **The bundle is 3 MB (609 KB gzipped) in a single chunk.** Lazy-load
  routes with `React.lazy` (DevMode, GameLive and FingerGame are each 1–2k
  lines) and the ML libraries.
- [ ] The images in `public/` are large (`pic1–4.png` and `Pic2.png` total
  about 13 MB). Convert them to WebP or AVIF at display size. The 2.7 MB
  `background_music_tmp.mp3` should be compressed and renamed.
- [ ] Check licensing for the background music and images before a public
  release.
- [ ] Add a Docker `healthcheck` that calls `/api/health`.
- [ ] Error handling: if the camera is denied, the CDN is unavailable or the
  model fails to load, most code paths only log to the console. Show the
  user a clear message.
- [ ] Check browser support: Safari and iOS behavior, mobile layout,
  behavior without a camera, and the autoplay policy for the music.

### Backend quality

- [ ] `requirements.txt` lists `pydantic` twice and includes **`litellm`,
  which nothing uses** (a large dependency). Remove `litellm` and the stale
  `LITELLM_*` variables in `.env.sample`. Docker compose fails if `.env` is
  missing, so drop the `env_file` entry or keep `.env.sample` meaningful.
- [ ] `models.LeaderboardEntry.timestamp = datetime.now()` is evaluated once
  at import time. Use `Field(default_factory=datetime.now)`.
- [ ] Use `Literal["single", "multi"]` and `Literal["finger", "body"]` in
  `ScoreSubmission` instead of manual checks. Remove `getattr(submission,
  'game_type', 'finger')`: the field is required, so the default never
  applies.
- [ ] `@app.on_event("startup")` is deprecated. Use a `lifespan` handler.
- [ ] Replace `print` with `logging`.
- [ ] Remove the legacy endpoints and files (`/leaderboard/single|multi`,
  `single_player.json`, `multi_player.json`) once the frontend no longer uses
  them.
- [ ] Turn `backend/test_api.py` into real pytest tests using FastAPI's
  `TestClient`. Today it needs a running server and `requests`, which isn't
  installed, and it doesn't send the required `game_type` field.

### Frontend quality

- [ ] Fix the 77 ESLint errors, mostly `no-explicit-any`, and add lint and
  build to CI.
- [ ] Remove dead code: the commented-out `RequireUserLayout` and
  `/changeuser` redirects in `App.tsx` (the `/changeuser` route doesn't
  exist, and `BodyGame.tsx` still navigates to it), the empty
  `hooks/useGestureNavigation.ts`, the unused imports of `BodyGame`,
  `BodyGameMenu` and `TutorialBody`, and the
  `/TutorialFinger` / `/TutorialBody` links whose capitalization doesn't
  match the routes.
- [ ] Decide on body mode: finish it or remove it, along with
  `usePoseDetection`, `poseDrawing`, `personTracking` and the TensorFlow
  dependencies.
- [ ] Use the API base URL consistently. `gestureApi.ts` hard-codes `/api`,
  while `leaderboardApi.ts` reads `VITE_API_BASE_URL`. The frontend
  Dockerfile sets `REACT_APP_API_URL`, which Vite ignores.
- [ ] Split `GameLive.tsx` (2.2k lines, with the whole game loop in one
  `useEffect`) into smaller modules.
- [ ] Set the page title (it's still "VIScon Hackathon Template") and add
  meta tags and a proper favicon.
- [ ] Rewrite or delete `frontend/README.md`, which is still the template
  text.

## 🟡 Housekeeping

- [ ] Delete or move `other/index.html` (prototype), `Vision/vision.py`
  (unused experiment), `todo_tom.txt`, and the root `package-lock.json`
  (91 bytes, no `package.json`).
- [ ] Use `npm ci` instead of `npm install` in the frontend Dockerfile so
  builds are reproducible.
- [ ] Add a `LICENSE` and a privacy note. The webcam is processed only in the
  browser, which should be stated clearly to users.
- [ ] Add CI (GitHub Actions) that runs lint, type-check, backend tests and
  the Docker build.
  *Docker build done in #1: `.github/workflows/docker-release.yml` builds
  both images on every PR, publishes them to GHCR on `main` and `v*` tags,
  and creates a GitHub Release for tags. Lint, type-check and backend tests
  are still missing.*
- [x] Document deployment from the published images (README "Deployment"
  section, #1).
- [ ] Set up monitoring and logging for the deployed instance: Traefik access
  logs and uptime checks on `/api/health`.
