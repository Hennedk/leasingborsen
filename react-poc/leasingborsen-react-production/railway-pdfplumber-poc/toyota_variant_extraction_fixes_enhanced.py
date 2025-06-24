#!/usr/bin/env python3
"""
Enhanced Toyota Variant Extraction Fixes

This module provides robust, configurable extraction fixes for Toyota vehicle variants
with proper error handling, logging, and performance optimization.

Key Features:
- Robust error handling and logging
- Configurable regex patterns via JSON
- Pre-compiled patterns for performance
- Type safety with enums and dataclasses
- Statistics tracking for monitoring
"""

import re
import json
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple, Set
from pathlib import Path


class TransmissionType(Enum):
    """Enumeration for transmission types"""
    MANUAL = "manual"
    AUTOMATIC = "automatic"
    CVT = "cvt"
    UNKNOWN = "unknown"


class DrivetrainType(Enum):
    """Enumeration for drivetrain types"""
    FWD = "fwd"
    AWD = "awd"
    RWD = "rwd" 
    UNKNOWN = "unknown"


class VariantType(Enum):
    """Enumeration for variant extraction types"""
    AYGO_X = "aygo_x"
    BZ4X = "bz4x"
    YARIS_CROSS = "yaris_cross"
    YARIS = "yaris"
    COROLLA = "corolla"
    URBAN_CRUISER = "urban_cruiser"


@dataclass
class ExtractionStats:
    """Statistics tracking for extraction operations"""
    total_processed: int = 0
    aygo_x_manual_found: int = 0
    aygo_x_auto_found: int = 0
    bz4x_awd_found: int = 0
    yaris_cross_high_power_found: int = 0
    errors_encountered: int = 0
    patterns_matched: Dict[str, int] = field(default_factory=dict)
    
    def increment_pattern(self, pattern_name: str) -> None:
        """Increment pattern match counter"""
        self.patterns_matched[pattern_name] = self.patterns_matched.get(pattern_name, 0) + 1


@dataclass
class VariantCandidate:
    """Candidate variant with extraction metadata"""
    model: str
    variant: str
    engine_spec: str
    transmission: TransmissionType
    drivetrain: DrivetrainType
    power_hp: Optional[int] = None
    battery_kwh: Optional[float] = None
    confidence: float = 0.0
    extraction_method: str = ""
    raw_line: str = ""


class ToyotaVariantExtractor:
    """Enhanced Toyota variant extraction with configurable patterns and robust error handling"""
    
    def __init__(self, config_path: str = "toyota_patterns_config.json"):
        """Initialize extractor with configuration"""
        self.logger = logging.getLogger(__name__)
        self.stats = ExtractionStats()
        self.patterns: Dict[str, re.Pattern] = {}
        self.config: Dict[str, Any] = {}
        
        # Load configuration
        self._load_config(config_path)
        self._compile_patterns()
        
        self.logger.info("ToyotaVariantExtractor initialized successfully")
    
    def _load_config(self, config_path: str) -> None:
        """Load configuration from JSON file"""
        try:
            config_file = Path(config_path)
            if not config_file.exists():
                self.logger.warning(f"Config file {config_path} not found, using defaults")
                self._create_default_config()
            else:
                with open(config_file, 'r', encoding='utf-8') as f:
                    self.config = json.load(f)
                self.logger.info(f"Configuration loaded from {config_path}")
        except Exception as e:
            self.logger.error(f"Failed to load config: {e}")
            self._create_default_config()
    
    def _create_default_config(self) -> None:
        """Create default configuration"""
        self.config = {
            "patterns": {
                "aygo_x": {
                    "manual_detection": r"(?<!automatgear)(?:\s|$)",
                    "automatic_detection": r"automatgear",
                    "variant_patterns": [
                        r"(Active|Pulse)(?:\s+X-Clusiv)?",
                        r"(Active|Pulse)\s+X-Clusiv"
                    ]
                },
                "bz4x": {
                    "awd_detection": r"AWD",
                    "power_patterns": [
                        r"(\d+\.?\d*)\s*kWh,?\s*(\d+)\s*hk(?:\s+(AWD))?",
                        r"(\d+\.?\d*)\s*Kwh,?\s*(\d+)\s*Hk(?:\s+(AWD))?"
                    ]
                },
                "yaris_cross": {
                    "high_power_variants": ["Elegant", "GR Sport"],
                    "power_patterns": [
                        r"1\.5\s+Hybrid\s+(\d+)\s+hk(?:\s+automatgear)?",
                        r"1\.8\s+Hybrid\s+(\d+)\s+hk(?:\s+automatgear)?"
                    ]
                },
                "transmission": {
                    "automatic_indicators": [
                        "automatgear",
                        "aut\\.",
                        "automatic"
                    ],
                    "manual_indicators": [
                        "manual",
                        "gear"
                    ]
                },
                "drivetrain": {
                    "awd_indicators": [
                        "AWD",
                        "4WD",
                        "All-wheel drive"
                    ]
                }
            },
            "thresholds": {
                "confidence_minimum": 0.7,
                "power_hp_minimum": 50,
                "battery_kwh_minimum": 10.0
            }
        }
    
    def _compile_patterns(self) -> None:
        """Pre-compile all regex patterns for performance"""
        try:
            patterns_config = self.config.get("patterns", {})
            
            # AYGO X patterns
            aygo_config = patterns_config.get("aygo_x", {})
            self.patterns["aygo_manual"] = re.compile(
                aygo_config.get("manual_detection", r"(?<!automatgear)(?:\s|$)"),
                re.IGNORECASE
            )
            self.patterns["aygo_automatic"] = re.compile(
                aygo_config.get("automatic_detection", r"automatgear"),
                re.IGNORECASE
            )
            
            # BZ4X patterns
            bz4x_config = patterns_config.get("bz4x", {})
            for i, pattern in enumerate(bz4x_config.get("power_patterns", [])):
                self.patterns[f"bz4x_power_{i}"] = re.compile(pattern, re.IGNORECASE)
            
            # YARIS CROSS patterns
            yaris_cross_config = patterns_config.get("yaris_cross", {})
            for i, pattern in enumerate(yaris_cross_config.get("power_patterns", [])):
                self.patterns[f"yaris_cross_power_{i}"] = re.compile(pattern, re.IGNORECASE)
            
            # Transmission patterns
            trans_config = patterns_config.get("transmission", {})
            auto_pattern = "|".join(trans_config.get("automatic_indicators", []))
            self.patterns["transmission_auto"] = re.compile(auto_pattern, re.IGNORECASE)
            
            # Drivetrain patterns
            drive_config = patterns_config.get("drivetrain", {})
            awd_pattern = "|".join(drive_config.get("awd_indicators", []))
            self.patterns["drivetrain_awd"] = re.compile(awd_pattern, re.IGNORECASE)
            
            self.logger.info(f"Compiled {len(self.patterns)} regex patterns")
            
        except Exception as e:
            self.logger.error(f"Failed to compile patterns: {e}")
            raise
    
    def extract_aygo_x_variants(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract AYGO X variants with proper transmission detection"""
        enhanced_items = []
        
        for item in items:
            try:
                if item.get("model") != "AYGO X":
                    enhanced_items.append(item)
                    continue
                
                self.stats.total_processed += 1
                
                # Get transmission type from engine specification and context
                transmission = self._detect_aygo_x_transmission(item)
                
                # Create enhanced variant
                enhanced_item = item.copy()
                enhanced_item = self._enhance_aygo_x_variant(enhanced_item, transmission)
                enhanced_items.append(enhanced_item)
                
                # Update statistics
                if transmission == TransmissionType.MANUAL:
                    self.stats.aygo_x_manual_found += 1
                elif transmission == TransmissionType.AUTOMATIC:
                    self.stats.aygo_x_auto_found += 1
                    
            except Exception as e:
                self.logger.error(f"Error processing AYGO X item: {e}")
                self.stats.errors_encountered += 1
                enhanced_items.append(item)  # Keep original on error
        
        return enhanced_items
    
    def _detect_aygo_x_transmission(self, item: Dict[str, Any]) -> TransmissionType:
        """Detect transmission type for AYGO X variants"""
        try:
            engine_spec = item.get("engine_specification", "").lower()
            raw_line = item.get("source", {}).get("raw_line", "").lower()
            
            # Check for automatic indicators
            if self.patterns["aygo_automatic"].search(engine_spec):
                self.stats.increment_pattern("aygo_automatic")
                return TransmissionType.AUTOMATIC
            
            # Check raw line for context
            if self.patterns["aygo_automatic"].search(raw_line):
                self.stats.increment_pattern("aygo_automatic_raw")
                return TransmissionType.AUTOMATIC
            
            # If no automatic indicators found, assume manual
            self.stats.increment_pattern("aygo_manual_default")
            return TransmissionType.MANUAL
            
        except Exception as e:
            self.logger.error(f"Error detecting AYGO X transmission: {e}")
            return TransmissionType.UNKNOWN
    
    def _enhance_aygo_x_variant(self, item: Dict[str, Any], transmission: TransmissionType) -> Dict[str, Any]:
        """Enhance AYGO X variant with transmission information"""
        try:
            variant = item.get("variant", "")
            engine_spec = item.get("engine_specification", "")
            
            # Add transmission to variant name if not already present
            if transmission == TransmissionType.AUTOMATIC and "automatgear" not in variant.lower():
                item["variant"] = f"{variant} {engine_spec}"
            elif transmission == TransmissionType.MANUAL and "manual" not in variant.lower():
                # For manual, we need to indicate it's manual
                base_variant = variant.replace(" automatgear", "").strip()
                item["variant"] = f"{base_variant} manual {engine_spec.replace(' automatgear', '').strip()}"
            
            # Add metadata
            item["transmission_type"] = transmission.value
            item["extraction_enhanced"] = True
            
            return item
            
        except Exception as e:
            self.logger.error(f"Error enhancing AYGO X variant: {e}")
            return item
    
    def extract_bz4x_awd_variants(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract BZ4X variants with proper AWD detection"""
        enhanced_items = []
        
        for item in items:
            try:
                if item.get("model") != "BZ4X":
                    enhanced_items.append(item)
                    continue
                
                self.stats.total_processed += 1
                
                # Detect AWD from engine specification
                drivetrain = self._detect_bz4x_drivetrain(item)
                
                # Create enhanced variant
                enhanced_item = item.copy()
                enhanced_item = self._enhance_bz4x_variant(enhanced_item, drivetrain)
                enhanced_items.append(enhanced_item)
                
                # Update statistics
                if drivetrain == DrivetrainType.AWD:
                    self.stats.bz4x_awd_found += 1
                    
            except Exception as e:
                self.logger.error(f"Error processing BZ4X item: {e}")
                self.stats.errors_encountered += 1
                enhanced_items.append(item)
        
        return enhanced_items
    
    def _detect_bz4x_drivetrain(self, item: Dict[str, Any]) -> DrivetrainType:
        """Detect drivetrain type for BZ4X variants"""
        try:
            engine_spec = item.get("engine_specification", "")
            variant = item.get("variant", "")
            
            # Check engine specification for AWD
            if self.patterns["drivetrain_awd"].search(engine_spec):
                self.stats.increment_pattern("bz4x_awd_engine")
                return DrivetrainType.AWD
            
            # Check variant name for AWD
            if self.patterns["drivetrain_awd"].search(variant):
                self.stats.increment_pattern("bz4x_awd_variant")
                return DrivetrainType.AWD
            
            # Extract power to identify high-power AWD variants
            power_hp = self._extract_power_from_spec(engine_spec)
            if power_hp and power_hp >= 340:  # 343 hp variants are typically AWD
                self.stats.increment_pattern("bz4x_awd_highpower")
                return DrivetrainType.AWD
            
            return DrivetrainType.FWD
            
        except Exception as e:
            self.logger.error(f"Error detecting BZ4X drivetrain: {e}")
            return DrivetrainType.UNKNOWN
    
    def _enhance_bz4x_variant(self, item: Dict[str, Any], drivetrain: DrivetrainType) -> Dict[str, Any]:
        """Enhance BZ4X variant with drivetrain information"""
        try:
            engine_spec = item.get("engine_specification", "")
            
            # Ensure AWD is in engine specification if detected
            if drivetrain == DrivetrainType.AWD and "awd" not in engine_spec.lower():
                item["engine_specification"] = f"{engine_spec} AWD".strip()
            
            # Add metadata
            item["drivetrain_type"] = drivetrain.value
            item["extraction_enhanced"] = True
            
            return item
            
        except Exception as e:
            self.logger.error(f"Error enhancing BZ4X variant: {e}")
            return item
    
    def extract_yaris_cross_variants(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract YARIS CROSS variants with proper power detection"""
        enhanced_items = []
        
        for item in items:
            try:
                if item.get("model") != "YARIS CROSS":
                    enhanced_items.append(item)
                    continue
                
                self.stats.total_processed += 1
                
                # Detect power level
                power_hp = self._extract_power_from_spec(item.get("engine_specification", ""))
                is_high_power = power_hp and power_hp >= 130
                
                # Create enhanced variant
                enhanced_item = item.copy()
                enhanced_item = self._enhance_yaris_cross_variant(enhanced_item, power_hp, is_high_power)
                enhanced_items.append(enhanced_item)
                
                # Update statistics
                if is_high_power:
                    self.stats.yaris_cross_high_power_found += 1
                    
            except Exception as e:
                self.logger.error(f"Error processing YARIS CROSS item: {e}")
                self.stats.errors_encountered += 1
                enhanced_items.append(item)
        
        return enhanced_items
    
    def _enhance_yaris_cross_variant(self, item: Dict[str, Any], power_hp: Optional[int], is_high_power: bool) -> Dict[str, Any]:
        """Enhance YARIS CROSS variant with power information"""
        try:
            variant = item.get("variant", "")
            
            # Add power classification metadata
            item["power_hp"] = power_hp
            item["is_high_power_variant"] = is_high_power
            item["extraction_enhanced"] = True
            
            # Ensure high-power variants are properly identified
            high_power_variants = self.config.get("patterns", {}).get("yaris_cross", {}).get("high_power_variants", [])
            variant_lower = variant.lower()
            
            for high_power_name in high_power_variants:
                if high_power_name.lower() in variant_lower and is_high_power:
                    self.stats.increment_pattern("yaris_cross_high_power_identified")
                    break
            
            return item
            
        except Exception as e:
            self.logger.error(f"Error enhancing YARIS CROSS variant: {e}")
            return item
    
    def _extract_power_from_spec(self, engine_spec: str) -> Optional[int]:
        """Extract power (hp) from engine specification"""
        try:
            if not engine_spec:
                return None
            
            # Try multiple power patterns
            for pattern_name, pattern in self.patterns.items():
                if "power" in pattern_name:
                    match = pattern.search(engine_spec)
                    if match:
                        # Find the power group (usually second group for most patterns)
                        groups = match.groups()
                        for group in groups:
                            if group and group.isdigit():
                                power = int(group)
                                if power >= self.config.get("thresholds", {}).get("power_hp_minimum", 50):
                                    return power
            
            # Fallback: simple pattern
            power_match = re.search(r"(\d+)\s*(?:hk|hp)", engine_spec, re.IGNORECASE)
            if power_match:
                return int(power_match.group(1))
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error extracting power from spec '{engine_spec}': {e}")
            return None
    
    def enhanced_duplicate_removal(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enhanced duplicate removal that preserves transmission/drivetrain differences"""
        try:
            unique_items = []
            seen_signatures = set()
            
            for item in items:
                # Create signature that includes transmission and drivetrain
                signature = self._create_variant_signature(item)
                
                if signature not in seen_signatures:
                    unique_items.append(item)
                    seen_signatures.add(signature)
                else:
                    self.logger.debug(f"Removing duplicate with signature: {signature}")
            
            self.logger.info(f"Duplicate removal: {len(items)} -> {len(unique_items)} items")
            return unique_items
            
        except Exception as e:
            self.logger.error(f"Error in duplicate removal: {e}")
            return items
    
    def _create_variant_signature(self, item: Dict[str, Any]) -> str:
        """Create unique signature for variant including transmission/drivetrain"""
        try:
            model = item.get("model", "")
            variant = item.get("variant", "")
            engine_spec = item.get("engine_specification", "")
            transmission = item.get("transmission_type", "")
            drivetrain = item.get("drivetrain_type", "")
            
            # Normalize for comparison
            signature_parts = [
                model.lower().strip(),
                variant.lower().strip(),
                engine_spec.lower().strip(),
                transmission.lower().strip(),
                drivetrain.lower().strip()
            ]
            
            return "|".join(signature_parts)
            
        except Exception as e:
            self.logger.error(f"Error creating variant signature: {e}")
            return str(hash(str(item)))
    
    def process_all_variants(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process all Toyota variants with enhanced extraction"""
        try:
            self.logger.info(f"Starting enhanced variant processing for {len(items)} items")
            
            # Reset statistics
            self.stats = ExtractionStats()
            
            # Apply fixes in sequence
            items = self.extract_aygo_x_variants(items)
            items = self.extract_bz4x_awd_variants(items)
            items = self.extract_yaris_cross_variants(items)
            
            # Enhanced duplicate removal
            items = self.enhanced_duplicate_removal(items)
            
            self.logger.info(f"Enhanced variant processing completed: {len(items)} unique items")
            self._log_statistics()
            
            return items
            
        except Exception as e:
            self.logger.error(f"Error in process_all_variants: {e}")
            raise
    
    def _log_statistics(self) -> None:
        """Log extraction statistics"""
        self.logger.info("=== Toyota Variant Extraction Statistics ===")
        self.logger.info(f"Total processed: {self.stats.total_processed}")
        self.logger.info(f"AYGO X manual found: {self.stats.aygo_x_manual_found}")
        self.logger.info(f"AYGO X automatic found: {self.stats.aygo_x_auto_found}")
        self.logger.info(f"BZ4X AWD found: {self.stats.bz4x_awd_found}")
        self.logger.info(f"YARIS CROSS high-power found: {self.stats.yaris_cross_high_power_found}")
        self.logger.info(f"Errors encountered: {self.stats.errors_encountered}")
        
        if self.stats.patterns_matched:
            self.logger.info("Pattern matches:")
            for pattern, count in self.stats.patterns_matched.items():
                self.logger.info(f"  {pattern}: {count}")
    
    def get_statistics(self) -> ExtractionStats:
        """Get extraction statistics"""
        return self.stats
    
    def validate_extraction_results(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate extraction results against expected counts"""
        validation_results = {
            "total_variants": len(items),
            "expected_total": 27,
            "models": {},
            "missing_variants": [],
            "validation_passed": False
        }
        
        # Count by model
        model_counts = {}
        for item in items:
            model = item.get("model", "Unknown")
            if model not in model_counts:
                model_counts[model] = []
            model_counts[model].append(item.get("variant", ""))
        
        # Expected counts
        expected_counts = {
            "AYGO X": 4,  # 2 manual + 2 automatic
            "YARIS": 4,
            "YARIS CROSS": 6,
            "COROLLA TOURING SPORTS": 4,
            "BZ4X": 6,  # 3 FWD + 3 AWD
            "URBAN CRUISER": 3
        }
        
        validation_results["models"] = model_counts
        
        # Check if we have expected total
        validation_results["validation_passed"] = len(items) == 27
        
        # Identify missing variants
        for model, expected_count in expected_counts.items():
            actual_count = len(model_counts.get(model, []))
            if actual_count < expected_count:
                validation_results["missing_variants"].append({
                    "model": model,
                    "expected": expected_count,
                    "actual": actual_count,
                    "missing": expected_count - actual_count
                })
        
        return validation_results


# Export main classes and functions
__all__ = [
    "ToyotaVariantExtractor",
    "TransmissionType", 
    "DrivetrainType",
    "VariantType",
    "ExtractionStats",
    "VariantCandidate"
]