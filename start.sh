#!/bin/sh
set -e

NODE_ENV=${NODE_ENV:-development}
RUN_SEED=${RUN_SEED:-true}

echo "Running database migrations..."
npx medusa db:migrate

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database..."
  yarn seed || echo "Seeding failed, continuing..."
else
  echo "Skipping database seed (RUN_SEED=$RUN_SEED)."
fi

if [ "$NODE_ENV" = "production" ]; then
  echo "Building Medusa project..."
  yarn build

  echo "Starting Medusa production server..."
  yarn start
else
  echo "Starting Medusa development server..."
  yarn dev
fi
