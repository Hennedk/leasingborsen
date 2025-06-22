# PDFPlumber Railway POC

This is a proof-of-concept for extracting structured data from PDF price lists using PDFPlumber hosted on Railway.

## 🚀 Quick Start

### 1. Deploy to Railway

1. Create account at [railway.app](https://railway.app)
2. Create new project
3. Deploy from GitHub or use Railway CLI:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Initialize in this directory
   cd railway-pdfplumber-poc
   railway init
   
   # Deploy
   railway up
   ```

4. Get your public URL from Railway dashboard

### 2. Test Locally

You can also test locally before deploying:

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run locally
python app.py
```

The service will run on http://localhost:8000

### 3. Test with PDF

1. Open `test-client.html` in your browser
2. Enter your Railway URL (or http://localhost:8000 for local)
3. Upload your Toyota PDF (Privatleasing_priser.pdf)
4. Try the different extraction modes:
   - **Basic**: Raw table and text extraction
   - **Toyota**: Toyota-specific parsing logic
   - **Debug**: Compare different extraction strategies

## 📊 API Endpoints

### `GET /` - Health Check
Returns service status

### `POST /extract/basic` - Basic Extraction
Extracts all tables and text from PDF

### `POST /extract/toyota` - Toyota-Specific
Optimized extraction for Toyota price lists

### `POST /extract/debug` - Debug Mode
Tests different PDFPlumber configurations

## 🎯 Expected Results

For Toyota PDF (Privatleasing_priser.pdf):
- Should extract 10+ pricing items
- Tables should be properly detected
- Prices should be correctly parsed
- Model/variant information extracted

## 🔧 Customization

### Table Extraction Settings

Modify in `app.py`:
```python
tables = page.extract_tables({
    "vertical_strategy": "lines",      # or "text", "lines_strict"
    "horizontal_strategy": "text",     # or "lines", "lines_strict"
    "snap_tolerance": 3,               # Tolerance for line snapping
    "join_tolerance": 3,               # Tolerance for joining lines
    "edge_min_length": 5               # Minimum line length
})
```

### Add New Dealer Extractor

1. Copy the `/extract/toyota` endpoint
2. Rename and modify extraction logic
3. Test with dealer-specific PDFs

## 📈 Next Steps

If POC is successful:
1. Create template configuration system
2. Add more dealer-specific extractors
3. Implement validation rules
4. Build verification interface
5. Integrate with main application

## 🐛 Troubleshooting

### "Connection refused" error
- Check Railway URL is correct
- Ensure service is deployed and running
- Check Railway logs for errors

### No tables extracted
- Try different extraction strategies in debug mode
- PDF might need OCR (not supported in POC)
- Tables might be images instead of text

### Wrong data extracted
- Adjust table detection settings
- Add more specific parsing rules
- Check PDF structure in debug mode