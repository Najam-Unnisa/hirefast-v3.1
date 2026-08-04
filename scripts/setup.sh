#!/usr/bin/env bash
set -euo pipefail

echo "HireFast setup helper"
echo "1) Copy .env.example -> .env"
echo "2) Start postgres + redis"
echo "3) Generate Prisma client and run migrations"
echo "4) Start apps with pnpm dev"
