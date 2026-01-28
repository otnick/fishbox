#!/bin/bash

# FishBox Build Fix Script
# Fixes common build issues

echo "🔧 Fixing FishBox Build Issues..."

# 1. Clear Next.js cache
echo "1️⃣ Clearing Next.js cache..."
rm -rf .next

# 2. Clear node_modules cache (optional, only if needed)
# echo "2️⃣ Clearing node_modules cache..."
# rm -rf node_modules
# npm install

# 3. Build
echo "3️⃣ Building..."
npm run build

echo "✅ Done! If build still fails, run:"
echo "   rm -rf node_modules && npm install && npm run build"
