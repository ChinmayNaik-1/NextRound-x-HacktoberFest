#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "Starting NextRound..."
echo "Launching Electron frontend..."

npm --prefix "$FRONTEND_DIR" run electron:dev