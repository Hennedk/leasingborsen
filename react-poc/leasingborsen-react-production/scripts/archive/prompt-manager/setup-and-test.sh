#!/bin/bash

# Setup and test prompt manager with OpenAI
echo "🔐 Setting up OpenAI API key from Supabase secrets..."
echo ""
echo "Please follow these steps:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/hqqouszbgskteivjoems/functions/secrets"
echo "2. Find the OPENAI_API_KEY value"
echo "3. Copy the key (it starts with 'sk-')"
echo ""
read -p "Paste your OpenAI API key here: " OPENAI_API_KEY

if [[ -z "$OPENAI_API_KEY" ]]; then
    echo "❌ No API key provided"
    exit 1
fi

# Export the key for this session
export OPENAI_API_KEY="$OPENAI_API_KEY"

echo ""
echo "✅ API key set for this session"
echo ""

# Option to save to .env.local for future use
read -p "Would you like to save this to .env.local for future use? (y/n): " save_env

if [[ "$save_env" == "y" ]]; then
    echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> .env.local
    echo "✅ Saved to .env.local (this file is gitignored)"
fi

echo ""
echo "🧪 Running connection test..."
echo ""

# Run the test
npm run prompts:test