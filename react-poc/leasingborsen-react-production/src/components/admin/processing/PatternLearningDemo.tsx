import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
// import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  Play, 
  RotateCcw,
  CheckCircle,
  XCircle,
  TrendingUp,
  Target,
  Lightbulb
} from 'lucide-react'

/**
 * Demo component to showcase the Pattern Learning Intelligence System
 * This demonstrates how the system would work without requiring database access
 */

interface DemoPattern {
  id: string
  pattern: string
  field: string
  successRate: number
  examples: string[]
  status: 'active' | 'testing' | 'discovered'
}

interface ExtractionDemo {
  text: string
  expectedValues: Record<string, string>
  extractedValues: Record<string, string>
  confidence: number
  patternsUsed: string[]
}

export const PatternLearningDemo: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<string>('volkswagen')
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ExtractionDemo | null>(null)
  
  // Demo patterns for different scenarios
  const demoPatterns: Record<string, DemoPattern[]> = {
    volkswagen: [
      {
        id: '1',
        pattern: 'Pris:\\s*([0-9]{1,3}(?:\\.[0-9]{3})*)',
        field: 'price',
        successRate: 0.92,
        examples: ['Pris: 245.000', 'Pris: 189.500'],
        status: 'active'
      },
      {
        id: '2', 
        pattern: 'Km-stand:\\s*([0-9]{1,3}(?:\\.[0-9]{3})*)\\s*km',
        field: 'mileage',
        successRate: 0.88,
        examples: ['Km-stand: 45.000 km', 'Km-stand: 12.500 km'],
        status: 'active'
      },
      {
        id: '3',
        pattern: 'Månedlig ydelse:\\s*([0-9]{1,3}(?:\\.[0-9]{3})*)\\s*kr',
        field: 'monthly_payment',
        successRate: 0.75,
        examples: ['Månedlig ydelse: 3.250 kr'],
        status: 'testing'
      },
      {
        id: '4',
        pattern: 'Model:\\s*([A-Z][a-z]+\\s+[A-Z0-9][a-z0-9\\s]+)',
        field: 'model',
        successRate: 0.65,
        examples: ['Model: Golf GTI'],
        status: 'discovered'
      }
    ],
    toyota: [
      {
        id: '5',
        pattern: 'Price:\\s*DKK\\s*([0-9,]+)',
        field: 'price',
        successRate: 0.78,
        examples: ['Price: DKK 299,000'],
        status: 'active'
      },
      {
        id: '6',
        pattern: 'Mileage:\\s*([0-9,]+)\\s*km',
        field: 'mileage',
        successRate: 0.82,
        examples: ['Mileage: 35,000 km'],
        status: 'active'
      },
      {
        id: '7',
        pattern: 'Monthly lease:\\s*DKK\\s*([0-9,]+)',
        field: 'monthly_payment',
        successRate: 0.70,
        examples: ['Monthly lease: DKK 4,500'],
        status: 'testing'
      }
    ]
  }
  
  // Sample PDF text for different dealers
  const sampleTexts: Record<string, string> = {
    volkswagen: `
Volkswagen Golf GTI

Specifikationer:
Model: Golf GTI
Årgang: 2021
Km-stand: 25.000 km
Brændstof: Benzin
Gear: Manuel

Pris: 285.000
Månedlig ydelse: 3.650 kr
Udbetaling: 45.000 kr

Forhandler: Volkswagen København
    `,
    toyota: `
Toyota Prius Hybrid

Specifications:
Model: Prius Hybrid
Year: 2022
Mileage: 18,500 km
Fuel: Hybrid
Transmission: Automatic

Price: DKK 345,000
Monthly lease: DKK 4,200
Down payment: DKK 52,000

Dealer: Toyota Denmark
    `
  }
  
  const runExtractionDemo = async () => {
    setIsRunning(true)
    setProgress(0)
    setResults(null)
    
    const patterns = demoPatterns[selectedDemo]
    const text = sampleTexts[selectedDemo]
    
    // Simulate extraction process with progress
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Simulate pattern matching
    const extractedValues: Record<string, string> = {}
    const patternsUsed: string[] = []
    
    patterns.forEach(pattern => {
      if (pattern.status === 'active' || pattern.status === 'testing') {
        const regex = new RegExp(pattern.pattern, 'i')
        const match = text.match(regex)
        if (match && match[1]) {
          extractedValues[pattern.field] = match[1]
          patternsUsed.push(pattern.pattern)
        }
      }
    })
    
    // Expected values for comparison
    const expectedValues: Record<string, string> = selectedDemo === 'volkswagen' ? {
      price: '285.000',
      mileage: '25.000',
      monthly_payment: '3.650'
    } : {
      price: '345,000',
      mileage: '18,500',
      monthly_payment: '4,200'
    }
    
    // Calculate confidence based on successful extractions
    const successfulExtractions = Object.keys(expectedValues).filter(
      key => extractedValues[key] === expectedValues[key]
    ).length
    const confidence = successfulExtractions / Object.keys(expectedValues).length
    
    setResults({
      text,
      expectedValues,
      extractedValues,
      confidence,
      patternsUsed
    })
    
    setIsRunning(false)
  }
  
  const resetDemo = () => {
    setResults(null)
    setProgress(0)
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'testing': return 'secondary' 
      case 'discovered': return 'outline'
      default: return 'destructive'
    }
  }
  
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600'
    if (rate >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Pattern Learning Intelligence - Demo</h2>
      </div>
      
      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertDescription>
          Denne demo viser hvordan Pattern Learning Intelligence systemet arbejder.
          Systemet lærer automatisk nye mønstre fra PDF'er og forbedrer ekstraktions-nøjagtigheden over tid.
        </AlertDescription>
      </Alert>
      
      {/* Demo Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Kontrolpanel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Vælg Forhandler Type:</Label>
              <div className="flex gap-2">
                <Button
                  variant={selectedDemo === 'volkswagen' ? 'default' : 'outline'}
                  onClick={() => setSelectedDemo('volkswagen')}
                >
                  Volkswagen
                </Button>
                <Button
                  variant={selectedDemo === 'toyota' ? 'default' : 'outline'}
                  onClick={() => setSelectedDemo('toyota')}
                >
                  Toyota
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={runExtractionDemo} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Kører Ekstraktion...' : 'Start Demo'}
            </Button>
            <Button 
              onClick={resetDemo} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
          
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Ekstraktions Progress:</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Current Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Lærte Mønstre for {selectedDemo === 'volkswagen' ? 'Volkswagen' : 'Toyota'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demoPatterns[selectedDemo].map(pattern => (
              <div key={pattern.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{pattern.field}</Badge>
                    <Badge variant={getStatusColor(pattern.status)}>
                      {pattern.status}
                    </Badge>
                  </div>
                  <span className={`text-sm font-medium ${getSuccessRateColor(pattern.successRate)}`}>
                    {(pattern.successRate * 100).toFixed(0)}%
                  </span>
                </div>
                
                <code className="text-xs bg-muted p-2 rounded block break-all">
                  {pattern.pattern}
                </code>
                
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Eksempler:</span>
                  {pattern.examples.map((example, idx) => (
                    <div key={idx} className="text-xs bg-background border rounded px-2 py-1">
                      {example}
                    </div>
                  ))}
                </div>
                
                <Progress value={pattern.successRate * 100} className="h-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Sample PDF Text */}
      <Card>
        <CardHeader>
          <CardTitle>Sample PDF Tekst</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            value={sampleTexts[selectedDemo]}
            readOnly
            rows={12}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>
      
      {/* Extraction Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Ekstraktions Resultater
              <Badge variant={results.confidence >= 0.8 ? 'default' : 'secondary'}>
                {(results.confidence * 100).toFixed(0)}% Konfidans
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2">Forventede Værdier</h4>
                <div className="space-y-2">
                  {Object.entries(results.expectedValues).map(([field, value]) => (
                    <div key={field} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm font-medium">{field}:</span>
                      <span className="text-sm">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Ekstraherede Værdier</h4>
                <div className="space-y-2">
                  {Object.entries(results.expectedValues).map(([field, expectedValue]) => {
                    const extractedValue = results.extractedValues[field]
                    const isCorrect = extractedValue === expectedValue
                    
                    return (
                      <div key={field} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm font-medium">{field}:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{extractedValue || '–'}</span>
                          {isCorrect ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Anvendte Mønstre</h4>
                <div className="space-y-2">
                  {results.patternsUsed.map((pattern, idx) => (
                    <code key={idx} className="text-xs bg-background border rounded p-2 block break-all">
                      {pattern.length > 30 ? pattern.substring(0, 30) + '...' : pattern}
                    </code>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="font-medium">Samlet Konfidans:</span>
              </div>
              <Progress value={results.confidence * 100} className="flex-1 h-3" />
              <span className={`font-bold ${getSuccessRateColor(results.confidence)}`}>
                {(results.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Learning Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Lærings Indsigter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">4</div>
              <div className="text-sm text-muted-foreground">Aktive Mønstre</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">2</div>
              <div className="text-sm text-muted-foreground">Test Mønstre</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">1</div>
              <div className="text-sm text-muted-foreground">Opdagede Mønstre</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">85%</div>
              <div className="text-sm text-muted-foreground">Gennemsnit Succesrate</div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Systemets Fordele:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Automatisk opdagelse af nye mønstre fra PDF'er</li>
              <li>• Kontinuerlig forbedring af ekstraktions-nøjagtighed</li>
              <li>• Tilpasning til forhandler-specifikke formater</li>
              <li>• A/B testing af nye mønstre før implementering</li>
              <li>• Format-ændring detektion og tilpasning</li>
              <li>• Performance overvågning og optimering</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}