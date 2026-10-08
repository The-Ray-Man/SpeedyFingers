# SpeedyFingers

A browser game you play with your hands in front of a webcam. Hand tracking runs
in the browser with [MediaPipe](https://ai.google.dev/edge/mediapipe); players
copy the gesture or symbol shown on screen to score points. Scores go to a
small leaderboard backend.

The project started from the VIScon Hackathon template.

## Game modes

| Mode | Route | Description |
| :--- | :---- | :---------- |
| **Gesture Battle** (multiplayer) | `/live_game` | Two players share one camera, one on each side of the frame. Each player is shown a target gesture and scores by matching it. Coins appear on screen and can be grabbed. Show 👍👍 or press Start to begin. |
| **Single Player Challenge** | `/game-1` | Copy hand shapes for symbols (including LaTeX symbols) recorded in Dev Mode. The variants are fetched from the backend and matched in the browser (`utils/localGestureMatcher.ts`). |
| **Tutorial** | `/tutorial`, `/tutorialFinger` | Introduces the controls. |
| **Dev Mode** | `/dev-mode` | Record, test, and delete the gesture variants for each symbol and tune each symbol's match threshold. Only [trusted users](#authentication) can make changes. |

Menus can also be controlled with gestures. For example, 🤟 switches between
options and 👎 selects one.

An earlier full-body mode (pose detection with TensorFlow.js) was unfinished
and has been removed.

## Architecture

```
            ┌──────────────────────── Traefik :8080 ───────────────────────┐
 browser ──▶│  /api/*  ──▶ backend  (FastAPI, uvicorn :8000)               │
            │  /*      ──▶ frontend (nginx serving the Vite build, :80)    │
            └──────────────────────────────────────────────────────────────┘
```

- **Frontend** (`frontend/`): React 19, TypeScript, Vite, and Chakra UI v3.
  Hand landmarks and the built-in gesture classifier come from
  `@mediapipe/tasks-vision`. The WASM runtime and `.task` models are served
  from the app itself (`public/mediapipe`). The webcam is used only in
  the browser and video is never uploaded.
- **Backend** (`backend/`): FastAPI. It stores leaderboards and gesture
  definitions in a SQLite database (`speedyfingers.db` in `DATA_DIR`,
  `backend/data/` by default). Every write is a single transaction, so
  concurrent requests can't lose updates. Server-side matching
  (`backend/ai.py`, used by Dev Mode's test feature) normalizes the landmarks to the wrist and to hand size,
  then turns their average distance into a similarity score with
  `exp(-5·d)`.
- **Proxy**: Traefik, configured with Docker labels in `docker-compose.yml`.
  In production, requests arrive through an upstream trusted proxy that sets
  the user identity headers (see [Authentication](#authentication)).

## Quick start (Docker)

```bash
docker compose up --build
```

- App: <http://localhost:8080>
- API docs (Swagger): <http://localhost:8080/api/docs>

The webcam only works in a secure context. That means `localhost`, or HTTPS
on any other host.

## Deployment

A GitHub Actions workflow (`.github/workflows/docker-release.yml`) builds both
images and publishes them to the GitHub Container Registry:

- `ghcr.io/the-ray-man/speedyfingers-backend`
- `ghcr.io/the-ray-man/speedyfingers-frontend`

| Trigger              | Image tags                                         |
| :------------------- | :------------------------------------------------- |
| Push to `main`       | `latest`, `main`, `sha-<commit>`                   |
| Git tag `v1.2.3`     | `1.2.3`, `1.2`, `sha-<commit>` + a GitHub Release  |
| Pull request         | Built only, not pushed                             |

### Publishing a release

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow pushes the images tagged `1.0.0` and `1.0` and creates a GitHub
Release with generated notes.

### Deploying to a server

The server only needs Docker; you don't have to clone the repository or build
anything.

1. **Install Docker** with the Compose plugin (see the
   [Docker install guide](https://docs.docker.com/engine/install/)) and check
   it works:

   ```bash
   docker compose version
   ```

2. **Allow the server to pull the images.** New GHCR packages are private.
   Either make both packages public (GitHub → your profile → *Packages* →
   package → *Package settings* → *Change visibility*), or log in with a
   [personal access token](https://github.com/settings/tokens) that has the
   `read:packages` scope:

   ```bash
   docker login ghcr.io -u <github-username>
   ```

3. **Create a folder and download the compose file:**

   ```bash
   mkdir -p ~/speedyfingers && cd ~/speedyfingers
   curl -fsSLO https://raw.githubusercontent.com/The-Ray-Man/SpeedyFingers/main/docker-compose.yml
   ```

   To let users edit gestures, create a `.env` file next to it with
   `TRUSTED_USER_IDS` (see [Authentication](#authentication) and
   `.env.sample`). The file is optional.

4. **(Optional) Pin a release.** By default the compose file uses `latest`,
   which tracks `main`. To run a fixed version, replace `:latest` with the
   version tag (for example `:1.0.0`) on the `backend` and `frontend` images
   in `docker-compose.yml`.

5. **Pull the images and start the stack:**

   ```bash
   docker compose pull
   docker compose up -d --no-build
   ```

   `--no-build` makes Compose use the published images instead of trying to
   build from source.

6. **Check that it runs:**

   ```bash
   docker compose ps
   curl http://localhost:8080/api/health
   ```

   The app is now served on port `8080`. Note that browsers only allow webcam
   access on `localhost` or over HTTPS, so a public deployment needs TLS in
   front of it.

### Updating

```bash
cd ~/speedyfingers
docker compose pull
docker compose up -d --no-build
```

Compose recreates only the containers whose image changed. Old images can be
removed with `docker image prune`.

### Data and backups

Leaderboards and gestures are stored in the SQLite database
`/data/speedyfingers.db`, in the named volume `backend-data`, so they survive
updates and container rebuilds. When the backend starts with no database, it
creates one and imports the gestures from `/data/gestures.json` if that file
exists (written by versions before the database), otherwise from the
committed `backend/data/gestures.json`. After that it never imports again.
Leaderboards start empty.

Score files from older versions (`/data/*_player.json`) are not migrated.
After the first start with the database, you can delete them along with
`/data/gestures.json`:

```bash
docker compose exec backend sh -c 'rm -f /data/*_player.json /data/gestures.json'
```

Back up the database. The image has no `sqlite3` CLI, so this uses Python's
backup API, which is safe while the app is running:

```bash
docker compose exec backend python -c "import sqlite3; d = sqlite3.connect('/data/backup.db'); sqlite3.connect('/data/speedyfingers.db').backup(d); d.close()"
docker compose cp backend:/data/backup.db ./speedyfingers-$(date +%F).db
docker compose exec backend rm /data/backup.db
```

Restore a backup:

```bash
docker compose cp ./speedyfingers-YYYY-MM-DD.db backend:/data/restore.db
docker compose exec backend python -c "import sqlite3; d = sqlite3.connect('/data/speedyfingers.db'); sqlite3.connect('/data/restore.db').backup(d); d.close()"
docker compose exec backend rm /data/restore.db
```

> `docker compose down -v` deletes the volume and all data with it. Use
> `docker compose down` (without `-v`) to stop the stack.

### Moving gestures between servers

[`scripts/gestures.sh`](scripts/gestures.sh) downloads the gestures from a
server's database into a JSON file and uploads such a file to a server. Use it
to back up the gestures recorded in Dev Mode, to copy them from one deployment
to another, or to update the committed seed file `backend/data/gestures.json`.
Leaderboards are not touched.

**Requirements.** You run the script on your own machine. It needs `bash` and
`ssh` (on Windows, use Git Bash or WSL). The server needs nothing besides the
stack from [Deploying to a server](#deploying-to-a-server): the script runs
`docker compose exec` on the server and uses the backend container's Python.
Your SSH user must be allowed to run `docker` without `sudo` (be in the
`docker` group).

1. **Check that you can reach the server.** Use anything `ssh` accepts, for
   example `user@example.com` or a `Host` alias from `~/.ssh/config`:

   ```bash
   ssh user@example.com 'cd ~/speedyfingers && docker compose ps'
   ```

   An SSH key is recommended, otherwise `ssh` asks for your password on every
   command.

2. **Download the gestures:**

   ```bash
   scripts/gestures.sh download user@example.com
   ```

   This writes `gestures-user_example.com-<date>-<time>.json` to the current
   folder. To choose the file name, pass it as the last argument:

   ```bash
   scripts/gestures.sh download user@example.com my-gestures.json
   ```

   The file has the same format as `backend/data/gestures.json`, so you can
   commit it as the new seed file:

   ```bash
   scripts/gestures.sh download user@example.com backend/data/gestures.json
   ```

3. **Upload gestures.** An upload **replaces all gestures** on the server
   with the ones in the file; symbols that aren't in the file are deleted.

   ```bash
   scripts/gestures.sh upload user@other-server.com my-gestures.json
   ```

   The script asks for confirmation, then saves the server's current gestures
   to `gestures-<host>-<date>-<time>-backup.json` before it replaces them. The
   file is checked first, and the replacement runs in a single transaction: if
   anything is wrong, the server keeps its old gestures. The backend serves
   the new gestures right away (no restart needed); open pages may need a reload.

   To undo an upload, upload the backup file:

   ```bash
   scripts/gestures.sh upload user@other-server.com gestures-user_other-server.com-20261008-120000-backup.json
   ```

**Copying the gestures from one server to another** combines both steps:

```bash
scripts/gestures.sh download user@old-server.com gestures.json
scripts/gestures.sh upload user@new-server.com gestures.json
```

**Options** (before the command, see `scripts/gestures.sh --help`):

| Option | Default | Description |
| :----- | :------ | :---------- |
| `-d`, `--dir DIR` | `~/speedyfingers` | Folder with `docker-compose.yml` on the server. Quote a `~` (`-d '~/apps/sf'`) so it's expanded on the server, not on your machine. Can also be set with `SPEEDYFINGERS_DIR`. |
| `-s`, `--service NAME` | `backend` | Compose service of the backend. Can also be set with `SPEEDYFINGERS_SERVICE`. |
| `-y`, `--yes` | | Upload without asking for confirmation, e.g. in scripts. |
| `--no-backup` | | Upload without downloading a backup first. |

For example, for a stack in `/opt/speedyfingers`, uploading without a prompt:

```bash
scripts/gestures.sh -d /opt/speedyfingers -y upload user@example.com gestures.json
```

## Backend (FastAPI)

## Local development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 app.py                 # http://localhost:8000/api/docs
```

There is no proxy locally, so start the backend with
`USE_MOCK_AUTHENTICATION=true TRUSTED_USER_IDS=mock-user python3 app.py` to be
logged in as a trusted mock user (see [Authentication](#authentication)).

### Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

The Vite dev server forwards `/api` to `http://localhost:8000`. To use a
different API URL, set `VITE_API_BASE_URL` (read at build time; the frontend
Docker image accepts it as a build argument). See
[`frontend/README.md`](frontend/README.md) for the frontend's structure and
scripts.

### Smoke test

`backend/test_api.py` sends a few requests to a running backend. It needs
`requests`, which isn't in `requirements.txt`.

```bash
pip install requests
python backend/test_api.py
```

## API

All routes are under `/api`.

| Method | Path | Description |
| :----- | :--- | :---------- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/leaderboard/finger/{single\|multi}` | Top 10 for a game mode |
| `GET` | `/api/me` | The current user: `{id, name, canManageGestures}` |
| `POST` | `/api/score/submit` | Submit `{score, symbols, game_mode, game_type: "finger"}` for the current user. The best score per user id is kept. |
| `GET` | `/api/gestures` | List symbols and their variant counts |
| `GET` | `/api/gestures/{symbol}` | All variants of one symbol |
| `GET` | `/api/gestures/random/get` | A random symbol with its variants |
| `POST` | `/api/gestures` | Add a recorded variant to a symbol (trusted users) |
| `POST` | `/api/gestures/match` | Compare landmarks with a symbol's variants |
| `PATCH` | `/api/gestures/{symbol}/threshold?threshold=0.6` | Set a symbol's match threshold (trusted users) |
| `DELETE` | `/api/gestures/{symbol}` | Delete a symbol (trusted users) |
| `DELETE` | `/api/gestures/{symbol}/{variant_id}` | Delete one variant (trusted users) |

### Authentication

The backend assumes that every request has passed through a trusted proxy,
which sets these headers:

- `X-User-Id`: unique identifier of the user. Leaderboard entries are keyed
  by it.
- `X-User-Name`: display name, shown on the leaderboard.

The backend never takes the player's identity from the request body.
`/api/me` and `/api/score/submit` return `401` without `X-User-Id`. The
backend must therefore only be reachable through that proxy, otherwise
clients could set the headers themselves.

Adding, deleting and re-thresholding gestures is limited to trusted users.
List their ids, comma-separated, in `TRUSTED_USER_IDS` (for Docker, in a
`.env` file next to `docker-compose.yml`; see `.env.sample`):

```bash
TRUSTED_USER_IDS=user-id-1,user-id-2
```

Other users get `403`. For local development without the proxy, set
`USE_MOCK_AUTHENTICATION=true`: requests without `X-User-Id` are then treated
as the user `mock-user` (add it to `TRUSTED_USER_IDS` to edit gestures).

## Project status

This is a hackathon prototype. For what still has to be done before it can be
deployed publicly, see [PRODUCTION_TODO.md](PRODUCTION_TODO.md).
