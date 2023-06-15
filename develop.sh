#!/usr/bin/env bash

#Run migrations to ensure the database is updated
medusa migrations run

#Start development environment
medusa develop