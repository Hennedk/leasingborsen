import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExtractRequest {
  pdfUrl: string
  fileName: string
  dealerName?: string
}

interface ExtractResponse {
  success: boolean
  extractedText?: string
  pages?: string[]
  error?: string
  metadata?: {
    fileName: string
    pageCount: number
    fileSize?: number
  }
}

// Enhanced PDF text extraction focusing on visible content
function extractEnhancedPdfText(pdfBytes: Uint8Array): string {
  try {
    // Convert bytes to string for text extraction
    const textDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false })
    const pdfString = textDecoder.decode(pdfBytes)
    
    // Remove metadata and XML content first
    let cleanedPdf = pdfString
      .replace(/<\?xpacket.*?<\/x:xmpmeta>.*?<\?xpacket.*?>/gs, '') // Remove XMP metadata
      .replace(/<rdf:RDF.*?<\/rdf:RDF>/gs, '') // Remove RDF metadata
      .replace(/xmlns:[^=]+="[^"]+"/g, '') // Remove XML namespaces
    
    const extractedTexts: string[] = []
    
    // Method 1: Extract text from PDF text objects (BT...ET blocks)
    const textObjects = /BT\s+([\s\S]*?)\s+ET/gs
    let match
    
    while ((match = textObjects.exec(cleanedPdf)) !== null) {
      const textBlock = match[1]
      
      // Extract text from standard PDF operators
      const textPatterns = [
        /\(((?:[^()\\]|\\.)*)\)\s*Tj/g,     // (text) Tj
        /\[(.*?)\]\s*TJ/g,                   // [array] TJ
        /<([0-9A-Fa-f]+)>\s*Tj/g,          // <hex> Tj
      ]
      
      textPatterns.forEach(pattern => {
        let textMatch
        while ((textMatch = pattern.exec(textBlock)) !== null) {
          let text = textMatch[1]
          
          // Handle hex strings
          if (pattern.source.includes('0-9A-Fa-f')) {
            text = text.match(/.{2}/g)?.map(hex => String.fromCharCode(parseInt(hex, 16))).join('') || ''
          } else if (pattern.source.includes('\\[')) {
            // Handle TJ arrays
            text = text.replace(/[<>\[\]]/g, ' ').replace(/\s+/g, ' ')
          }
          
          // Decode PDF escape sequences
          text = text
            .replace(/\\([0-9]{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ')
            .replace(/\\(.)/g, '$1')
            .replace(/[()]/g, '')
            .trim()
          
          // Only add meaningful text
          if (text.length > 2 && !/^[0-9.\s]+$/.test(text)) {
            extractedTexts.push(text)
          }
        }
      })
    }
    
    // Method 2: Extract from content streams
    const streamPattern = /stream\s+([\s\S]*?)\s+endstream/gs
    while ((match = streamPattern.exec(cleanedPdf)) !== null) {
      const streamContent = match[1]
      
      // Skip binary/compressed data
      if (streamContent.includes('JFIF') || streamContent.includes('PNG') || streamContent.length > 100000) {
        continue
      }
      
      // Look for text in streams
      const streamTextPatterns = [
        /\(((?:[^()\\]|\\.)*)\)\s*Tj/g,
        /\[(.*?)\]\s*TJ/g,
      ]
      
      streamTextPatterns.forEach(pattern => {
        let textMatch
        while ((textMatch = pattern.exec(streamContent)) !== null) {
          let text = textMatch[1]
          
          if (pattern.source.includes('\\[')) {
            // Process TJ arrays
            const parts = text.split(/[<>\(\)]+/)
            text = parts.filter(p => p && !p.match(/^-?\d+$/)).join(' ')
          }
          
          text = text
            .replace(/\\([0-9]{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
            .replace(/\\(.)/g, '$1')
            .trim()
          
          if (text.length > 2 && !/^[0-9.\s]+$/.test(text)) {
            extractedTexts.push(text)
          }
        }
      })
    }
    
    // Method 3: Look for Danish car pricing patterns in the raw text
    const danishCarPatterns = [
      /Mercedes[^.]{0,100}\d{1,2}\.\d{3}\s*kr/gi,
      /Toyota[^.]{0,100}\d{1,2}\.\d{3}\s*kr/gi,
      /Volkswagen[^.]{0,100}\d{1,2}\.\d{3}\s*kr/gi,
      /\d{1,2}\.\d{3}\s*kr\/m[åa]ned/gi,
      /\d{3}\s*HK[^.]{0,50}\d{1,2}\.\d{3}/gi,
    ]
    
    danishCarPatterns.forEach(pattern => {
      let carMatch
      while ((carMatch = pattern.exec(cleanedPdf)) !== null) {
        const matchText = carMatch[0].replace(/\s+/g, ' ').trim()
        if (!extractedTexts.includes(matchText)) {
          extractedTexts.push(matchText)
        }
      }
    })
    
    // Combine all extracted text
    let finalText = extractedTexts
      .filter(text => text && text.trim().length > 2)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    // If still too little text, fallback to aggressive extraction
    if (finalText.length < 500) {
      console.log('Falling back to aggressive text extraction')
      
      // Remove all PDF structure and look for text patterns
      const aggressiveText = cleanedPdf
        .replace(/\/[A-Z][A-Za-z0-9]*(?:\s|\/)/g, ' ') // Remove PDF operators
        .replace(/\d+\s+\d+\s+obj/g, ' ') // Remove object markers
        .replace(/endobj/g, ' ')
        .replace(/stream[\s\S]*?endstream/g, ' ') // Remove stream content
        .match(/[A-Za-zÆØÅæøå][A-Za-zÆØÅæøå\s\d.,:\-–]{10,}/g)
      
      if (aggressiveText) {
        const additionalText = aggressiveText
          .filter(text => !text.match(/^[\d\s.,]+$/) && text.includes(' '))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        
        if (additionalText.length > finalText.length) {
          finalText = additionalText
        }
      }
    }
    
    return finalText || 'Unable to extract readable text from PDF'
    
  } catch (error) {
    console.error('Enhanced PDF extraction error:', error)
    return `Error extracting text: ${error.message}`
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pdfUrl, fileName, dealerName } = await req.json() as ExtractRequest

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'PDF URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Starting PDF text extraction for: ${fileName}`)

    // Download PDF from Supabase Storage
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.status}`)
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    const pdfBytes = new Uint8Array(pdfBuffer)
    console.log(`Downloaded PDF: ${pdfBytes.length} bytes`)

    try {
      // Use enhanced PDF text extraction
      const extractedText = extractEnhancedPdfText(pdfBytes)
      
      // Check if we got meaningful text or just metadata
      const isMetadata = extractedText.includes('FlateDecode') || 
                        extractedText.includes('XObject') ||
                        extractedText.includes('Metadata XML') ||
                        extractedText.includes('Adobe InDesign') ||
                        extractedText.length < 100

      if (isMetadata || !extractedText || extractedText.length < 10) {
        console.log('PDF appears to contain compressed/encoded content or metadata only')
        
        // Return instruction for manual input
        const manualInputMessage = `PDF Extraction Status: Unable to extract readable text

The PDF appears to use advanced compression or encoding that prevents automatic text extraction.

For ${fileName}:
- File size: ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB
- Content type: Compressed/Encoded PDF

Please use one of these options:

1. **Manual Input (Recommended)**: 
   Copy and paste the car listings directly from the PDF viewer into the text field below

2. **Alternative PDF**: 
   Try a different PDF that uses standard text encoding

The AI car extraction will work perfectly with manually pasted text. Simply:
- Open the PDF in a viewer
- Select and copy the car pricing text
- Paste it in the text field below
- Click "Extract Biler med AI"`

        const response: ExtractResponse = {
          success: true,
          extractedText: manualInputMessage,
          pages: [manualInputMessage],
          metadata: {
            fileName,
            pageCount: 0,
            fileSize: pdfBytes.length
          }
        }

        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const response: ExtractResponse = {
        success: true,
        extractedText: extractedText,
        pages: [extractedText],
        metadata: {
          fileName,
          pageCount: 1,
          fileSize: pdfBytes.length
        }
      }

      console.log(`Successfully extracted text from ${fileName}: ${extractedText.length} characters`)

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (extractionError) {
      console.error('Text extraction error:', extractionError)
      
      // Fallback: Return a placeholder text with file info
      const fallbackText = `PDF file processed: ${fileName}
File size: ${pdfBytes.length} bytes
Note: This is a basic text extraction. For better results, consider using a dedicated PDF processing service.

Extracted content preview:
[Basic PDF text extraction attempted but may not preserve full formatting]

If this is a car pricing PDF, it likely contains:
- Car make and model information
- Pricing details in Danish Kroner (DKK)
- Lease terms and conditions
- Contact information

For optimal AI processing, manual text input may provide better results.`

      const response: ExtractResponse = {
        success: true,
        extractedText: fallbackText,
        pages: [fallbackText],
        metadata: {
          fileName,
          pageCount: 1,
          fileSize: pdfBytes.length
        }
      }

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('PDF text extraction error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})