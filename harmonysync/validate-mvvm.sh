#!/bin/bash
echo "🔍 MVVM Implementation Validation"
echo "=================================="
echo ""

echo "📊 ViewModels:"
find src/viewmodels -name "*.js" -not -name "index.js" | wc -l
find src/viewmodels -name "*.js" -not -name "index.js" | sort

echo ""
echo "📊 Services:"
find src/services -name "*.js" -not -name "index.js" | wc -l
find src/services -name "*.js" -not -name "index.js" | sort

echo ""
echo "🧪 Test Files:"
find src/__tests__ -name "*.test.js" | wc -l
find src/__tests__ -name "*.test.js" | sort

echo ""
echo "📝 Documentation:"
ls -1 ../MVVM*.md 2>/dev/null | wc -l
ls -1 ../MVVM*.md 2>/dev/null

echo ""
echo "✅ Validation Complete!"
