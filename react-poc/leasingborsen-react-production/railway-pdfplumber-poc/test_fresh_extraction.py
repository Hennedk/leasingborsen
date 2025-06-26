#!/usr/bin/env python3
"""
Test fresh extraction with all fixes
"""
import json
from extract_with_template import ToyotaDanishExtractor

# Load template config
with open('toyota-template-config.json', 'r') as f:
    template_config = json.load(f)

# Load PDF content
with open('Privatleasing_priser.pdf', 'rb') as f:
    pdf_content = f.read()

# Create extractor instance
extractor = ToyotaDanishExtractor(template_config)

# Run extraction
result = extractor.extract_from_pdf(pdf_content)

# Save results
with open('toyota_extraction_fixed.json', 'w') as f:
    json.dump({
        'success': result.success,
        'items_extracted': len(result.items),
        'items': result.items,
        'metadata': result.metadata,
        'errors': result.errors
    }, f, indent=2)

print(f"Extraction complete: {len(result.items)} items saved to toyota_extraction_fixed.json")

# Count unique combinations
unique_combinations = set()
for item in result.items:
    combo = f"{item.get('make', '')} {item.get('model', '')} {item.get('variant', '')}"
    unique_combinations.add(combo)

print(f"Unique make/model/variant combinations: {len(unique_combinations)}")