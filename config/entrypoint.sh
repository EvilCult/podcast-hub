#!/bin/sh
set -e

cron

exec node build
