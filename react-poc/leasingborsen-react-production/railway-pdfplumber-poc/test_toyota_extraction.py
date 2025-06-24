#!/usr/bin/env python3
"""
Comprehensive test suite for Toyota variant extraction fixes

This module provides unit tests, integration tests, and performance benchmarks
for the enhanced Toyota variant extraction system.
"""

import unittest
import logging
import time
from typing import List, Dict, Any
from unittest.mock import patch, MagicMock

from toyota_variant_extraction_fixes_enhanced import (
    ToyotaVariantExtractor,
    TransmissionType,
    DrivetrainType,
    VariantType,
    ExtractionStats
)


class TestToyotaVariantExtractor(unittest.TestCase):
    """Test cases for ToyotaVariantExtractor"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Configure logging for tests
        logging.basicConfig(level=logging.DEBUG)
        
        # Create extractor instance
        self.extractor = ToyotaVariantExtractor()
        
        # Sample test data
        self.sample_aygo_x_data = [
            {
                "model": "AYGO X",
                "variant": "Active",
                "engine_specification": "1.0 benzin 72 hk automatgear",
                "monthly_price": 2699,
                "source": {"raw_line": "Active 2.699 4.999 37.387 102.163 20,83/110 15.000 590"}
            },
            {
                "model": "AYGO X", 
                "variant": "Pulse",
                "engine_specification": "1.0 benzin 72 hk",
                "monthly_price": 2799,
                "source": {"raw_line": "Pulse 2.799 4.999 37.387 102.163 20,83/110 15.000 590"}
            }
        ]
        
        self.sample_bz4x_data = [
            {
                "model": "BZ4X",
                "variant": "Active",
                "engine_specification": "57.7 kWh, 167 hk",
                "monthly_price": 3999,
                "source": {"raw_line": "Active 3.999 9.999 57.987 153.963 136 444 57,7/54 15.000 420"}
            },
            {
                "model": "BZ4X",
                "variant": "Executive Panorama", 
                "engine_specification": "73.1 kWh, 343 hk AWD",
                "monthly_price": 5499,
                "source": {"raw_line": "Executive Panorama 5.499 12.999 75.987 203.963 168 394 73,1/68 15.000 420"}
            }
        ]
        
        self.sample_yaris_cross_data = [
            {
                "model": "YARIS CROSS",
                "variant": "Active",
                "engine_specification": "1.5 Hybrid 116 hk automatgear",
                "monthly_price": 3299
            },
            {
                "model": "YARIS CROSS",
                "variant": "Elegant",
                "engine_specification": "1.8 Hybrid 140 hk automatgear", 
                "monthly_price": 3799
            },
            {
                "model": "YARIS CROSS",
                "variant": "GR Sport",
                "engine_specification": "1.5 Hybrid 130 hk automatgear",
                "monthly_price": 3599
            }
        ]
    
    def test_extractor_initialization(self):
        """Test that extractor initializes correctly"""
        self.assertIsNotNone(self.extractor)
        self.assertIsInstance(self.extractor.stats, ExtractionStats)
        self.assertGreater(len(self.extractor.patterns), 0)
        self.assertIsInstance(self.extractor.config, dict)
    
    def test_aygo_x_automatic_detection(self):
        """Test AYGO X automatic transmission detection"""
        result = self.extractor.extract_aygo_x_variants(self.sample_aygo_x_data[:1])
        
        self.assertEqual(len(result), 1)
        item = result[0]
        
        self.assertEqual(item["transmission_type"], TransmissionType.AUTOMATIC.value)
        self.assertTrue(item["extraction_enhanced"])
        self.assertIn("automatgear", item["variant"].lower())
    
    def test_aygo_x_manual_detection(self):
        """Test AYGO X manual transmission detection"""
        result = self.extractor.extract_aygo_x_variants(self.sample_aygo_x_data[1:2])
        
        self.assertEqual(len(result), 1)
        item = result[0]
        
        self.assertEqual(item["transmission_type"], TransmissionType.MANUAL.value)
        self.assertTrue(item["extraction_enhanced"])
        self.assertIn("manual", item["variant"].lower())
    
    def test_bz4x_fwd_detection(self):
        """Test BZ4X FWD variant detection"""
        result = self.extractor.extract_bz4x_awd_variants(self.sample_bz4x_data[:1])
        
        self.assertEqual(len(result), 1)
        item = result[0]
        
        self.assertEqual(item["drivetrain_type"], DrivetrainType.FWD.value)
        self.assertTrue(item["extraction_enhanced"])
    
    def test_bz4x_awd_detection(self):
        """Test BZ4X AWD variant detection"""
        result = self.extractor.extract_bz4x_awd_variants(self.sample_bz4x_data[1:2])
        
        self.assertEqual(len(result), 1)
        item = result[0]
        
        self.assertEqual(item["drivetrain_type"], DrivetrainType.AWD.value)
        self.assertTrue(item["extraction_enhanced"])
        self.assertIn("awd", item["engine_specification"].lower())
    
    def test_yaris_cross_standard_power(self):
        """Test YARIS CROSS standard power detection"""
        result = self.extractor.extract_yaris_cross_variants(self.sample_yaris_cross_data[:1])
        
        self.assertEqual(len(result), 1)
        item = result[0]
        
        self.assertEqual(item["power_hp"], 116)
        self.assertFalse(item["is_high_power_variant"])
        self.assertTrue(item["extraction_enhanced"])
    
    def test_yaris_cross_high_power(self):
        """Test YARIS CROSS high power detection"""
        result = self.extractor.extract_yaris_cross_variants(self.sample_yaris_cross_data[1:3])
        
        self.assertEqual(len(result), 2)
        
        # Elegant variant (140 hp)
        elegant_item = result[0]
        self.assertEqual(elegant_item["power_hp"], 140)
        self.assertTrue(elegant_item["is_high_power_variant"])
        
        # GR Sport variant (130 hp)
        gr_sport_item = result[1]
        self.assertEqual(gr_sport_item["power_hp"], 130)
        self.assertTrue(gr_sport_item["is_high_power_variant"])
    
    def test_power_extraction(self):
        """Test power extraction from engine specifications"""
        test_specs = [
            ("1.5 Hybrid 116 hk automatgear", 116),
            ("57.7 kWh, 167 hk", 167),
            ("73.1 kWh, 343 hk AWD", 343),
            ("1.0 benzin 72 hk", 72),
            ("invalid spec", None)
        ]
        
        for spec, expected_power in test_specs:
            with self.subTest(spec=spec):
                power = self.extractor._extract_power_from_spec(spec)
                self.assertEqual(power, expected_power)
    
    def test_variant_signature_creation(self):
        """Test variant signature creation for deduplication"""
        item1 = {
            "model": "AYGO X",
            "variant": "Active manual 1.0 benzin 72 hk",
            "engine_specification": "1.0 benzin 72 hk",
            "transmission_type": "manual",
            "drivetrain_type": "fwd"
        }
        
        item2 = {
            "model": "AYGO X", 
            "variant": "Active 1.0 benzin 72 hk automatgear",
            "engine_specification": "1.0 benzin 72 hk automatgear",
            "transmission_type": "automatic",
            "drivetrain_type": "fwd"
        }
        
        sig1 = self.extractor._create_variant_signature(item1)
        sig2 = self.extractor._create_variant_signature(item2)
        
        self.assertNotEqual(sig1, sig2, "Manual and automatic variants should have different signatures")
    
    def test_duplicate_removal(self):
        """Test enhanced duplicate removal"""
        # Create test data with duplicates
        test_items = [
            {
                "model": "AYGO X",
                "variant": "Active",
                "engine_specification": "1.0 benzin 72 hk automatgear",
                "transmission_type": "automatic",
                "drivetrain_type": "fwd"
            },
            {
                "model": "AYGO X",
                "variant": "Active", 
                "engine_specification": "1.0 benzin 72 hk automatgear",
                "transmission_type": "automatic",
                "drivetrain_type": "fwd"
            },  # Exact duplicate
            {
                "model": "AYGO X",
                "variant": "Active",
                "engine_specification": "1.0 benzin 72 hk",
                "transmission_type": "manual",
                "drivetrain_type": "fwd"
            }  # Different transmission - should not be removed
        ]
        
        result = self.extractor.enhanced_duplicate_removal(test_items)
        
        self.assertEqual(len(result), 2, "Should remove exact duplicate but keep transmission variants")
    
    def test_statistics_tracking(self):
        """Test that statistics are tracked correctly"""
        # Process all sample data
        all_items = self.sample_aygo_x_data + self.sample_bz4x_data + self.sample_yaris_cross_data
        result = self.extractor.process_all_variants(all_items)
        
        stats = self.extractor.get_statistics()
        
        self.assertGreater(stats.total_processed, 0)
        self.assertGreaterEqual(stats.aygo_x_auto_found + stats.aygo_x_manual_found, 1)
        self.assertGreaterEqual(stats.bz4x_awd_found, 1)
        self.assertGreaterEqual(stats.yaris_cross_high_power_found, 1)
    
    def test_validation_results(self):
        """Test extraction validation"""
        # Create test data representing all expected variants
        all_variants = self._create_complete_variant_set()
        
        validation = self.extractor.validate_extraction_results(all_variants)
        
        self.assertEqual(validation["total_variants"], 27)
        self.assertTrue(validation["validation_passed"])
        self.assertEqual(len(validation["missing_variants"]), 0)
    
    def test_error_handling(self):
        """Test error handling with malformed data"""
        malformed_data = [
            {},  # Empty item
            {"model": "AYGO X"},  # Missing required fields
            {"model": "AYGO X", "variant": None, "engine_specification": ""},  # None values
            {"model": "UNKNOWN", "variant": "Test", "engine_specification": "Invalid"}  # Unknown model
        ]
        
        # Should not raise exceptions
        result = self.extractor.process_all_variants(malformed_data)
        
        self.assertIsInstance(result, list)
        stats = self.extractor.get_statistics()
        self.assertGreaterEqual(stats.errors_encountered, 0)
    
    def test_configuration_loading(self):
        """Test configuration loading and fallback"""
        # Test with non-existent config file
        extractor = ToyotaVariantExtractor("non_existent_config.json")
        
        # Should fall back to default config
        self.assertIsNotNone(extractor.config)
        self.assertIn("patterns", extractor.config)
    
    def _create_complete_variant_set(self) -> List[Dict[str, Any]]:
        """Create a complete set of 27 Toyota variants for testing"""
        variants = []
        
        # AYGO X - 4 variants (2 manual + 2 automatic)
        aygo_base = ["Active", "Pulse"]
        for variant in aygo_base:
            variants.extend([
                {
                    "model": "AYGO X",
                    "variant": f"{variant} manual 1.0 benzin 72 hk",
                    "engine_specification": "1.0 benzin 72 hk",
                    "transmission_type": "manual"
                },
                {
                    "model": "AYGO X",
                    "variant": f"{variant} 1.0 benzin 72 hk automatgear",
                    "engine_specification": "1.0 benzin 72 hk automatgear", 
                    "transmission_type": "automatic"
                }
            ])
        
        # YARIS - 4 variants
        yaris_variants = ["Active", "Style", "Style Comfort", "Style Technology"]
        for variant in yaris_variants:
            variants.append({
                "model": "YARIS",
                "variant": f"{variant} 1.5 Hybrid 116 hk",
                "engine_specification": "1.5 Hybrid 116 hk"
            })
        
        # YARIS CROSS - 6 variants
        yaris_cross_variants = [
            ("Active", "1.5 Hybrid 116 hk automatgear"),
            ("Active Safety", "1.5 Hybrid 116 hk automatgear"),
            ("Style Comfort", "1.5 Hybrid 116 hk automatgear"),
            ("Style Safety", "1.5 Hybrid 116 hk automatgear"),
            ("Elegant", "1.8 Hybrid 140 hk automatgear"),
            ("GR Sport", "1.5 Hybrid 130 hk automatgear")
        ]
        for variant, engine in yaris_cross_variants:
            variants.append({
                "model": "YARIS CROSS",
                "variant": f"{variant} {engine}",
                "engine_specification": engine
            })
        
        # COROLLA TOURING SPORTS - 4 variants
        corolla_variants = ["Active Comfort", "Active Comfort Plus", "Style", "Style Safety"]
        for variant in corolla_variants:
            variants.append({
                "model": "COROLLA TOURING SPORTS",
                "variant": f"{variant} 1.8 Hybrid 140 hk",
                "engine_specification": "1.8 Hybrid 140 hk"
            })
        
        # BZ4X - 6 variants (3 FWD + 3 AWD)
        bz4x_variants = [
            ("Active", "57.7 kWh, 167 hk", "fwd"),
            ("Executive", "73.1 kWh, 224 hk", "fwd"),
            ("Executive Panorama", "73.1 kWh, 224 hk", "fwd"),
            ("Active", "57.7 kWh, 167 hk AWD", "awd"),
            ("Executive", "73.1 kWh, 343 hk AWD", "awd"),
            ("Executive Panorama", "73.1 kWh, 343 hk AWD", "awd")
        ]
        for variant, engine, drivetrain in bz4x_variants:
            variants.append({
                "model": "BZ4X",
                "variant": variant,
                "engine_specification": engine,
                "drivetrain_type": drivetrain
            })
        
        # URBAN CRUISER - 3 variants
        urban_cruiser_variants = ["Active", "Executive", "Executive Comfort"]
        for variant in urban_cruiser_variants:
            variants.append({
                "model": "URBAN CRUISER",
                "variant": f"{variant} 61.1 kWh, 174 hk",
                "engine_specification": "61.1 kWh, 174 hk"
            })
        
        return variants


class TestIntegration(unittest.TestCase):
    """Integration tests for the complete extraction pipeline"""
    
    def setUp(self):
        """Set up integration test fixtures"""
        self.extractor = ToyotaVariantExtractor()
    
    def test_full_pipeline_with_sample_data(self):
        """Test the complete extraction pipeline with realistic data"""
        # Load sample data (would normally come from PDF extraction)
        sample_data = self._load_sample_extraction_data()
        
        # Process with enhanced extraction
        result = self.extractor.process_all_variants(sample_data)
        
        # Validate results
        self.assertGreater(len(result), 0)
        
        # Check that we have expected models
        models = set(item.get("model") for item in result)
        expected_models = {"AYGO X", "YARIS", "YARIS CROSS", "COROLLA TOURING SPORTS", "BZ4X", "URBAN CRUISER"}
        self.assertTrue(expected_models.intersection(models))
        
        # Check that enhanced fields are present
        enhanced_items = [item for item in result if item.get("extraction_enhanced")]
        self.assertGreater(len(enhanced_items), 0)
    
    def test_performance_benchmark(self):
        """Test performance with larger dataset"""
        # Create larger test dataset
        large_dataset = []
        base_item = {
            "model": "AYGO X",
            "variant": "Active",
            "engine_specification": "1.0 benzin 72 hk automatgear",
            "monthly_price": 2699
        }
        
        # Replicate item 1000 times with variations
        for i in range(1000):
            item = base_item.copy()
            item["variant"] = f"Active_{i}"
            large_dataset.append(item)
        
        # Measure processing time
        start_time = time.time()
        result = self.extractor.process_all_variants(large_dataset)
        end_time = time.time()
        
        processing_time = end_time - start_time
        items_per_second = len(large_dataset) / processing_time
        
        # Performance assertions
        self.assertLess(processing_time, 10.0, "Processing should complete within 10 seconds")
        self.assertGreater(items_per_second, 100, "Should process at least 100 items per second")
        
        print(f"Performance: {items_per_second:.1f} items/second")
    
    def _load_sample_extraction_data(self) -> List[Dict[str, Any]]:
        """Load sample extraction data for testing"""
        return [
            {
                "model": "AYGO X",
                "variant": "Active",
                "engine_specification": "1.0 benzin 72 hk automatgear",
                "monthly_price": 2699,
                "source": {"raw_line": "Active 2.699 4.999 37.387 102.163 20,83/110 15.000 590"}
            },
            {
                "model": "AYGO X",
                "variant": "Pulse", 
                "engine_specification": "1.0 benzin 72 hk",
                "monthly_price": 2799,
                "source": {"raw_line": "Pulse 2.799 4.999 37.387 102.163 20,83/110 15.000 590"}
            },
            {
                "model": "BZ4X",
                "variant": "Executive Panorama",
                "engine_specification": "73.1 kWh, 343 hk AWD",
                "monthly_price": 5499
            },
            {
                "model": "YARIS CROSS",
                "variant": "GR Sport",
                "engine_specification": "1.5 Hybrid 130 hk automatgear",
                "monthly_price": 3599
            }
        ]


class TestEdgeCases(unittest.TestCase):
    """Test edge cases and error conditions"""
    
    def setUp(self):
        """Set up edge case test fixtures"""
        self.extractor = ToyotaVariantExtractor()
    
    def test_empty_input(self):
        """Test handling of empty input"""
        result = self.extractor.process_all_variants([])
        self.assertEqual(len(result), 0)
    
    def test_missing_fields(self):
        """Test handling of items with missing required fields"""
        incomplete_items = [
            {"model": "AYGO X"},  # Missing variant and engine_specification
            {"variant": "Active"},  # Missing model
            {"engine_specification": "1.0 benzin 72 hk"}  # Missing model and variant
        ]
        
        result = self.extractor.process_all_variants(incomplete_items)
        self.assertEqual(len(result), len(incomplete_items))  # Should not crash
    
    def test_unicode_handling(self):
        """Test handling of Unicode characters in variant names"""
        unicode_items = [
            {
                "model": "AYGO X",
                "variant": "Activé",  # Accented character
                "engine_specification": "1.0 benzin 72 hk automatgear"
            }
        ]
        
        result = self.extractor.process_all_variants(unicode_items)
        self.assertEqual(len(result), 1)
    
    def test_very_long_strings(self):
        """Test handling of very long strings"""
        long_string_item = {
            "model": "AYGO X",
            "variant": "A" * 1000,  # Very long variant name
            "engine_specification": "1.0 benzin 72 hk automatgear"
        }
        
        result = self.extractor.process_all_variants([long_string_item])
        self.assertEqual(len(result), 1)


def run_all_tests():
    """Run all test suites"""
    # Create test suite
    test_suite = unittest.TestSuite()
    
    # Add test cases
    test_suite.addTest(unittest.makeSuite(TestToyotaVariantExtractor))
    test_suite.addTest(unittest.makeSuite(TestIntegration))
    test_suite.addTest(unittest.makeSuite(TestEdgeCases))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    return result.wasSuccessful()


if __name__ == "__main__":
    # Configure logging for tests
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Run tests
    success = run_all_tests()
    
    if success:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Some tests failed!")
        exit(1)