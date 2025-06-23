#!/usr/bin/env python3
"""
Test script for OpenAI PDF Extractor POC
Run with: python test_openai_extractor.py
"""

import os
import json
from openai_pdf_extractor import OpenAI_PDF_Extractor

def test_with_file(pdf_file_path, openai_api_key=None):
    """Test the extraction with a PDF file"""
    
    if not os.path.exists(pdf_file_path):
        print(f"❌ PDF file not found: {pdf_file_path}")
        return None
    
    try:
        extractor = OpenAI_PDF_Extractor(openai_api_key)
        
        # Read PDF file
        with open(pdf_file_path, 'rb') as f:
            pdf_data = f.read()
        
        print(f"🚀 Starting AI-based PDF extraction for: {pdf_file_path}")
        print(f"📏 File size: {len(pdf_data):,} bytes")
        
        # Extract data
        result = extractor.extract_car_leasing_data(pdf_data)
        
        if result['status'] == 'success':
            print("\n✅ Extraction successful!")
            print(f"📄 Pages processed: {result['metadata']['pages_processed']}")
            print(f"🚗 Models found: {len(result['data']['vehicles'])}")
            
            # Count total variants
            total_variants = sum(len(v['variants']) for v in result['data']['vehicles'])
            print(f"🔧 Total variants: {total_variants}")
            
            # Count accessories
            accessories_count = len(result['data'].get('accessories', []))
            print(f"🛠️ Accessories found: {accessories_count}")
            
            # Save results to file
            output_file = f"{pdf_file_path}_extracted.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result['data'], f, indent=2, ensure_ascii=False)
            print(f"💾 Results saved to: {output_file}")
            
            return result['data']
        else:
            print("❌ Extraction failed!")
            print(f"Error: {result['error']}")
            return None
            
    except Exception as e:
        print(f"❌ Test failed with exception: {str(e)}")
        return None

def print_extraction_summary(data):
    """Print a detailed summary of extracted data"""
    
    if not data:
        return
    
    print("\n" + "="*60)
    print("📊 EXTRACTION SUMMARY")
    print("="*60)
    
    # Document info
    doc_info = data.get('document_info', {})
    print(f"📋 Document: {doc_info.get('brand', 'Unknown')} - {doc_info.get('document_type', 'Unknown')}")
    print(f"📅 Date: {doc_info.get('document_date', 'Unknown')}")
    print(f"💰 Currency: {doc_info.get('currency', 'Unknown')}")
    
    # Vehicles
    vehicles = data.get('vehicles', [])
    print(f"\n🚗 VEHICLES ({len(vehicles)} models found)")
    print("-" * 40)
    
    for vehicle in vehicles:
        print(f"\n🔹 {vehicle['model']} ({vehicle.get('category', 'Unknown category')})")
        print(f"   ⚡ Powertrain: {vehicle.get('powertrain_type', 'Unknown')}")
        print(f"   📆 Lease period: {vehicle.get('lease_period_months', 'Unknown')} months")
        print(f"   🛠️ Variants: {len(vehicle.get('variants', []))}")
        
        # Show first few variants
        variants = vehicle.get('variants', [])
        for i, variant in enumerate(variants[:3]):  # Show first 3 variants
            pricing = variant.get('pricing', {})
            monthly = pricing.get('monthly_payment', 0)
            first = pricing.get('first_payment', 0)
            
            print(f"      • {variant.get('variant_name', 'Unknown')}")
            print(f"        Engine: {variant.get('engine_specification', 'Unknown')}")
            print(f"        Price: {monthly:,} kr/md (first: {first:,} kr)")
            
            specs = variant.get('specifications', {})
            if specs.get('fuel_consumption_kmpl'):
                print(f"        Fuel: {specs['fuel_consumption_kmpl']} km/l")
            if specs.get('co2_emissions_gkm'):
                print(f"        CO2: {specs['co2_emissions_gkm']} g/km")
        
        if len(variants) > 3:
            print(f"      ... and {len(variants) - 3} more variants")
    
    # Accessories
    accessories = data.get('accessories', [])
    if accessories:
        print(f"\n🛠️ ACCESSORIES ({len(accessories)} packages found)")
        print("-" * 40)
        
        for acc in accessories[:5]:  # Show first 5
            print(f"   • {acc.get('package_name', 'Unknown')}: {acc.get('monthly_cost', 0)} kr/md")
            print(f"     {acc.get('description', 'No description')}")
        
        if len(accessories) > 5:
            print(f"   ... and {len(accessories) - 5} more accessories")

def interactive_test():
    """Interactive test function"""
    
    print("🤖 OpenAI PDF Extractor - Interactive Test")
    print("=" * 50)
    
    # Check for API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable not set!")
        print("   Set it with: export OPENAI_API_KEY='your-key-here'")
        print("   Or create a .env file with: OPENAI_API_KEY=your-key-here")
        return
    
    # Look for PDF files in current directory
    pdf_files = [f for f in os.listdir('.') if f.lower().endswith('.pdf')]
    
    if not pdf_files:
        print("❌ No PDF files found in current directory!")
        print("   Place a PDF file in this directory and try again.")
        return
    
    print(f"📁 Found {len(pdf_files)} PDF file(s):")
    for i, pdf_file in enumerate(pdf_files, 1):
        size_mb = os.path.getsize(pdf_file) / (1024 * 1024)
        print(f"   {i}. {pdf_file} ({size_mb:.1f} MB)")
    
    # Select file
    if len(pdf_files) == 1:
        selected_file = pdf_files[0]
        print(f"\n🎯 Using: {selected_file}")
    else:
        try:
            choice = input(f"\nSelect PDF file (1-{len(pdf_files)}): ").strip()
            selected_file = pdf_files[int(choice) - 1]
        except (ValueError, IndexError):
            print("❌ Invalid selection")
            return
    
    # Run extraction
    print(f"\n🚀 Starting extraction...")
    extracted_data = test_with_file(selected_file, api_key)
    
    if extracted_data:
        print_extraction_summary(extracted_data)
        
        # Ask if user wants to see raw JSON
        show_json = input("\n🔍 Show raw JSON data? (y/n): ").strip().lower()
        if show_json.startswith('y'):
            print("\n" + "="*60)
            print("📄 RAW JSON DATA")
            print("="*60)
            print(json.dumps(extracted_data, indent=2, ensure_ascii=False))

def main():
    """Main function"""
    
    try:
        interactive_test()
    except KeyboardInterrupt:
        print("\n\n👋 Extraction cancelled by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")

if __name__ == "__main__":
    main()