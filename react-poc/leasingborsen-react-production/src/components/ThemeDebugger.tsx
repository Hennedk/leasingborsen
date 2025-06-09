import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DebugResults {
  cssVariables: string
  computedStyles: string
  cssRules: string
  overrideResults: string
  injectionResults: string
}

const ThemeDebugger: React.FC = () => {
  const [results, setResults] = useState<DebugResults>({
    cssVariables: '',
    computedStyles: '',
    cssRules: '',
    overrideResults: '',
    injectionResults: ''
  })

  // 1. Check CSS Variables
  const checkCSSVariables = () => {
    const root = document.documentElement
    const primaryVar = getComputedStyle(root).getPropertyValue('--primary').trim()
    const primaryForegroundVar = getComputedStyle(root).getPropertyValue('--primary-foreground').trim()
    
    const result = `
      --primary: "${primaryVar}" ${primaryVar ? '✅' : '❌'}<br/>
      --primary-foreground: "${primaryForegroundVar}" ${primaryForegroundVar ? '✅' : '❌'}<br/>
      Expected: "346 77% 49.8%"<br/>
      Current HTML class: "${document.documentElement.className}"<br/>
      Data-theme: "${document.documentElement.getAttribute('data-theme') || 'none'}"
    `
    
    setResults(prev => ({ ...prev, cssVariables: result }))
  }

  // 2. Analyze computed styles
  const analyzeComputedStyles = () => {
    // Create a test element
    const testDiv = document.createElement('div')
    testDiv.className = 'bg-primary text-primary-foreground'
    testDiv.style.position = 'absolute'
    testDiv.style.left = '-9999px'
    document.body.appendChild(testDiv)
    
    const computedBg = getComputedStyle(testDiv).backgroundColor
    const computedColor = getComputedStyle(testDiv).color
    
    document.body.removeChild(testDiv)
    
    const result = `
      bg-primary computed: ${computedBg}<br/>
      text-primary-foreground computed: ${computedColor}<br/>
      Expected BG: rgb(220, 38, 127) or similar pink<br/>
      Match: ${computedBg.includes('220') || computedBg.includes('pink') || computedBg.includes('346') ? '✅' : '❌'}<br/>
      Raw RGB: ${computedBg}
    `
    
    setResults(prev => ({ ...prev, computedStyles: result }))
  }

  // 3. Find conflicting CSS rules
  const investigateRules = () => {
    let rulesResult = ''
    const stylesheets = Array.from(document.styleSheets)
    
    stylesheets.forEach((sheet, index) => {
      try {
        const rules = Array.from(sheet.cssRules || [])
        const primaryRules = rules.filter(rule => 
          rule.cssText && (
            rule.cssText.includes('--primary') || 
            rule.cssText.includes('139, 92, 246') ||
            rule.cssText.includes('rgb(139, 92, 246)') ||
            rule.cssText.includes('262.1 83.3% 57.8%')
          )
        )
        
        if (primaryRules.length > 0) {
          rulesResult += `Stylesheet ${index} (${sheet.href ? new URL(sheet.href).pathname : 'inline'}): ${primaryRules.length} rules<br/>`
          primaryRules.forEach(rule => {
            rulesResult += `  - ${rule.cssText.substring(0, 150)}...<br/>`
          })
        }
      } catch (e) {
        rulesResult += `Stylesheet ${index}: Cross-origin or inaccessible<br/>`
      }
    })
    
    setResults(prev => ({ ...prev, cssRules: rulesResult || 'No conflicting rules found' }))
  }

  // 4. Test overrides
  const testOverrides = () => {
    // Create test buttons
    const normalBtn = document.createElement('button')
    normalBtn.className = 'bg-primary text-primary-foreground'
    normalBtn.style.position = 'absolute'
    normalBtn.style.left = '-9999px'
    
    const overrideBtn = document.createElement('button')
    overrideBtn.style.backgroundColor = 'hsl(346 77% 49.8%) !important'
    overrideBtn.style.position = 'absolute'
    overrideBtn.style.left = '-9999px'
    
    document.body.appendChild(normalBtn)
    document.body.appendChild(overrideBtn)
    
    const normalBg = getComputedStyle(normalBtn).backgroundColor
    const overrideBg = getComputedStyle(overrideBtn).backgroundColor
    
    document.body.removeChild(normalBtn)
    document.body.removeChild(overrideBtn)
    
    const result = `
      Normal button (bg-primary): ${normalBg}<br/>
      Forced override: ${overrideBg}<br/>
      Override working: ${normalBg !== overrideBg ? '✅' : '❌'}<br/>
      Issue: ${normalBg.includes('139') ? 'Purple detected in bg-primary!' : 'No purple detected'}
    `
    
    setResults(prev => ({ ...prev, overrideResults: result }))
  }

  // 5. Dynamic injection
  const injectCyberpunkTheme = () => {
    // Remove existing injected styles
    const existing = document.getElementById('cyberpunk-injection')
    if (existing) existing.remove()
    
    const style = document.createElement('style')
    style.id = 'cyberpunk-injection'
    style.innerHTML = `
      :root {
        --primary: 346 77% 49.8% !important;
        --primary-foreground: 355 7% 97% !important;
      }
      
      /* Target specific elements that might be overriding */
      .bg-primary,
      [class*="primary"],
      [class*="Primary"],
      button[class*="primary"] {
        background-color: hsl(346 77% 49.8%) !important;
        color: hsl(355 7% 97%) !important;
      }
      
      /* Target any hardcoded purple */
      *[style*="139, 92, 246"],
      *[style*="rgb(139, 92, 246)"] {
        background-color: hsl(346 77% 49.8%) !important;
      }
    `
    document.head.appendChild(style)
    
    setTimeout(() => {
      runAllTests()
      setResults(prev => ({ ...prev, injectionResults: '🚀 Cyberpunk theme injected with !important' }))
    }, 100)
  }

  const clearAllStyles = () => {
    const injected = document.getElementById('cyberpunk-injection')
    if (injected) injected.remove()
    
    setTimeout(() => {
      runAllTests()
      setResults(prev => ({ ...prev, injectionResults: '🧹 Overrides cleared' }))
    }, 100)
  }

  const runAllTests = () => {
    checkCSSVariables()
    analyzeComputedStyles()
    investigateRules()
    testOverrides()
  }

  useEffect(() => {
    runAllTests()
    // Also run tests after a delay to catch async CSS loading
    const timer = setTimeout(runAllTests, 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed top-4 right-4 w-96 max-h-screen overflow-y-auto z-50 bg-white border border-gray-300 rounded-lg shadow-xl">
      <div className="p-4 bg-gray-100 border-b">
        <h2 className="text-lg font-bold">🔍 Theme Debug Tool</h2>
        <Button onClick={runAllTests} size="sm" className="mt-2">
          Refresh Tests
        </Button>
      </div>
      
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">1. CSS Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-xs font-mono bg-gray-50 p-2 rounded"
              dangerouslySetInnerHTML={{ __html: results.cssVariables }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">2. Computed Styles</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-xs font-mono bg-gray-50 p-2 rounded"
              dangerouslySetInnerHTML={{ __html: results.computedStyles }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">3. CSS Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-xs font-mono bg-gray-50 p-2 rounded max-h-32 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: results.cssRules }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">4. Override Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-xs font-mono bg-gray-50 p-2 rounded"
              dangerouslySetInnerHTML={{ __html: results.overrideResults }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">5. Dynamic Injection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button onClick={injectCyberpunkTheme} size="sm" className="w-full">
                Inject Cyberpunk
              </Button>
              <Button onClick={clearAllStyles} size="sm" variant="outline" className="w-full">
                Clear Overrides
              </Button>
              <div 
                className="text-xs font-mono bg-gray-50 p-2 rounded"
                dangerouslySetInnerHTML={{ __html: results.injectionResults }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Visual Tests */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">6. Visual Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded border"></div>
              <span className="text-xs">bg-primary</span>
            </div>
            <Button size="sm" className="w-full">
              Primary Button Test
            </Button>
            <div className="text-xs font-mono bg-gray-50 p-2 rounded">
              Expected: Pink/Red (~rgb(220, 38, 127))<br/>
              If purple: Still broken
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ThemeDebugger