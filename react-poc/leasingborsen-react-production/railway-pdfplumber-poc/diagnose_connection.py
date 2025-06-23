#!/usr/bin/env python3
"""
Diagnose OpenAI connection issues
"""

import os
import requests
import socket
import urllib3
from urllib.parse import urlparse

def test_basic_connectivity():
    """Test basic internet connectivity"""
    print("🌐 Testing basic internet connectivity...")
    
    test_urls = [
        "https://www.google.com",
        "https://api.openai.com",
        "https://httpbin.org/get"
    ]
    
    for url in test_urls:
        try:
            response = requests.get(url, timeout=10)
            print(f"   ✅ {url} - Status: {response.status_code}")
        except Exception as e:
            print(f"   ❌ {url} - Error: {str(e)}")

def test_dns_resolution():
    """Test DNS resolution for OpenAI"""
    print("\n🔍 Testing DNS resolution...")
    
    try:
        ip = socket.gethostbyname("api.openai.com")
        print(f"   ✅ api.openai.com resolves to: {ip}")
    except Exception as e:
        print(f"   ❌ DNS resolution failed: {str(e)}")

def test_openai_api_key():
    """Test OpenAI API key validity"""
    print("\n🔑 Testing OpenAI API key...")
    
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("   ❌ OPENAI_API_KEY not set")
        return False
    
    print(f"   API Key: {api_key[:20]}...{api_key[-10:]}")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    try:
        # Test with a simple API call
        response = requests.get(
            "https://api.openai.com/v1/models",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            models = response.json()
            print(f"   ✅ API key valid - Found {len(models.get('data', []))} models")
            return True
        else:
            print(f"   ❌ API key invalid - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ API test failed: {str(e)}")
        return False

def test_openai_chat_api():
    """Test OpenAI Chat API with minimal request"""
    print("\n💬 Testing OpenAI Chat API...")
    
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("   ❌ OPENAI_API_KEY not set")
        return False
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Minimal test payload
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 5
    }
    
    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("   ✅ Chat API working!")
            print(f"   Response: {result['choices'][0]['message']['content']}")
            return True
        else:
            print(f"   ❌ Chat API failed - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Chat API test failed: {str(e)}")
        print(f"   Error type: {type(e).__name__}")
        return False

def test_with_openai_library():
    """Test using the OpenAI Python library"""
    print("\n🐍 Testing with OpenAI Python library...")
    
    try:
        import openai
        api_key = os.getenv('OPENAI_API_KEY')
        
        if not api_key:
            print("   ❌ OPENAI_API_KEY not set")
            return False
        
        client = openai.OpenAI(api_key=api_key)
        
        # Test with a simple completion
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say hello"}],
            max_tokens=5,
            timeout=30
        )
        
        print("   ✅ OpenAI library working!")
        print(f"   Response: {response.choices[0].message.content}")
        return True
        
    except Exception as e:
        print(f"   ❌ OpenAI library test failed: {str(e)}")
        print(f"   Error type: {type(e).__name__}")
        return False

def check_proxy_settings():
    """Check for proxy settings"""
    print("\n🔧 Checking proxy settings...")
    
    proxy_vars = ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY']
    proxy_found = False
    
    for var in proxy_vars:
        value = os.getenv(var)
        if value:
            print(f"   ⚠️  {var} = {value}")
            proxy_found = True
    
    if not proxy_found:
        print("   ✅ No proxy environment variables found")
    else:
        print("   ℹ️  Proxy detected - this might affect OpenAI connections")

def check_wsl_networking():
    """Check WSL-specific networking issues"""
    print("\n🪟 Checking WSL networking...")
    
    # Check if running in WSL
    try:
        with open('/proc/version', 'r') as f:
            version = f.read()
        if 'microsoft' in version.lower() or 'wsl' in version.lower():
            print("   ℹ️  Running in WSL detected")
            print("   💡 Try: wsl --shutdown and restart if issues persist")
        else:
            print("   ℹ️  Not running in WSL")
    except:
        print("   ℹ️  Could not determine if running in WSL")

def main():
    """Run all diagnostic tests"""
    print("🔍 OpenAI Connection Diagnostics")
    print("=" * 50)
    
    test_basic_connectivity()
    test_dns_resolution()
    check_proxy_settings()
    check_wsl_networking()
    
    # API tests
    if test_openai_api_key():
        test_openai_chat_api()
        test_with_openai_library()
    
    print("\n" + "=" * 50)
    print("🎯 DIAGNOSTIC COMPLETE")
    print("=" * 50)
    
    print("\n💡 Common solutions:")
    print("1. Check your internet connection")
    print("2. Verify OpenAI API key is correct and has credits")
    print("3. Check firewall/proxy settings")
    print("4. If in WSL: wsl --shutdown and restart")
    print("5. If behind corporate firewall: contact IT about OpenAI API access")

if __name__ == "__main__":
    main()