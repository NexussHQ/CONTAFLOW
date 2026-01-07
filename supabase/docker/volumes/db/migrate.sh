#!/bin/bash
# Custom migrate.sh - Run Supabase internal scripts with error tolerance
# This allows pre-created roles in 00-init.sh to coexist with Supabase's default setup
# Errors like "role already exists" are non-fatal and can be safely ignored

set -e  # Exit on error, but we'll handle each script individually

echo "Running Supabase internal migration scripts (with error tolerance)..."

for f in /docker-entrypoint-initdb.d/init-scripts/*.sql; do
    if [ -f "$f" ]; then
        echo "migrate.sh: running $f"
        # Run without ON_ERROR_STOP so duplicate objects don't kill the process
        psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f" 2>&1 || {
            echo "migrate.sh: Warning - $f had errors (likely duplicate objects, continuing...)"
        }
    fi
done

echo "Supabase internal migrations completed."
