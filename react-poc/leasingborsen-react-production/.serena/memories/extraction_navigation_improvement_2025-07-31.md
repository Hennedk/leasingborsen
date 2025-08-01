# Extraction Navigation Improvement - July 31, 2025

## Feature Implemented
Enhanced the PDF extraction success modal navigation in `SellerBulkPDFExtractionModal.tsx` to provide direct navigation to extraction sessions.

## Changes Made
- Modified `handleViewAllResults` function to check for single/merged extractions
- When only one extraction session exists (single PDF or merged PDFs), navigate directly to `/admin/extraction-sessions/{sessionId}`
- When multiple separate extractions exist, navigate to filtered list `/admin/extraction-sessions?seller={sellerId}`

## Technical Details
- Location: `src/components/admin/sellers/SellerBulkPDFExtractionModal.tsx`
- Function: `handleViewAllResults` (lines 890-903)
- Checks `completedExtractions` array for sessions with valid `extractionSessionId`
- Improves UX by reducing clicks when reviewing single extraction sessions

## Related Issues
- Fixed make name "Citroen" → "Citroën" in database (make ID: 8b05e5af-0577-4cbc-9dea-ff4c14bc46d1)
- Investigated pdf-proxy 500 error for Mercedes-Benz PDFs (network timeout issue with mercedes-benz.dk server)