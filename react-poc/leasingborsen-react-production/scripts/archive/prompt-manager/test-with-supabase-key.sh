#!/bin/bash

echo "🔐 Testing Prompt Manager with OpenAI API"
echo ""

# Check if .env.local exists and has the key
if [ -f .env.local ] && grep -q "OPENAI_API_KEY" .env.local; then
    echo "✅ Found OPENAI_API_KEY in .env.local"
    export $(grep OPENAI_API_KEY .env.local | xargs)
    npm run prompts:test
    exit 0
fi

# Check if key is in environment
if [ ! -z "$OPENAI_API_KEY" ]; then
    echo "✅ Found OPENAI_API_KEY in environment"
    npm run prompts:test
    exit 0
fi

echo "📋 To run the prompt manager test, you need to:"
echo ""
echo "1. Get your OPENAI_API_KEY from Supabase dashboard:"
echo "   https://supabase.com/dashboard/project/hqqouszbgskteivjoems/functions/secrets"
echo ""
echo "2. Run one of these commands:"
echo ""
echo "   Option A (one-time):"
echo "   OPENAI_API_KEY=sk-... npm run prompts:test"
echo ""
echo "   Option B (save for development):"
echo "   echo 'OPENAI_API_KEY=sk-...' >> .env.local"
echo "   npm run prompts:test"
echo ""
echo "The test will:"
echo "✨ Create a test prompt in your OpenAI account"
echo "📋 List all your prompts"
echo "🔄 Update the prompt"
echo "🔗 Give you a link to view it in OpenAI's UI"
echo ""

# Also check if we can hint at the key format from existing configs
if [ -f .env.example ]; then
    example_key=$(grep OPENAI_API_KEY .env.example 2>/dev/null | cut -d'=' -f2)
    if [ ! -z "$example_key" ]; then
        echo "💡 Hint: Your key should look similar to: ${example_key:0:7}..."
    fi
fi