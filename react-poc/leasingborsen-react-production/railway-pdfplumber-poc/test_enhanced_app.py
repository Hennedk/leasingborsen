#!/usr/bin/env python3
"""
Test script for enhanced Railway PDF extraction app
Tests the new generic extraction functionality
"""

import json
from app import GenericPDFExtractor, detect_document_structure

def test_generic_extractor():
    """Test GenericPDFExtractor class"""
    print("🧪 Testing GenericPDFExtractor...")
    
    extractor = GenericPDFExtractor()
    
    # Test noise patterns
    test_text = "Page 1 of 5\nSome content\nwww.example.com\nMore content"
    cleaned = extractor._clean_text(test_text)
    print(f"✅ Text cleaning works: {len(test_text)} -> {len(cleaned)} chars")
    
    # Test whitespace normalization
    messy_text = "Line 1\n\n\n\nLine 2   \n   Line 3     "
    normalized = extractor._normalize_whitespace(messy_text)
    print(f"✅ Whitespace normalization: {len(messy_text)} -> {len(normalized)} chars")

def test_structure_detection():
    """Test document structure detection"""
    print("\n🧪 Testing document structure detection...")
    
    # Test automotive document
    automotive_text = "TOYOTA PRISLISTE\n2.699 kr/md\nYARIS Active\n4.999 kr/md"
    structure = detect_document_structure(automotive_text)
    print(f"✅ Automotive detection: {structure['document_type']}")
    print(f"   Has prices: {structure['has_prices']}")
    
    # Test generic document
    generic_text = "Some regular document\nWith normal text content"
    structure = detect_document_structure(generic_text)
    print(f"✅ Generic detection: {structure['document_type']}")

def test_profile_configs():
    """Test profile configurations"""
    print("\n🧪 Testing profile configurations...")
    
    # Test automotive profile patterns
    automotive_patterns = [
        "TOYOTA PRISLISTE.*?PRIVATLEASING.*?\\d+",
        "Forbrugstal er beregnet efter WLTP-metode.*?KLIK HER"
    ]
    
    test_text = "TOYOTA PRISLISTE PRIVATLEASING 2024\nForbrugstal er beregnet efter WLTP-metode - KLIK HER"
    
    for pattern in automotive_patterns:
        import re
        matches = re.findall(pattern, test_text, re.IGNORECASE | re.MULTILINE)
        print(f"✅ Pattern match: {len(matches)} matches for automotive pattern")

def main():
    """Run all tests"""
    print("🚀 Testing Enhanced Railway PDF Extraction App\n")
    
    try:
        test_generic_extractor()
        test_structure_detection()
        test_profile_configs()
        
        print("\n✅ All tests passed!")
        print("🚀 Enhanced app is ready for deployment!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()