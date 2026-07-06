#!/bin/bash
# Build production bundle by concatenating JS modules into a single IIFE.
# Strips import/export keywords since functions share a single closure.

set -euo pipefail

OUTPUT="js/bundle.js"

# Files in dependency order (no-dependency modules first).
FILES=(
  js/cache.js
  js/utils.js
  js/stops.js
  js/routes.js
  js/notifications.js
  js/feedback.js
  js/index.js
  js/router.js
)

echo "(() => {" > "$OUTPUT"
echo "  'use strict';" >> "$OUTPUT"

for file in "${FILES[@]}"; do
  name=$(basename "$file")
  echo "" >> "$OUTPUT"
  echo "  // ============================================================" >> "$OUTPUT"
  echo "  // $name" >> "$OUTPUT"
  echo "  // ============================================================" >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  # Delete import lines, delete single-line `export { ... };` statements,
  # strip export keyword from declarations, indent every line two spaces.
  sed -E '/^[[:space:]]*import /d' "$file" \
    | sed -E '/^[[:space:]]*export \{.*\};[[:space:]]*$/d' \
    | sed -E 's/^([[:space:]]*)export /\1/' \
    | sed -E 's/^/  /' \
    >> "$OUTPUT"
done

echo "" >> "$OUTPUT"
echo "})();" >> "$OUTPUT"

echo "Bundle written to $OUTPUT ($(wc -l < "$OUTPUT" | tr -d ' ') lines)"