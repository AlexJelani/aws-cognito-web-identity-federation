#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Patterns for sensitive information
const patterns = [
    {
        name: 'AWS Access Key ID',
        regex: /AKIA[0-9A-Z]{16}/g
    },
    {
        name: 'AWS Secret Access Key',
        regex: /[0-9a-zA-Z/+]{40}/g
    },
    {
        name: 'AWS Cognito Identity Pool ID',
        regex: /us-[a-z]{2}-[0-9]{1}:[0-9a-f-]{36}/g
    },
    {
        name: 'Google OAuth Client ID',
        regex: /[0-9]{12}-[a-zA-Z0-9]{32}\.apps\.googleusercontent\.com/g
    }
];

// Get staged files
const stagedFiles = execSync('git diff --cached --name-only')
    .toString()
    .split('\n')
    .filter(Boolean);

let foundSecrets = false;

// Check each staged file
for (const file of stagedFiles) {
    if (!fs.existsSync(file)) continue;
    
    const content = fs.readFileSync(file, 'utf8');
    
    for (const pattern of patterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
            console.error(`ERROR: Found possible ${pattern.name} in ${file}`);
            foundSecrets = true;
        }
    }
}

if (foundSecrets) {
    console.error('\nCommit REJECTED: Please remove sensitive information before committing.');
    process.exit(1);
}

process.exit(0);