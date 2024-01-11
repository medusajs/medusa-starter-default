#!/usr/bin/env bash

#Run migrations to ensure the database is updated
medusa migrations run

npm run build

#Start development environment
medusa start