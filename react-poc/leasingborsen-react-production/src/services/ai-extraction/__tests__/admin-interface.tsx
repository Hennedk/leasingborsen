/**
 * Admin Testing Interface for AI Extraction Service
 * 
 * This React component provides a comprehensive admin interface
 * for testing and monitoring the AI extraction service.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createTestService } from '../extraction/extractor'
import { validatePhase1, runComprehensiveTests } from './test-runner'
import { compareProviders, testProvider } from './provider-harness.test'
import { 
  TOYOTA_SAMPLE_CONTENT,
  BMW_SAMPLE_CONTENT,
  MERCEDES_SAMPLE_CONTENT,
  TEST_CASES,
  COST_TEST_SCENARIOS
} from './sample-data'
import type { ExtractionResult, ExtractionOptions } from '../types'

interface TestResult {
  id: string
  timestamp: Date
  content: string
  dealer: string
  result: ExtractionResult
  processingTime: number
  status: 'success' | 'error' | 'warning'
}

interface ServiceStats {
  totalTests: number
  successfulTests: number
  failedTests: number
  avgProcessingTime: number
  totalCost: number
}

export const AdminTestingInterface: React.FC = () => {
  // State management
  const [testContent, setTestContent] = useState('')
  const [selectedDealer, setSelectedDealer] = useState('Test Dealer')
  const [selectedStrategy, setSelectedStrategy] = useState<'primary_only' | 'primary_with_fallback' | 'cost_optimized'>('primary_only')
  const [enableValidation, setEnableValidation] = useState(true)
  const [enableCostChecking, setEnableCostChecking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [serviceStats, setServiceStats] = useState<ServiceStats>({
    totalTests: 0,
    successfulTests: 0,
    failedTests: 0,
    avgProcessingTime: 0,
    totalCost: 0
  })
  const [systemStatus, setSystemStatus] = useState<any>(null)
  const [comprehensiveTestResults, setComprehensiveTestResults] = useState<any>(null)

  // Initialize service
  const [service] = useState(() => createTestService())

  // Load sample content options
  const sampleContent = {
    'Toyota Aygo X': TOYOTA_SAMPLE_CONTENT,
    'BMW Electric/Hybrid': BMW_SAMPLE_CONTENT,
    'Mercedes Comprehensive': MERCEDES_SAMPLE_CONTENT,
    'Minimal Content': TEST_CASES.minimal,
    'Special Characters': TEST_CASES.specialCharacters,
    'Multiple Models': TEST_CASES.multipleModels,
    'Low Cost Test': COST_TEST_SCENARIOS.lowCost.content,
    'Medium Cost Test': COST_TEST_SCENARIOS.mediumCost.content,
    'High Cost Test': COST_TEST_SCENARIOS.highCost.content
  }

  // Update service status
  const updateServiceStatus = useCallback(async () => {
    try {
      const status = await service.getServiceStatus()
      setSystemStatus(status)

      // Update stats
      setServiceStats(prev => ({
        ...prev,
        totalTests: status.totalExtractions,
        successfulTests: status.successfulExtractions,
        failedTests: status.totalExtractions - status.successfulExtractions,
        avgProcessingTime: status.avgProcessingTimeMs
      }))
    } catch (error) {
      console.error('Failed to update service status:', error)
    }
  }, [service])

  useEffect(() => {
    updateServiceStatus()
  }, [updateServiceStatus])

  // Single extraction test
  const runSingleTest = async () => {
    if (!testContent.trim()) {
      alert('Please enter test content')
      return
    }

    setIsLoading(true)
    const startTime = Date.now()

    try {
      const options: ExtractionOptions = {
        dealer: selectedDealer,
        language: 'da',
        strategy: selectedStrategy,
        enableValidation,
        enableCostChecking
      }

      const result = await service.extract(testContent, options)
      const processingTime = Date.now() - startTime

      const testResult: TestResult = {
        id: `test-${Date.now()}`,
        timestamp: new Date(),
        content: testContent.substring(0, 100) + '...',
        dealer: selectedDealer,
        result,
        processingTime,
        status: result.success ? 'success' : 'error'
      }

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]) // Keep last 10 results
      await updateServiceStatus()

    } catch (error) {
      console.error('Test failed:', error)
      const testResult: TestResult = {
        id: `test-${Date.now()}`,
        timestamp: new Date(),
        content: testContent.substring(0, 100) + '...',
        dealer: selectedDealer,
        result: { success: false, error: { type: 'EXTRACTION', message: String(error) } } as any,
        processingTime: Date.now() - startTime,
        status: 'error'
      }
      setTestResults(prev => [testResult, ...prev.slice(0, 9)])
    } finally {
      setIsLoading(false)
    }
  }

  // Run comprehensive tests
  const runComprehensiveTestSuite = async () => {
    setIsLoading(true)
    try {
      const results = await runComprehensiveTests()
      setComprehensiveTestResults(results)
    } catch (error) {
      console.error('Comprehensive tests failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Validate Phase 1
  const validatePhase1Implementation = async () => {
    setIsLoading(true)
    try {
      const isValid = await validatePhase1()
      alert(isValid ? '✅ Phase 1 validation passed!' : '❌ Phase 1 validation failed')
    } catch (error) {
      console.error('Phase 1 validation failed:', error)
      alert('❌ Phase 1 validation failed with error')
    } finally {
      setIsLoading(false)
    }
  }

  // Load sample content
  const loadSampleContent = (key: string) => {
    setTestContent(sampleContent[key as keyof typeof sampleContent] || '')
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧪 AI Extraction Service - Admin Testing Interface
            <Badge variant={systemStatus?.initialized ? 'default' : 'destructive'}>
              {systemStatus?.initialized ? 'Online' : 'Offline'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{serviceStats.totalTests}</div>
                <p className="text-sm text-muted-foreground">Total Tests</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{serviceStats.successfulTests}</div>
                <p className="text-sm text-muted-foreground">Successful</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{serviceStats.failedTests}</div>
                <p className="text-sm text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{Math.round(serviceStats.avgProcessingTime)}ms</div>
                <p className="text-sm text-muted-foreground">Avg Time</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="single-test" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="single-test">Single Test</TabsTrigger>
          <TabsTrigger value="batch-tests">Batch Tests</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        {/* Single Test Tab */}
        <TabsContent value="single-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Single Extraction Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Sample Content</label>
                  <Select onValueChange={loadSampleContent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sample content" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(sampleContent).map(key => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Dealer</label>
                  <Select value={selectedDealer} onValueChange={setSelectedDealer}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Toyota Denmark">Toyota Denmark</SelectItem>
                      <SelectItem value="BMW Denmark">BMW Denmark</SelectItem>
                      <SelectItem value="Mercedes-Benz Denmark">Mercedes-Benz Denmark</SelectItem>
                      <SelectItem value="Test Dealer">Test Dealer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Strategy</label>
                  <Select value={selectedStrategy} onValueChange={setSelectedStrategy as any}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary_only">Primary Only</SelectItem>
                      <SelectItem value="primary_with_fallback">Primary with Fallback</SelectItem>
                      <SelectItem value="cost_optimized">Cost Optimized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="validation"
                    checked={enableValidation}
                    onChange={(e) => setEnableValidation(e.target.checked)}
                  />
                  <label htmlFor="validation" className="text-sm">Enable Validation</label>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="cost-checking"
                    checked={enableCostChecking}
                    onChange={(e) => setEnableCostChecking(e.target.checked)}
                  />
                  <label htmlFor="cost-checking" className="text-sm">Enable Cost Checking</label>
                </div>
              </div>

              <Textarea
                placeholder="Enter test content here..."
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                rows={10}
              />

              <Button 
                onClick={runSingleTest} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Running Test...' : 'Run Single Test'}
              </Button>

              {/* Recent Test Results */}
              {testResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Recent Results</h3>
                  {testResults.slice(0, 3).map(result => (
                    <Card key={result.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                              {result.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {result.dealer} • {result.processingTime}ms
                            </span>
                          </div>
                          <p className="text-sm mt-1">{result.content}</p>
                          {result.result.success && result.result.data && (
                            <div className="text-sm text-muted-foreground mt-2">
                              {result.result.data.vehicles.length} vehicles • 
                              Confidence: {Math.round((result.result.validationResult?.confidence || 0) * 100)}%
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Tests Tab */}
        <TabsContent value="batch-tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Testing & Validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={runComprehensiveTestSuite}
                  disabled={isLoading}
                  variant="outline"
                >
                  Run Comprehensive Test Suite
                </Button>
                <Button 
                  onClick={validatePhase1Implementation}
                  disabled={isLoading}
                  variant="outline"
                >
                  Validate Phase 1 Implementation
                </Button>
              </div>

              {comprehensiveTestResults && (
                <Card>
                  <CardHeader>
                    <CardTitle>Comprehensive Test Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {comprehensiveTestResults.passedTests}
                        </div>
                        <div className="text-sm text-muted-foreground">Passed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {comprehensiveTestResults.failedTests}
                        </div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {Math.round((comprehensiveTestResults.passedTests / comprehensiveTestResults.totalTests) * 100)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Success Rate</div>
                      </div>
                    </div>
                    
                    <Progress 
                      value={(comprehensiveTestResults.passedTests / comprehensiveTestResults.totalTests) * 100} 
                      className="mb-4"
                    />

                    <div className="space-y-2">
                      {Object.entries(comprehensiveTestResults.components).map(([component, result]: [string, any]) => (
                        <div key={component} className="flex justify-between items-center p-2 border rounded">
                          <span className="font-medium">{component}</span>
                          <Badge variant={result.failed === 0 ? 'default' : 'destructive'}>
                            {result.passed}/{result.tests}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              {systemStatus && (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      System Status: {systemStatus.initialized ? 'Initialized' : 'Not Initialized'}
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Available Providers</h4>
                      <div className="space-y-1">
                        {systemStatus.availableProviders?.map((provider: string) => (
                          <Badge key={provider} variant="outline">{provider}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Configuration</h4>
                      <div className="text-sm space-y-1">
                        <div>Primary Provider: {systemStatus.primaryProvider}</div>
                        <div>Success Rate: {Math.round((systemStatus.successRate || 0) * 100)}%</div>
                        <div>Avg Processing: {Math.round(systemStatus.avgProcessingTimeMs || 0)}ms</div>
                      </div>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-xl font-bold">{systemStatus.totalExtractions || 0}</div>
                          <div className="text-sm text-muted-foreground">Total Extractions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold">{systemStatus.successfulExtractions || 0}</div>
                          <div className="text-sm text-muted-foreground">Successful</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold">{Math.round(systemStatus.avgProcessingTimeMs || 0)}ms</div>
                          <div className="text-sm text-muted-foreground">Avg Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold">{Math.round((systemStatus.successRate || 0) * 100)}%</div>
                          <div className="text-sm text-muted-foreground">Success Rate</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validation Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Validation tests check business rules, data quality, and Danish market compliance.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Button variant="outline" onClick={() => loadSampleContent('Toyota Aygo X')}>
                  Test Valid Toyota Document
                </Button>
                <Button variant="outline" onClick={() => setTestContent('Invalid pricing: 50 kr/month')}>
                  Test Invalid Pricing
                </Button>
                <Button variant="outline" onClick={() => setTestContent('Electric car without battery specs')}>
                  Test Missing Electric Specs
                </Button>
                <Button variant="outline" onClick={() => setTestContent('Citroën C3 Aircross special chars')}>
                  Test Special Characters
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminTestingInterface