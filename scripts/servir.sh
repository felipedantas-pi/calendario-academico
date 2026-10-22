#!/usr/bin/env sh
# Servidor local (macOS/Linux): ./scripts/servir.sh  ->  http://localhost:5173
cd "$(dirname "$0")/.." || exit 1
echo "Servindo em http://localhost:5173 (Ctrl+C para parar)"
exec python3 -m http.server 5173
