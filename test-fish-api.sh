#!/bin/bash
# Quick Test for Fish API
# Usage: ./test-fish-api.sh path/to/fish-photo.jpg

API_URL="https://fishapi.nickot.is"
API_KEY="${FISH_API_KEY:-your-api-key-here}"

if [ -z "$1" ]; then
  echo "❌ Error: No image file provided"
  echo "Usage: ./test-fish-api.sh path/to/fish-photo.jpg"
  exit 1
fi

IMAGE_PATH="$1"

if [ ! -f "$IMAGE_PATH" ]; then
  echo "❌ Error: File not found: $IMAGE_PATH"
  exit 1
fi

echo "🔍 Testing Fish API..."
echo "📸 Image: $IMAGE_PATH"
echo "🌐 API: $API_URL"
echo ""

# Test /health endpoint
echo "1️⃣ Testing /health endpoint..."
HEALTH=$(curl -s "$API_URL/health")
echo "Response: $HEALTH"
echo ""

# Test /predict endpoint
echo "2️⃣ Testing /predict endpoint..."
RESPONSE=$(curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -F "file=@$IMAGE_PATH" \
  -F "topk=3" \
  "$API_URL/predict")

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parse results
DETECTIONS=$(echo "$RESPONSE" | jq -r '.detections // 0' 2>/dev/null)

if [ "$DETECTIONS" -gt 0 ]; then
  echo "✅ Success! Found $DETECTIONS detection(s)"
  echo ""
  echo "Top Results:"
  echo "$RESPONSE" | jq -r '.results[] | "  🐟 \(.species) - \(.accuracy * 100 | round)% confidence"' 2>/dev/null
else
  echo "⚠️  No fish detected or error occurred"
  echo "Check API key and image quality"
fi

echo ""
echo "💡 Tip: Set FISH_API_KEY environment variable:"
echo "   export FISH_API_KEY=your-key"
