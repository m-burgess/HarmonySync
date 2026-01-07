#!/bin/bash
# Script to remove Rust/Tauri code after successful Electron migration

set -e

echo "🗑️  Rust/Tauri Code Removal Script"
echo "=================================="
echo ""
echo "⚠️  WARNING: This will permanently remove all Rust code!"
echo "Make sure:"
echo "  1. Electron version is working"
echo "  2. All features tested and verified"
echo "  3. You have a backup if needed"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Step 1: Removing Rust backend directory..."
if [ -d "harmonysync/src-tauri" ]; then
    rm -rf harmonysync/src-tauri
    echo "✅ Removed harmonysync/src-tauri/"
else
    echo "⚠️  harmonysync/src-tauri/ not found, skipping"
fi

echo ""
echo "Step 2: Removing Cargo files..."
rm -f harmonysync/Cargo.toml harmonysync/Cargo.lock
echo "✅ Removed Cargo files"

echo ""
echo "Step 3: Updating harmonysync/package.json..."
if [ -f "harmonysync/package.json" ]; then
    # Create backup
    cp harmonysync/package.json harmonysync/package.json.bak
    
    # Remove Tauri scripts using sed
    sed -i '/"tauri"/d' harmonysync/package.json
    sed -i '/"tauri:dev"/d' harmonysync/package.json
    sed -i '/"tauri:build"/d' harmonysync/package.json
    sed -i '/"launch:nosandbox"/d' harmonysync/package.json
    
    echo "✅ Updated harmonysync/package.json (backup at .bak)"
else
    echo "⚠️  harmonysync/package.json not found"
fi

echo ""
echo "Step 4: Removing Tauri dependencies from harmonysync/package.json..."
if [ -f "harmonysync/package.json" ]; then
    # Remove Tauri packages
    cd harmonysync
    npm uninstall @tauri-apps/cli @tauri-apps/api @tauri-apps/plugin-dialog @tauri-apps/plugin-fs 2>/dev/null || true
    cd ..
    echo "✅ Removed Tauri npm packages"
else
    echo "⚠️  Could not update dependencies"
fi

echo ""
echo "Step 5: Checking for remaining Tauri references..."
echo "Searching for @tauri-apps imports in src files..."
if grep -r "@tauri-apps" harmonysync/src/ 2>/dev/null; then
    echo ""
    echo "⚠️  Found remaining Tauri imports! Please update these files to use electron-adapter"
    echo "See MIGRATION_GUIDE.md for instructions"
else
    echo "✅ No @tauri-apps imports found in harmonysync/src/"
fi

echo ""
echo "Step 6: Summary"
echo "=============="
echo "✅ Rust backend removed"
echo "✅ Cargo files removed"  
echo "✅ Package.json updated"
echo "✅ Tauri dependencies removed"
echo ""
echo "Next steps:"
echo "  1. Test the Electron app thoroughly: npm run dev"
echo "  2. Update any remaining Tauri imports in React components"
echo "  3. Remove harmonysync/package.json.bak if everything works"
echo "  4. Commit changes: git add . && git commit -m 'Remove Rust/Tauri code'"
echo ""
echo "Done! 🎉"
