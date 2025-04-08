#!/bin/bash

# Pre-commit hook to ensure no sensitive information is committed
# Place this file in .git/hooks/pre-commit and make it executable

echo "Running pre-commit hook to check for sensitive information..."

# Reset frontend configuration to placeholders
node scripts/reset-frontend-config.js

# Check if any sensitive patterns are present in staged files
SENSITIVE_PATTERNS=(
  "us-east-1:[a-f0-9-]+"  # Identity Pool ID pattern
  "[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com"  # Google Client ID pattern
  "awscognitowebidentityfede-[a-z0-9]+"  # S3 bucket name pattern
)

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only)

# Flag to track if sensitive data was found
SENSITIVE_DATA_FOUND=0

# Check each staged file for sensitive patterns
for FILE in $STAGED_FILES; do
  # Skip binary files and .env files (which should be gitignored anyway)
  if [[ "$FILE" == *.env* ]] || [[ ! -f "$FILE" ]]; then
    continue
  fi
  
  # Check for sensitive patterns
  for PATTERN in "${SENSITIVE_PATTERNS[@]}"; do
    if grep -q -E "$PATTERN" "$FILE"; then
      echo "⚠️  WARNING: Sensitive information found in $FILE matching pattern: $PATTERN"
      SENSITIVE_DATA_FOUND=1
    fi
  done
done

if [ $SENSITIVE_DATA_FOUND -eq 1 ]; then
  echo "❌ Commit aborted due to sensitive information in staged files."
  echo "Please remove the sensitive information or use placeholders instead."
  exit 1
else
  echo "✅ No sensitive information detected in staged files."
  exit 0
fi
