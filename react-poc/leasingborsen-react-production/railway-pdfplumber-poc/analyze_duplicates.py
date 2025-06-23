#!/usr/bin/env python3
"""
Analyze duplicate entries in Toyota extraction results
"""

# Sample extraction data from console log
items = [
    {"model": "AYGO X", "variant": "Active", "engine": "1.0 benzin 72 hk automatgear", "id": "aygox_active_72hp_auto"},
    {"model": "AYGO X", "variant": "Pulse", "engine": "1.0 benzin 72 hk automatgear", "id": "aygox_pulse_72hp_auto"},
    {"model": "AYGO X", "variant": "Active", "engine": "1.0 benzin 72 hk automatgear", "id": "aygox_active_72hp_auto"},  # Duplicate
    {"model": "AYGO X", "variant": "Pulse", "engine": "1.0 benzin 72 hk automatgear", "id": "aygox_pulse_72hp_auto"},  # Duplicate
    {"model": "BZ4X", "variant": "Executive Panorama", "engine": "73.1 kWh, 343 hk AWD", "id": "bz4x_executive_panorama_343hp_awd"},
    {"model": "BZ4X", "variant": "Executive Panorama", "engine": "73.1 kWh, 343 hk AWD", "id": "bz4x_executive_panorama_343hp_awd"},  # Duplicate
]

print("🔍 Analyzing Toyota Extraction Duplicates")
print("=" * 60)

# Count occurrences
from collections import Counter

# Create unique keys
unique_keys = []
for item in items:
    key = f"{item['model']}|{item['variant']}|{item['engine']}"
    unique_keys.append(key)

# Count duplicates
counts = Counter(unique_keys)
duplicates = {k: v for k, v in counts.items() if v > 1}

print(f"\n📊 Total items extracted: {len(items)}")
print(f"📊 Unique combinations: {len(counts)}")
print(f"📊 Duplicate entries: {sum(v - 1 for v in counts.values() if v > 1)}")

if duplicates:
    print("\n🔴 Duplicate entries found:")
    for key, count in duplicates.items():
        model, variant, engine = key.split('|')
        print(f"  - {model} {variant} ({engine}): appears {count} times")

print("\n💡 Analysis:")
print("The issue is not with ID generation - the IDs are correctly identifying duplicates.")
print("The problem is that the PDF extraction is finding the same car multiple times.")
print("\nThis could be because:")
print("1. The same car appears on multiple pages in the PDF")
print("2. The extraction logic is processing tables multiple times")
print("3. There's a missing deduplication step in the extraction process")

print("\n✅ Solution:")
print("We need to add deduplication logic in the extraction process")
print("to ensure each unique model/variant/engine combination is only extracted once.")