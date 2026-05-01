#!/bin/bash
# BD Digital Services — Full Project Startup
# Starts all services: API Server, Frontend, Component Preview, and GitHub Sync.
# Each service is started only if its port is not already bound (idempotent).

is_port_open() {
  # Use bash TCP redirection (no external tools required)
  (bash -c "echo >/dev/tcp/localhost/$1" 2>/dev/null)
}

wait_for_port() {
  local port=$1 retries=30
  while [ $retries -gt 0 ]; do
    is_port_open "$port" && return 0
    sleep 1; retries=$((retries-1))
  done
  return 1
}

ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null)"
cd "$ROOT" || exit 1

echo "==================================================="
echo "  BD Digital Services — Starting All Services"
echo "==================================================="

# 1. API Server (Express + PostgreSQL) — port 8080
if is_port_open 8080; then
  echo "  ✓ API Server         already running (port 8080)"
else
  echo "  ↑ API Server         starting on port 8080..."
  PORT=8080 pnpm --filter @workspace/api-server run dev \
    >> /tmp/api-server.log 2>&1 &
  wait_for_port 8080 && echo "  ✓ API Server         ready" \
    || echo "  ✗ API Server         failed (check /tmp/api-server.log)"
fi

# 2. Frontend App (React + Vite) — port 18910
if is_port_open 18910; then
  echo "  ✓ Frontend App       already running (port 18910)"
else
  echo "  ↑ Frontend App       starting on port 18910..."
  PORT=18910 pnpm --filter @workspace/bd-digital-services run dev \
    >> /tmp/bd-frontend.log 2>&1 &
  wait_for_port 18910 && echo "  ✓ Frontend App       ready" \
    || echo "  ✗ Frontend App       failed (check /tmp/bd-frontend.log)"
fi

# 3. Component Preview (Mockup Sandbox) — port 8081
if is_port_open 8081; then
  echo "  ✓ Component Preview  already running (port 8081)"
else
  echo "  ↑ Component Preview  starting on port 8081..."
  PORT=8081 pnpm --filter @workspace/mockup-sandbox run dev \
    >> /tmp/mockup-sandbox.log 2>&1 &
  wait_for_port 8081 && echo "  ✓ Component Preview  ready" \
    || echo "  ✗ Component Preview  failed (check /tmp/mockup-sandbox.log)"
fi

echo "==================================================="
echo "  All services confirmed. Starting GitHub sync..."
echo "==================================================="

# 4. GitHub Bidirectional Sync (runs in foreground, every 5 min)
exec bash "$ROOT/scripts/github-sync.sh"
