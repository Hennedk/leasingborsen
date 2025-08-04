#!/bin/bash

echo "Auto-Crop Feature Test Runner"
echo "============================"
echo ""
echo "Prerequisites:"
echo "- Deno runtime must be installed"
echo "- Run from project root directory"
echo ""

# Check if Deno is installed
if ! command -v deno &> /dev/null; then
    echo "ERROR: Deno is not installed!"
    echo "Please install Deno from: https://deno.land/manual/getting_started/installation"
    exit 1
fi

echo "Running auto-crop unit tests..."
echo "-------------------------------"
deno test supabase/functions/remove-bg/__tests__/auto-crop.test.ts --allow-net

echo ""
echo "Running integration tests..."
echo "---------------------------"
deno test supabase/functions/remove-bg/__tests__/integration.test.ts --allow-net

echo ""
echo "Running all tests with coverage..."
echo "---------------------------------"
deno test --coverage=coverage supabase/functions/remove-bg/__tests__/ --allow-net

echo ""
echo "Test run complete!"
echo ""
echo "To generate coverage report:"
echo "deno coverage coverage --lcov > coverage.lcov"