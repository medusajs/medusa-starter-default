#!/usr/bin/env bash

#Run migrations to ensure the database is updated
medusa migrations run

node ./node_modules/@medusajs/medusa/dist/scripts/migrate-inventory-items.js

#Start development environment
medusa develop