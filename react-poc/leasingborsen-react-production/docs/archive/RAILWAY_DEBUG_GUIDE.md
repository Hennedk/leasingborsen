# Railway PDF Extraction Debug Guide

## Purpose
This guide explains how to debug Railway PDF extraction issues when using the new Škoda modal flow.

## Debug Information Added

### 1. Console Logging
The modal now provides detailed console logs for both Railway and AI extraction:

```javascript
// Railway logs to look for:
🚂 Railway: Starting PDF extraction...
🚂 Railway: Response received  
🚂 Railway: Extraction successful
🚂 Railway: Extraction failed

// AI logs to look for:
🤖 AI: Starting extraction with payload
🤖 AI: Response received
🤖 AI: Result received
🤖 AI: Error response
```

### 2. UI Debug Panel
During processing, the modal shows:
- Railway extraction debug info
- Text length extracted
- Expandable preview of extracted text
- Error messages with details

## How to Debug Škoda Extraction

### Step 1: Open Browser Developer Tools
1. Open Chrome/Firefox developer tools (F12)
2. Go to Console tab
3. Clear console (`Ctrl+L` or `Cmd+K`)

### Step 2: Start Extraction
1. Click "Update Listings" on Škoda dealer
2. Upload PDF file
3. Click "Extract with AI"

### Step 3: Check Railway Logs
Look for these patterns in console:

**✅ Successful Railway Extraction:**
```
🚂 Railway: Starting PDF extraction... {file: "skoda-prices.pdf", fileSize: "2.34MB"}
🚂 Railway: Response received {status: 200, statusText: "OK", ok: true}
🚂 Railway: Extraction successful {textLength: 15432, hasExtractedText: true, preview: "ŠKODA PRISLISTE..."}
```

**❌ Failed Railway Extraction:**
```
🚂 Railway: Starting PDF extraction... {file: "skoda-prices.pdf", fileSize: "2.34MB"}  
🚂 Railway: Response received {status: 500, statusText: "Internal Server Error", ok: false}
🚂 Railway: Error response {errorText: "PDF processing failed"}
🚂 Railway: Extraction failed Error: Railway extraction failed: 500 PDF processing failed
```

### Step 4: Check AI Logs
If Railway succeeds, check AI processing:

**✅ Successful AI Call:**
```
🤖 AI: Starting extraction with payload {textContentLength: 15432, dealerName: "Škoda Auto Danmark", makeName: "Škoda"}
🤖 AI: Response received {status: 200, statusText: "OK", ok: true}
🤖 AI: Result received {success: true, jobId: "job-123", itemsProcessed: 0}
```

**❌ Failed AI Call:**
```
🤖 AI: Response received {status: 400, statusText: "Bad Request", ok: false}
🤖 AI: Error response {errorText: "Text content is required and must be at least 10 characters"}
```

## Common Issues and Solutions

### Issue 1: Railway Extraction Fails
**Symptoms:** 
- Status 500 from Railway
- Error: "Railway extraction failed"

**Solutions:**
- Check Railway service is running: https://leasingborsen-production.up.railway.app/health
- Verify PDF file is valid and not corrupted
- Check PDF file size (very large files may timeout)

### Issue 2: Railway Returns Empty Text
**Symptoms:**
- Status 200 from Railway
- textLength: 0 or very small number
- Preview shows minimal content

**Solutions:**
- PDF may be image-based (scanned) - needs OCR
- PDF may be password protected
- PDF structure may be non-standard

### Issue 3: AI Extraction Gets 0 Cars
**Symptoms:**
- Railway extraction successful with good text
- AI responds with success: true but itemsProcessed: 0

**Solutions:**
- Check text preview contains actual car listings
- Verify makeName is passed correctly ("Škoda" not "volkswagen")
- Text format may not match expected patterns

### Issue 4: Parameter Mismatch
**Symptoms:**
- AI returns 400 error
- Error: "Text content is required"

**Solutions:**
- Verify textContent is being sent (not extractedText)
- Check dealerName is included
- Ensure all required parameters are present

## UI Debug Features

### Railway Debug Panel
During processing, expand the "Railway Extraction Debug" panel to see:
- Exact text length extracted
- Preview of extracted text (first 500 characters)
- Whether extraction found text content

### Text Preview
Click "Preview extracted text" to see what Railway actually extracted:
- Should contain vehicle listings
- Should be in readable format
- Should include prices, models, specifications

## Next Steps Based on Findings

### If Railway Extraction Fails:
1. Test Railway service directly: `curl -X POST https://leasingborsen-production.up.railway.app/extract/structured -F "file=@test.pdf"`
2. Check Railway service logs
3. Try with different PDF file

### If Railway Succeeds but AI Gets 0 Cars:
1. Copy extracted text from preview
2. Test with different makes
3. Check edge function logs
4. Verify text contains expected car listing patterns

### If Everything Seems Right but Still 0 Cars:
1. Check edge function logic for Škoda make processing
2. Verify extraction patterns match Škoda PDF format
3. Test with working VW Group dealer for comparison