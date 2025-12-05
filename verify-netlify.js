#!/usr/bin/env node
/**
 * Netlify Configuration Verification Script
 * Run this to verify your Netlify setup is correct
 */

import fs from 'fs'
import path from 'path'

const checks = []
let hasErrors = false

function check(name, condition, errorMsg, fixMsg) {
  const passed = condition()
  checks.push({ name, passed, errorMsg, fixMsg })
  if (!passed) hasErrors = true
  return passed
}

console.log('🔍 Verifying Netlify Configuration...\n')

// Check 1: netlify.toml exists
check(
  'netlify.toml exists',
  () => fs.existsSync('netlify.toml'),
  'netlify.toml file is missing',
  'Create netlify.toml in the root directory'
)

// Check 2: netlify.toml content
if (fs.existsSync('netlify.toml')) {
  const tomlContent = fs.readFileSync('netlify.toml', 'utf8')
  
  check(
    'Build command configured',
    () => tomlContent.includes('command = "npm run build"') || tomlContent.includes('command = "npm run build"'),
    'Build command not found in netlify.toml',
    'Add: command = "npm run build"'
  )
  
  check(
    'Publish directory configured',
    () => tomlContent.includes('publish = "dist"'),
    'Publish directory not set to "dist"',
    'Add: publish = "dist"'
  )
  
  check(
    'Functions directory configured',
    () => tomlContent.includes('functions = "netlify/functions"'),
    'Functions directory not configured',
    'Add: functions = "netlify/functions"'
  )
  
  check(
    'API redirect configured',
    () => tomlContent.includes('/api/*') && tomlContent.includes('/.netlify/functions/'),
    'API redirect not configured',
    'Add redirect rule: from = "/api/*" to = "/.netlify/functions/:splat"'
  )
}

// Check 3: Function file exists
check(
  'Netlify function exists',
  () => fs.existsSync('netlify/functions/shared-playlists.js'),
  'shared-playlists.js function not found',
  'Create netlify/functions/shared-playlists.js'
)

// Check 4: Function content
if (fs.existsSync('netlify/functions/shared-playlists.js')) {
  const functionContent = fs.readFileSync('netlify/functions/shared-playlists.js', 'utf8')
  
  check(
    'Function uses Supabase',
    () => functionContent.includes('@supabase/supabase-js') || functionContent.includes('createClient'),
    'Function does not import Supabase client',
    'Add Supabase client import'
  )
  
  check(
    'Function has handler export',
    () => functionContent.includes('exports.handler'),
    'Function does not export handler',
    'Add: exports.handler = async (event, context) => {...}'
  )
  
  check(
    'Function handles CORS',
    () => functionContent.includes('Access-Control-Allow-Origin'),
    'Function does not handle CORS',
    'Add CORS headers to function responses'
  )
}

// Check 5: package.json scripts
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  
  check(
    'Build script exists',
    () => pkg.scripts && pkg.scripts.build,
    'Build script not found in package.json',
    'Add: "build": "tsc -b && vite build" to scripts'
  )
  
  check(
    'Supabase dependency installed',
    () => pkg.dependencies && pkg.dependencies['@supabase/supabase-js'],
    '@supabase/supabase-js not in dependencies',
    'Run: npm install @supabase/supabase-js'
  )
}

// Check 6: .gitignore excludes dist
if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf8')
  check(
    'dist excluded from git',
    () => gitignore.includes('dist'),
    'dist directory not in .gitignore',
    'Add "dist" to .gitignore'
  )
}

// Check 7: Public files
check(
  'Public directory exists',
  () => fs.existsSync('public'),
  'Public directory not found',
  'Create public directory'
)

if (fs.existsSync('public')) {
  check(
    'catalog.json exists',
    () => fs.existsSync('public/catalog.json'),
    'catalog.json not found in public directory',
    'Generate catalog.json (see scripts/generateCatalog.mjs)'
  )
}

// Print results
console.log('\n📋 Verification Results:\n')
checks.forEach((check, index) => {
  const icon = check.passed ? '✅' : '❌'
  console.log(`${icon} ${check.name}`)
  if (!check.passed) {
    console.log(`   ⚠️  ${check.errorMsg}`)
    if (check.fixMsg) {
      console.log(`   💡 Fix: ${check.fixMsg}`)
    }
  }
})

console.log('\n' + '='.repeat(50))
if (hasErrors) {
  console.log('\n❌ Some checks failed. Please fix the issues above.')
  console.log('\n📖 See NETLIFY_GIT_SETUP.md for setup instructions.')
  process.exit(1)
} else {
  console.log('\n✅ All checks passed! Your Netlify configuration looks good.')
  console.log('\n📝 Next steps:')
  console.log('   1. Connect your GitHub repo to Netlify')
  console.log('   2. Set environment variables in Netlify dashboard')
  console.log('   3. Trigger your first deployment')
  console.log('\n📖 See NETLIFY_GIT_SETUP.md for detailed instructions.')
  process.exit(0)
}

