#!/usr/bin/env bash

#Run migrations to ensure the database is updated
npx medusa db:migrate

npm run build

#Start development environment
npx medusa start