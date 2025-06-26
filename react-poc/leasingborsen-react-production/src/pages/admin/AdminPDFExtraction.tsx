import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Car, Loader2, CheckCircle, AlertCircle, Link, Settings, Save, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { pdfExtractor, validatePDFFile, getDanishCarPatterns, type ExtractionProfile, type PDFExtractionResult } from '@/services/pdfExtractorService';
import { StandaloneSellerSelect } from '@/components/admin/StandaloneSellerSelect';
import { useBatchListingCreation } from '@/hooks/useBatchListingCreation';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface LeaseOffer {
  monthly_price: number;
  first_payment?: number;
  period_months?: number;
  mileage_per_year?: number;
  total_price?: number;
}

interface ExtractedCar {
  make: string;
  model: string;
  variant: string;
  horsepower?: number;
  engineInfo?: string;
  engine_info?: string; // New field
  fuelType?: string; // Legacy field
  fuel_type?: string; // New field
  transmission?: string;
  body_type?: string;
  doors?: number;
  year?: number;
  offers?: LeaseOffer[]; // Multiple offers per car
  // Legacy fields for backward compatibility
  monthlyPrice?: string; // Legacy field
  priceNum?: number; // Legacy field
  monthly_price?: number; // New field
  first_payment?: number; // Extracted from PDF
  period_months?: number; // Extracted from PDF
  mileage_per_year?: number; // Extracted from PDF
  total_price?: number; // Extracted from PDF
}

interface ExtractionResult {
  success: boolean;
  jobId?: string;
  totalCars?: number;
  cars?: ExtractedCar[];
  error?: string;
  metadata?: {
    processingTime?: number;
    tokensUsed?: number;
    cost?: number;
    textSource?: string;
    textLength?: number;
    originalTextLength?: number;
    processedTextLength?: number;
    compressionRatio?: number;
    chunksProcessed?: number;
    totalChunksFound?: number;
    wasLimited?: boolean;
    limitReason?: string;
  };
  debugInfo?: {
    processedTextSample?: string;
  };
}

interface UploadResult {
  success: boolean;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  error?: string;
}

interface TextExtractionResult {
  success: boolean;
  extractedText?: string;
  pages?: string[];
  error?: string;
  metadata?: {
    fileName: string;
    pageCount: number;
    fileSize?: number;
  };
}

export default function AdminPDFExtraction() {
  const navigate = useNavigate();
  const { createBatchListings, progress: batchProgress } = useBatchListingCreation();
  
  const [pdfText, setPdfText] = useState('');
  const [dealerName, setDealerName] = useState('Toyota Danmark');
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractProgress, setExtractProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [textResult, setTextResult] = useState<TextExtractionResult | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  
  // Railway PDF extraction state
  const [extractionProfile, setExtractionProfile] = useState<ExtractionProfile>('automotive');
  const [railwayResult, setRailwayResult] = useState<PDFExtractionResult | null>(null);
  const [isRailwayExtracting, setIsRailwayExtracting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Batch creation state
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file
    const validation = validatePDFFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Store file for Railway extraction
    setSelectedFile(file);

    setIsUploading(true);
    setUploadProgress(0);
    setCurrentStep('Uploader PDF til Supabase...');
    setUploadResult(null);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}-${cleanFileName}`;

      setCurrentStep('Starter upload...');
      setUploadProgress(10);

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('pdfs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(`Upload fejl: ${error.message}`);
      }

      setUploadProgress(70);
      setCurrentStep('Henter fil URL...');

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('pdfs')
        .getPublicUrl(fileName);

      setUploadProgress(100);
      setCurrentStep('✅ Upload færdig!');

      // Set upload result
      setUploadResult({
        success: true,
        fileName: fileName,
        fileUrl: urlData.publicUrl,
        fileSize: file.size
      });

      // Clear current step after 3 seconds
      setTimeout(() => setCurrentStep(''), 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        error: error instanceof Error ? error.message : 'Ukendt upload fejl'
      });
      setCurrentStep('Fejl ved upload');
    } finally {
      setIsUploading(false);
    }
  };

  const extractTextFromPDF = async () => {
    if (!uploadResult?.success || !uploadResult.fileUrl) {
      alert('Upload PDF først');
      return;
    }

    setIsExtractingText(true);
    setCurrentStep('Extractor tekst fra PDF...');
    setTextResult(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-pdf-text`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfUrl: uploadResult.fileUrl,
          fileName: uploadResult.fileName,
          dealerName: dealerName
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Text extraction failed: ${response.status} ${errorText}`);
      }

      const extractionResult: TextExtractionResult = await response.json();
      
      if (extractionResult.success) {
        setTextResult(extractionResult);
        // Auto-populate the text area with extracted text
        if (extractionResult.extractedText) {
          setPdfText(extractionResult.extractedText);
        }
        setCurrentStep('✅ Tekst extraction færdig!');
      } else {
        throw new Error(extractionResult.error || 'Text extraction failed');
      }

      // Clear current step after 3 seconds
      setTimeout(() => setCurrentStep(''), 3000);

    } catch (error) {
      console.error('Text extraction error:', error);
      setTextResult({
        success: false,
        error: error instanceof Error ? error.message : 'Ukendt fejl ved text extraction'
      });
      setCurrentStep('Fejl ved text extraction');
    } finally {
      setIsExtractingText(false);
    }
  };

  const extractWithRailway = async () => {
    if (!selectedFile) {
      alert('Vælg venligst en PDF fil først');
      return;
    }

    setIsRailwayExtracting(true);
    setCurrentStep('Extractor tekst med Railway PDF service...');
    setRailwayResult(null);

    try {
      // Use Railway PDF extraction service
      const customPatterns = extractionProfile === 'automotive' ? getDanishCarPatterns() : [];
      const result = await pdfExtractor.extractStructured(selectedFile, extractionProfile, customPatterns);
      
      setRailwayResult(result);
      
      if (result.success && result.data?.text) {
        // Auto-populate the text area with extracted text
        setPdfText(result.data.text);
        setCurrentStep('✅ Railway tekst extraction færdig!');
        
        // Clear textResult to ensure Railway result takes precedence
        setTextResult(null);
      } else {
        throw new Error(result.error || 'Railway extraction failed');
      }

      // Clear current step after 3 seconds
      setTimeout(() => setCurrentStep(''), 3000);

    } catch (error) {
      console.error('Railway extraction error:', error);
      setRailwayResult({
        success: false,
        error: error instanceof Error ? error.message : 'Railway service ikke tilgængelig'
      });
      setCurrentStep('Railway service fejl - brug manuel input');
      
      // Auto-suggest manual input
      setTimeout(() => {
        setCurrentStep('Kopier tekst fra PDF og indsæt manuelt nedenfor');
      }, 2000);
    } finally {
      setIsRailwayExtracting(false);
    }
  };

  const extractCars = async () => {
    // Determine text source - prioritize Railway, then Supabase extraction, then manual input
    const textToProcess = railwayResult?.data?.text || textResult?.extractedText || pdfText.trim();
    const textSource = railwayResult?.data?.text ? 'Railway extraction' : 
                       textResult?.extractedText ? 'Supabase extraction' : 'Manual input';
    
    if (!textToProcess) {
      alert('Upload PDF og extract tekst først, eller indsæt tekst manuelt');
      return;
    }

    setIsExtracting(true);
    setExtractProgress(0);
    setCurrentStep(`Starter AI extraction fra ${textSource}...`);
    setResult(null);

    try {
      setCurrentStep('Sender til OpenAI GPT-4o...');
      setExtractProgress(20);

      // Send to OpenAI Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-cars-openai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          textContent: textToProcess,
          dealerName: dealerName,
          fileName: uploadResult?.fileName || textResult?.metadata?.fileName || 'manual-input'
        })
      });

      setCurrentStep('Behandler med OpenAI GPT-4o...');
      setExtractProgress(60);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI extraction failed: ${response.status} ${errorText}`);
      }

      const extractionResult = await response.json();
      setExtractProgress(100);
      setCurrentStep('✅ AI extraction færdig!');

      if (extractionResult.success) {
        setResult({
          success: true,
          totalCars: extractionResult.totalCars,
          cars: extractionResult.cars || [],
          metadata: {
            ...extractionResult.metadata,
            textSource: textSource,
            textLength: textToProcess.length
          }
        });
      } else {
        throw new Error(extractionResult.error || 'AI extraction failed');
      }

      // Clear current step after 3 seconds
      setTimeout(() => setCurrentStep(''), 3000);

    } catch (error) {
      console.error('AI extraction error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Ukendt fejl ved AI extraction'
      });
      setCurrentStep('Fejl ved AI extraction');
    } finally {
      setIsExtracting(false);
    }
  };


  const resetExtraction = () => {
    setResult(null);
    setExtractProgress(0);
    setCurrentStep('');
    setJobId(null);
  };

  const resetUpload = () => {
    setUploadResult(null);
    setUploadProgress(0);
    setTextResult(null);
    setPdfText('');
  };

  const handleSaveToDatabase = async () => {
    if (!result?.cars || result.cars.length === 0) {
      toast.error('Ingen biler at gemme');
      return;
    }

    if (!selectedSellerId) {
      toast.error('Vælg venligst en sælger først');
      return;
    }

    setIsSaving(true);
    try {
      // Model name mapping from uppercase to database format
      const modelNameMapping: Record<string, string> = {
        'AYGO X': 'Aygo X',
        'YARIS': 'Yaris',
        'YARIS CROSS': 'Yaris Cross',
        'URBAN CRUISER': 'Urban Cruiser',
        'COROLLA': 'Corolla',
        'C-HR': 'C-HR',
        'RAV4': 'RAV4',
        'HIGHLANDER': 'Highlander',
        'BZ4X': 'bZ4X',
        'PROACE': 'Proace'
      };

      // Transform extracted cars to match batch creation format
      const transformedCars = result.cars.map(car => {
        // Use new offers array format or create from legacy fields
        let offers = [];
        
        if (car.offers && Array.isArray(car.offers) && car.offers.length > 0) {
          // Use extracted multiple offers from OpenAI
          offers = car.offers.map(offer => ({
            monthly_price: offer.monthly_price,
            first_payment: offer.first_payment || (offer.monthly_price * 3),
            period_months: offer.period_months || 36,
            mileage_per_year: offer.mileage_per_year || 15000
          }));
        } else {
          // Fallback to legacy single offer format
          const monthlyPrice = car.monthly_price || car.priceNum || 0;
          offers = [{
            monthly_price: monthlyPrice,
            first_payment: car.first_payment || (monthlyPrice * 3),
            period_months: car.period_months || 36,
            mileage_per_year: car.mileage_per_year || 15000
          }];
        }
        
        return {
          make: car.make,
          model: modelNameMapping[car.model] || car.model, // Map to correct case
          variant: car.variant || '',
          horsepower: car.horsepower,
          fuel_type: car.fuel_type || car.fuelType || 'Petrol',
          transmission: car.transmission || 'Automatic',
          body_type: car.body_type || 'SUV',
          doors: car.doors,
          // Use processed offers array (can be multiple offers per car)
          offers: offers
        };
      });

      const batchResult = await createBatchListings(selectedSellerId, transformedCars);
      
      if (batchResult.successfulCars > 0) {
        // Show success message
        toast.success(
          `✅ ${batchResult.successfulCars} bil${batchResult.successfulCars > 1 ? 'er' : ''} oprettet succesfuldt!`,
          {
            duration: 4000,
            description: 'Videresendes til bil oversigt...'
          }
        );
        
        // Navigate to admin listings overview after a short delay
        setTimeout(() => {
          navigate('/admin/listings');
        }, 1500);
      } else if (batchResult.errors.length > 0) {
        // Only show error if no cars were created
        const errorMessages = batchResult.errors.join(', ');
        toast.error(`Fejl ved oprettelse: ${errorMessages}`);
      }
    } catch (error) {
      console.error('Save to database error:', error);
      toast.error('Der opstod en fejl ved gemning til database');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">PDF Car Extraction</h1>
          <p className="text-muted-foreground">
            Upload PDF indhold og extract liste af biler med AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                PDF Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dealer-name">Dealer Navn</Label>
                <Input
                  id="dealer-name"
                  value={dealerName}
                  onChange={(e) => setDealerName(e.target.value)}
                  placeholder="f.eks. Toyota Danmark"
                />
              </div>

              <div>
                <Label htmlFor="pdf-upload">Upload PDF</Label>
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                  disabled={isUploading}
                />
                {isUploading && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {currentStep}
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}
                {uploadResult && (
                  <div className="mt-2">
                    {uploadResult.success ? (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          ✅ PDF uploaded successfully!
                          <div className="mt-2 space-y-1 text-xs">
                            <div>File: {uploadResult.fileName}</div>
                            <div>Size: {(uploadResult.fileSize! / 1024 / 1024).toFixed(2)} MB</div>
                            <div className="flex items-center gap-1">
                              <Link className="h-3 w-3" />
                              <a 
                                href={uploadResult.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                View file
                              </a>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          ❌ Upload failed: {uploadResult.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  PDF uploaded - nu kan du ekstrahere tekst
                </p>
              </div>

              {/* Railway PDF Extraction Section */}
              {selectedFile && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Railway PDF Extraction (Anbefalet)
                    </Label>
                    <Select value={extractionProfile} onValueChange={(value: ExtractionProfile) => setExtractionProfile(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automotive">Automotive</SelectItem>
                        <SelectItem value="generic">Generic</SelectItem>
                        <SelectItem value="invoice">Invoice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    onClick={extractWithRailway}
                    disabled={isRailwayExtracting || !selectedFile}
                    className="w-full mb-2"
                  >
                    {isRailwayExtracting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extractor med Railway...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Extract Tekst med Railway
                      </>
                    )}
                  </Button>

                  {railwayResult && (
                    <div className="mt-2">
                      {railwayResult.success ? (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            ✅ Railway extraction success!
                            <div className="mt-2 space-y-1 text-xs">
                              <div>Profile: {railwayResult.profile}</div>
                              <div>Text: {railwayResult.data?.text.length.toLocaleString()} tegn</div>
                              <div>Pages: {railwayResult.data?.metadata.page_count}</div>
                              {railwayResult.data?.structure && (
                                <div>Type: {railwayResult.data.structure.document_type}</div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            ❌ Railway extraction failed: {railwayResult.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Railway service kan håndtere komprimerede PDFs
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="pdf-text">PDF Tekst (Optional)</Label>
                <Textarea
                  id="pdf-text"
                  value={pdfText}
                  onChange={(e) => setPdfText(e.target.value)}
                  placeholder="Eller indsæt PDF tekst manuelt..."
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {pdfText.length} tegn {uploadResult && '(PDF uploaded - ready for server processing)'}
                </p>
              </div>

              <div className="space-y-2">
                {uploadResult && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={extractTextFromPDF}
                      disabled={isExtractingText || isUploading}
                      className="flex-1"
                      variant="secondary"
                    >
                      {isExtractingText ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Extractor tekst...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Extract Tekst fra PDF
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={resetUpload}
                      variant="outline"
                      className="flex-1"
                    >
                      Upload Ny PDF
                    </Button>
                  </div>
                )}
                
                <Button 
                  onClick={extractCars}
                  disabled={isExtracting || isUploading || (!pdfText.trim() && !textResult?.extractedText)}
                  className="w-full"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extractor biler...
                    </>
                  ) : isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploader...
                    </>
                  ) : (
                    <>
                      <Car className="mr-2 h-4 w-4" />
                      Extract Biler med AI
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Extraction Resultater
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Text Extraction Progress */}
              {isExtractingText && (
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>{currentStep}</span>
                      <span>Processing...</span>
                    </div>
                    <Progress value={50} className="w-full" />
                  </div>
                </div>
              )}

              {/* Text Extraction Results */}
              {textResult && (
                <div className="space-y-4 mb-6">
                  {textResult.success ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        ✅ Text extracted successfully!
                        {textResult.metadata && (
                          <div className="mt-2 space-y-1 text-xs">
                            <div>Pages: {textResult.metadata.pageCount}</div>
                            <div>Characters: {textResult.extractedText?.length || 0}</div>
                            <div>File: {textResult.metadata.fileName}</div>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        ❌ Text extraction failed: {textResult.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {textResult.extractedText && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Extracted Text (First 500 characters):</h3>
                      <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted font-mono text-sm">
                        {textResult.extractedText.substring(0, 500)}
                        {textResult.extractedText.length > 500 && '...'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Full text loaded into text area below for AI processing
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* AI Extraction Progress */}
              {isExtracting && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>{currentStep}</span>
                      <span>{extractProgress}%</span>
                    </div>
                    <Progress value={extractProgress} className="w-full" />
                  </div>
                  {jobId && (
                    <p className="text-sm text-muted-foreground">
                      Job ID: {jobId}
                    </p>
                  )}
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {result.success ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        ✅ OpenAI extraction success! Fundet {result.totalCars} biler
                        {result.metadata && (
                          <div className="mt-2 space-y-1 text-xs">
                            {result.metadata.textSource && <div>Kilde: {result.metadata.textSource}</div>}
                            {result.metadata.originalTextLength && result.metadata.processedTextLength && (
                              <>
                                <div>Original tekst: {result.metadata.originalTextLength.toLocaleString()} tegn</div>
                                <div>Processed tekst: {result.metadata.processedTextLength.toLocaleString()} tegn</div>
                                {result.metadata.compressionRatio !== undefined && (
                                  <div>Kompression: {result.metadata.compressionRatio}% reduceret</div>
                                )}
                              </>
                            )}
                            <div>Processing tid: {result.metadata.processingTime}ms</div>
                            {result.metadata.tokensUsed && <div>Tokens brugt: {result.metadata.tokensUsed}</div>}
                            {result.metadata.cost && <div>Estimeret omkostning: ${result.metadata.cost.toFixed(4)}</div>}
                            {result.metadata.wasLimited && (
                              <div className="text-amber-600">{result.metadata.limitReason}</div>
                            )}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        ❌ Fejl: {result.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {result.cars && result.cars.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Extractede Biler:</h3>
                      <div className="max-h-96 overflow-y-auto border rounded-lg p-3">
                        {result.cars.map((car, index) => (
                          <div key={index} className="py-3 border-b last:border-b-0">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-bold text-lg">
                                  {car.make} {car.model}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {car.variant}
                                </div>
                                {(car.horsepower || car.fuel_type || car.fuelType || car.transmission || car.body_type) && (
                                  <div className="text-xs text-muted-foreground mt-1 space-x-2">
                                    {car.horsepower && <span>🏎️ {car.horsepower} HK</span>}
                                    {(car.fuel_type || car.fuelType) && <span>⛽ {car.fuel_type || car.fuelType}</span>}
                                    {car.transmission && <span>⚙️ {car.transmission}</span>}
                                    {car.body_type && <span>🚗 {car.body_type}</span>}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-primary font-bold text-lg">
                                  {car.monthly_price ? 
                                    `${car.monthly_price.toLocaleString('da-DK')} kr/md` : 
                                    car.monthlyPrice || 'N/A'
                                  }
                                </div>
                                {car.year && (
                                  <div className="text-xs text-muted-foreground">
                                    Årgang {car.year}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seller Selection for Batch Save */}
                  {result.success && result.cars && result.cars.length > 0 && (
                    <div className="space-y-4 border-t pt-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Vælg Sælger for Batch Import
                        </Label>
                        <StandaloneSellerSelect
                          value={selectedSellerId}
                          onValueChange={setSelectedSellerId}
                        />
                      </div>
                      
                      {batchProgress.isProcessing && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Opretter bil {batchProgress.currentCar} af {batchProgress.totalCars}</span>
                            <span>{Math.round((batchProgress.currentCar / batchProgress.totalCars) * 100)}%</span>
                          </div>
                          <Progress value={(batchProgress.currentCar / batchProgress.totalCars) * 100} />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={resetExtraction} variant="outline" size="sm">
                      Ny Extraction
                    </Button>
                    {result.success && (
                      <Button 
                        size="sm"
                        onClick={handleSaveToDatabase}
                        disabled={!selectedSellerId || isSaving || batchProgress.isProcessing}
                      >
                        {isSaving || batchProgress.isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Gemmer...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Gem til Database
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {!isExtracting && !result && (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  {!uploadResult && !textResult && !pdfText.trim() && (
                    <p>Upload PDF eller indsæt bil tekst, derefter klik "Extract Biler med AI"</p>
                  )}
                  {uploadResult && !textResult && (
                    <p className="text-amber-600">PDF uploaded! Klik "Extract Tekst fra PDF" først</p>
                  )}
                  {textResult && (
                    <p className="text-green-600">PDF tekst extracted! Ready for AI extraction</p>
                  )}
                  {pdfText.trim() && !textResult && (
                    <p className="text-green-600">Manuel tekst ready! Ready for AI extraction</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Instruktioner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Metode 1 (Komplet PDF → AI workflow):</strong></p>
              <ul className="ml-4 space-y-1 list-disc">
                <li>Upload PDF → Klik "Extract Tekst fra PDF"</li>
                <li>Klik "Extract Biler med AI" (bruger automatisk PDF tekst)</li>
                <li>Se strukturerede bil data med priser og specifikationer</li>
                <li>GPT-4o identificerer automatisk alle bil varianter</li>
              </ul>
              
              <p className="pt-2"><strong>Metode 2 (Manuel tekst + OpenAI):</strong></p>
              <ul className="ml-4 space-y-1 list-disc">
                <li>Indsæt bil prisliste tekst direkte i tekstområdet</li>
                <li>Klik "Extract Biler med AI" for OpenAI GPT-4 extraction</li>
                <li>Se extractede biler med priser, motor info og varianter</li>
              </ul>
              
              <p className="pt-2"><strong>✅ OpenAI Integration:</strong> GPT-4 intelligent bil extraction med dansk prompt</p>
              <p className="pt-1"><strong>Note:</strong> Systemet identificerer automatisk Toyota, VW, BMW, Audi og andre danske bilmærker</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}