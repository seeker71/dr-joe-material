#!/usr/bin/env node

// Helper script to update version.json with a new version and changelog entry
// Usage: node scripts/updateVersion.mjs "1.0.1" "Added new feature"

import { promises as fs } from 'fs';
import path from 'path';

const VERSION_FILE = path.join(process.cwd(), 'public', 'version.json');

async function updateVersion(newVersion, changelogEntry) {
  try {
    // Read current version file
    const currentContent = await fs.readFile(VERSION_FILE, 'utf8');
    const current = JSON.parse(currentContent);

    // Update version and add changelog entry
    const updated = {
      version: newVersion,
      updated: new Date().toISOString(),
      changelog: [
        changelogEntry,
        ...current.changelog.slice(0, 9), // Keep last 10 entries
      ],
    };

    // Write updated version file
    await fs.writeFile(VERSION_FILE, JSON.stringify(updated, null, 2) + '\n', 'utf8');
    
    console.log(`✅ Updated version to ${newVersion}`);
    console.log(`📝 Added changelog: ${changelogEntry}`);
    console.log(`📄 Version file: ${VERSION_FILE}`);
  } catch (error) {
    console.error('❌ Error updating version:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scripts/updateVersion.mjs <version> "<changelog entry>"');
  console.error('Example: node scripts/updateVersion.mjs "1.0.1" "Added new feature"');
  process.exit(1);
}

const [version, ...changelogParts] = args;
const changelogEntry = changelogParts.join(' ');

updateVersion(version, changelogEntry);


