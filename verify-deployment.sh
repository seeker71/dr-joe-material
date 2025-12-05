#!/bin/bash
# Deployment Verification Script
# Checks if dr-joe-material.netlify.app is deployed correctly

SITE_URL="https://dr-joe-material.netlify.app"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Verifying deployment of $SITE_URL"
echo ""

# Check 1: Main site is accessible
echo "1. Checking main site..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Main site is accessible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ Main site returned HTTP $HTTP_CODE${NC}"
fi

# Check 2: API validation endpoint
echo ""
echo "2. Checking API validation endpoint..."
VALIDATE_RESPONSE=$(curl -s "$SITE_URL/api/shared-playlists/validate")
if echo "$VALIDATE_RESPONSE" | grep -q "supabaseConfigured"; then
    echo -e "${GREEN}✅ Validation endpoint is working${NC}"
    echo "   Response preview:"
    echo "$VALIDATE_RESPONSE" | head -5 | sed 's/^/   /'
else
    echo -e "${RED}❌ Validation endpoint not working or not found${NC}"
    echo "   Response: $VALIDATE_RESPONSE"
fi

# Check 3: API shared playlists endpoint
echo ""
echo "3. Checking shared playlists API..."
PLAYLISTS_RESPONSE=$(curl -s "$SITE_URL/api/shared-playlists")
if echo "$PLAYLISTS_RESPONSE" | grep -q "\[\]" || echo "$PLAYLISTS_RESPONSE" | grep -q "\"id\""; then
    echo -e "${GREEN}✅ Shared playlists API is working${NC}"
    PLAYLIST_COUNT=$(echo "$PLAYLISTS_RESPONSE" | grep -o "\"id\"" | wc -l | tr -d ' ')
    echo "   Found $PLAYLIST_COUNT playlist(s)"
else
    echo -e "${YELLOW}⚠️  Shared playlists API response: $PLAYLISTS_RESPONSE${NC}"
fi

# Check 4: Test page
echo ""
echo "4. Checking test page..."
TEST_PAGE=$(curl -s "$SITE_URL/test-supabase.html")
if echo "$TEST_PAGE" | grep -q "Supabase Setup Validation"; then
    echo -e "${GREEN}✅ Test page is accessible${NC}"
else
    echo -e "${RED}❌ Test page not found or not accessible${NC}"
fi

# Check 5: Version file
echo ""
echo "5. Checking version.json..."
VERSION=$(curl -s "$SITE_URL/version.json")
if echo "$VERSION" | grep -q "version"; then
    echo -e "${GREEN}✅ Version file is accessible${NC}"
    echo "$VERSION" | grep "version" | head -1 | sed 's/^/   /'
else
    echo -e "${YELLOW}⚠️  Version file not found${NC}"
fi

# Check 6: Catalog file
echo ""
echo "6. Checking catalog.json..."
CATALOG=$(curl -s "$SITE_URL/catalog.json" | head -c 100)
if [ ${#CATALOG} -gt 10 ]; then
    echo -e "${GREEN}✅ Catalog file is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Catalog file may be missing or empty${NC}"
fi

# Check 7: CORS headers on API
echo ""
echo "7. Checking CORS headers..."
CORS_HEADERS=$(curl -s -I "$SITE_URL/api/shared-playlists" | grep -i "access-control")
if [ -n "$CORS_HEADERS" ]; then
    echo -e "${GREEN}✅ CORS headers are present${NC}"
    echo "$CORS_HEADERS" | sed 's/^/   /'
else
    echo -e "${YELLOW}⚠️  CORS headers not found${NC}"
fi

echo ""
echo "=========================================="
echo "📊 Deployment Summary"
echo "=========================================="
echo "Site URL: $SITE_URL"
echo "Test Page: $SITE_URL/test-supabase.html"
echo "Validation API: $SITE_URL/api/shared-playlists/validate"
echo ""
echo "✅ If all checks passed, your deployment is working!"
echo "📝 Next: Visit the test page to verify Supabase configuration"

