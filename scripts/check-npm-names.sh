#!/bin/bash
# Check npm availability for potential package names
# Usage: ./scripts/check-npm-names.sh [name1] [name2] ...
# Or pipe names: echo -e "name1\nname2" | ./scripts/check-npm-names.sh

set -uo pipefail

check_name() {
    local name="$1"
    local response
    local http_code

    # npm registry returns 404 for non-existent packages
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "https://registry.npmjs.org/$name")

    if [[ "$http_code" == "404" ]]; then
        echo "✓ $name - AVAILABLE"
        return 0
    elif [[ "$http_code" == "200" ]]; then
        # Get package description for context
        local desc
        desc=$(curl -s "https://registry.npmjs.org/$name" | jq -r '.description // "No description"' 2>/dev/null | head -c 60)
        echo "✗ $name - TAKEN ($desc)"
        return 1
    else
        echo "? $name - ERROR (HTTP $http_code)"
        return 2
    fi
}

# If arguments provided, check those
if [[ $# -gt 0 ]]; then
    for name in "$@"; do
        check_name "$name"
    done
else
    # Otherwise read from stdin
    while IFS= read -r name || [[ -n "$name" ]]; do
        # Skip empty lines and comments
        [[ -z "$name" || "$name" =~ ^# ]] && continue
        check_name "$name"
    done
fi
