#!/bin/sh
set -e

NODE_ENV=${NODE_ENV:-development}
RUN_SEED=${RUN_SEED:-false}
HOST=${HOST:-0.0.0.0}
PORT=${PORT:-9000}
export NODE_ENV RUN_SEED HOST PORT

echo "Running database migrations..."
echo "Working directory: $(pwd)"
yarn medusa db:migrate

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database..."
  yarn seed || echo "Seeding failed, continuing..."
else
  echo "Skipping database seed (RUN_SEED=$RUN_SEED)."
fi

if [ "$NODE_ENV" = "production" ]; then
  echo "Building Medusa project..."
  yarn build

  if [ -d ".medusa/server/public" ]; then
    echo "Syncing admin build to public directory..."
    mkdir -p public
    cp -R .medusa/server/public/* public/
  fi

  echo "Starting Medusa production server..."
  yarn start
else
  echo "Starting Medusa development server..."
  yarn dev
fi
