#!/usr/bin/env bash
#
# Download or upload the gestures of a SpeedyFingers deployment over SSH.
#
#   scripts/gestures.sh download <ssh-host> [file]
#   scripts/gestures.sh upload   <ssh-host> <file>
#
# The file has the same format as backend/data/gestures.json. An upload
# replaces all gestures on the server; the current ones are downloaded to a
# backup file first. See the "Moving gestures between servers" section of the
# README for a tutorial.
#
# The server only needs the Docker Compose stack from the README. The Python
# code below runs inside the backend container, using the backend's own
# database module, so nothing has to be installed on the server.

set -euo pipefail

REMOTE_DIR="${SPEEDYFINGERS_DIR:-}"
SERVICE="${SPEEDYFINGERS_SERVICE:-backend}"
ASSUME_YES=false
NO_BACKUP=false

usage() {
    cat <<'EOF'
Usage:
  gestures.sh [options] download <ssh-host> [file]
      Save the server's gestures to <file>
      (default: gestures-<ssh-host>-<date>.json).

  gestures.sh [options] upload <ssh-host> <file>
      Replace ALL gestures on the server with the ones in <file>.
      The server's current gestures are saved to a backup file first.

<ssh-host> is anything `ssh` accepts, e.g. `user@example.com` or a Host
alias from ~/.ssh/config.

Options:
  -d, --dir DIR        Folder with docker-compose.yml on the server
                       (default: ~/speedyfingers, or $SPEEDYFINGERS_DIR)
  -s, --service NAME   Compose service of the backend
                       (default: backend, or $SPEEDYFINGERS_SERVICE)
  -y, --yes            Upload without asking for confirmation
      --no-backup      Upload without saving a backup first
  -h, --help           Show this help
EOF
}

die() {
    echo "error: $*" >&2
    exit 1
}

# Runs inside the backend container. The first argument is the command; an
# upload reads the gestures JSON from stdin.
read -r -d '' HELPER <<'PY' || true
import json
import sys

import database
from models import GestureDefinition


def export():
    with database._read() as conn:
        rows = conn.execute("SELECT id, symbol, threshold FROM gestures ORDER BY id").fetchall()
        gestures = {
            row["symbol"]: database._load_gesture(conn, row).model_dump(mode="json")
            for row in rows
        }
    sys.stdout.buffer.write(json.dumps(gestures, indent=2).encode("utf-8") + b"\n")
    count = sum(len(g["variants"]) for g in gestures.values())
    print(f"Downloaded {len(gestures)} symbols with {count} variants", file=sys.stderr)


def replace():
    data = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    if not isinstance(data, dict):
        sys.exit("The file must be a JSON object that maps symbols to gestures")
    # Validate everything before touching the database
    definitions = {symbol: GestureDefinition(**gesture) for symbol, gesture in data.items()}
    with database._write() as conn:
        # Variants are removed by ON DELETE CASCADE
        conn.execute("DELETE FROM gestures")
        # As in the import of a new database, the key wins over "symbol"
        for symbol, definition in definitions.items():
            gesture_id = conn.execute(
                "INSERT INTO gestures (symbol, threshold) VALUES (?, ?)",
                (symbol, definition.threshold),
            ).lastrowid
            for variant in definition.variants:
                database._insert_variant(conn, gesture_id, variant)
    count = sum(len(d.variants) for d in definitions.values())
    print(f"Uploaded {len(definitions)} symbols with {count} variants", file=sys.stderr)


# Creates the database if the backend has never started
database.init_db()
{"export": export, "replace": replace}[sys.argv[1]]()
PY

# Runs the helper with the given command in the backend container on $HOST,
# passing this function's stdin through. The helper itself goes over the
# same stdin as one base64 line, which avoids quoting it for the remote shell.
run_helper() {
    local command="$1" encoded remote
    local python="python -c 'import base64, sys; exec(base64.b64decode(sys.stdin.buffer.readline()))' $command"
    if [[ -n "$REMOTE_DIR" ]]; then
        # REMOTE_DIR is left unquoted so that a leading ~ expands on the server
        remote="cd $REMOTE_DIR && docker compose exec -T $SERVICE $python"
    else
        # Find the container by the label Compose puts on it, so the script
        # works no matter where the compose file is
        remote='set -- $(docker ps -q --filter label=com.docker.compose.service='"$SERVICE"')
if [ $# -ne 1 ]; then
    echo "error: found $# running containers of the Compose service '"$SERVICE"'; is the stack running? If there are several stacks, pass --dir" >&2
    exit 1
fi
docker exec -i "$1" '"$python"
    fi
    encoded="$(printf '%s' "$HELPER" | base64 | tr -d '\n')"
    { printf '%s\n' "$encoded"; cat; } | ssh "$HOST" "$remote"
}

# Downloads the gestures to $1, without leaving a partial file behind.
download_to() {
    local file="$1" tmp
    tmp="$(mktemp "${file}.XXXXXX")"
    if ! run_helper export </dev/null >"$tmp"; then
        rm -f "$tmp"
        die "download failed"
    fi
    mv "$tmp" "$file"
}

default_file() {
    # Keep only characters that are safe in file names
    local name="${HOST//[^A-Za-z0-9._-]/_}"
    echo "gestures-${name}-$(date +%Y%m%d-%H%M%S)$1.json"
}

cmd_download() {
    local file="${1:-$(default_file "")}"
    download_to "$file"
    echo "Saved to $file"
}

cmd_upload() {
    local file="${1:-}"
    [[ -n "$file" ]] || die "upload needs a file (see --help)"
    [[ -f "$file" ]] || die "no such file: $file"

    if [[ "$ASSUME_YES" != true ]]; then
        read -r -p "Replace ALL gestures on $HOST with $file? [y/N] " answer
        [[ "$answer" == [yY]* ]] || die "aborted"
    fi

    if [[ "$NO_BACKUP" != true ]]; then
        local backup
        backup="$(default_file "-backup")"
        download_to "$backup"
        echo "Backed up the current gestures to $backup"
    fi

    run_helper replace <"$file" || die "upload failed; the server's gestures are unchanged"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--dir) REMOTE_DIR="${2:?--dir needs a value}"; shift 2 ;;
        -s|--service) SERVICE="${2:?--service needs a value}"; shift 2 ;;
        -y|--yes) ASSUME_YES=true; shift ;;
        --no-backup) NO_BACKUP=true; shift ;;
        -h|--help) usage; exit 0 ;;
        -*) die "unknown option: $1 (see --help)" ;;
        *) break ;;
    esac
done

[[ $# -ge 2 ]] || { usage >&2; exit 1; }
COMMAND="$1"
HOST="$2"
shift 2

case "$COMMAND" in
    download) cmd_download "$@" ;;
    upload) cmd_upload "$@" ;;
    *) die "unknown command: $COMMAND (see --help)" ;;
esac
