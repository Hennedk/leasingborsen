import React, { useEffect, useState } from 'react';

const ReactThemeDebugger = () => {
  const [debugInfo, setDebugInfo] = useState({
    cssVars: {},
    computedStyles: {},
    overrideTest: false,
    injectionActive: false
  });

  const checkCSSVariables = () => {
    const root = document.documentElement;
    const primary = getComputedStyle(root).getPropertyValue('--primary').trim();
    const primaryForeground = getComputedStyle(root).getPropertyValue('--primary-foreground').trim();
    
    return {
      primary,
      primaryForeground,
      primaryExists: !!primary,
      isCorrectValue: primary === '346 77% 49.8%'
    };
  };

  const analyzeComputedStyles = () => {
    // Create a test element
    const testDiv = document.createElement('div');
    testDiv.className = 'bg-primary text-primary-foreground';
    testDiv.style.cssText = 'background-color: hsl(var(--primary)); color: hsl(var(--primary-foreground));';
    document.body.appendChild(testDiv);
    
    const computed = getComputedStyle(testDiv);
    const result = {
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      isPurple: computed.backgroundColor.includes('139') || computed.backgroundColor.includes('92') || computed.backgroundColor.includes('246'),
      isPink: computed.backgroundColor.includes('220') || computed.backgroundColor.includes('38') || computed.backgroundColor.includes('127')
    };
    
    document.body.removeChild(testDiv);
    return result;
  };

  const findConflictingRules = () => {
    const conflicts = [];
    try {
      Array.from(document.styleSheets).forEach((sheet, index) => {
        try {
          Array.from(sheet.cssRules || []).forEach(rule => {
            if (rule.cssText && (
              rule.cssText.includes('--primary') || 
              rule.cssText.includes('139, 92, 246') ||
              rule.cssText.includes('rgb(139, 92, 246)') ||
              rule.cssText.includes('violet-500') ||
              rule.cssText.includes('purple-500')
            )) {
              conflicts.push({
                sheet: index,
                rule: rule.cssText.substring(0, 200)
              });
            }
          });
        } catch (e) {
          conflicts.push({
            sheet: index,
            rule: `Cross-origin stylesheet: ${sheet.href || 'inline'}`
          });
        }
      });
    } catch (e) {
      conflicts.push({ error: e.message });
    }
    return conflicts;
  };

  const runDiagnostics = () => {
    const cssVars = checkCSSVariables();
    const computedStyles = analyzeComputedStyles();
    const conflicts = findConflictingRules();
    
    setDebugInfo({
      ...debugInfo,
      cssVars,
      computedStyles,
      conflicts
    });
  };

  const injectEmergencyFix = () => {
    const existingStyle = document.getElementById('react-emergency-theme');
    if (existingStyle) existingStyle.remove();
    
    const style = document.createElement('style');
    style.id = 'react-emergency-theme';
    style.innerHTML = `
      :root {
        --primary: 346 77% 49.8% !important;
        --primary-foreground: 355 7% 97% !important;
      }
      
      /* Target React component classes */
      [class*="bg-primary"],
      [class*="text-primary"],
      [data-theme] [class*="primary"],
      .bg-primary,
      .text-primary,
      .border-primary {
        background-color: hsl(346 77% 49.8%) !important;
        color: hsl(355 7% 97%) !important;
      }
      
      /* Target shadcn button variants */
      button[class*="primary"],
      [class*="Button"][class*="primary"],
      [data-testid*="button"][class*="primary"] {
        background-color: hsl(346 77% 49.8%) !important;
        color: hsl(355 7% 97%) !important;
      }
    `;
    document.head.appendChild(style);
    
    setDebugInfo({ ...debugInfo, injectionActive: true });
    setTimeout(runDiagnostics, 100);
  };

  const clearEmergencyFix = () => {
    const existingStyle = document.getElementById('react-emergency-theme');
    if (existingStyle) existingStyle.remove();
    
    setDebugInfo({ ...debugInfo, injectionActive: false });
    setTimeout(runDiagnostics, 100);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 bg-background text-foreground">
      <h1 className="text-3xl font-bold">🔍 React Theme Debugger</h1>
      
      {/* CSS Variables Check */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-xl font-semibold mb-3">1. CSS Variables Status</h2>
        <div className="space-y-2 font-mono text-sm">
          <div>--primary: "{debugInfo.cssVars.primary}" {debugInfo.cssVars.primaryExists ? '✅' : '❌'}</div>
          <div>--primary-foreground: "{debugInfo.cssVars.primaryForeground}" {debugInfo.cssVars.primaryForeground ? '✅' : '❌'}</div>
          <div>Correct value: {debugInfo.cssVars.isCorrectValue ? '✅' : '❌'} (Expected: "346 77% 49.8%")</div>
        </div>
      </div>

      {/* Computed Styles */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-xl font-semibold mb-3">2. Computed Style Analysis</h2>
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-12 h-12 border-2 rounded"
            style={{ backgroundColor: 'hsl(var(--primary))' }}
          ></div>
          <div className="space-y-1 font-mono text-sm">
            <div>Background: {debugInfo.computedStyles.backgroundColor}</div>
            <div>Is Purple: {debugInfo.computedStyles.isPurple ? '❌ YES' : '✅ NO'}</div>
            <div>Is Pink: {debugInfo.computedStyles.isPink ? '✅ YES' : '❌ NO'}</div>
          </div>
        </div>
      </div>

      {/* Conflicting Rules */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-xl font-semibold mb-3">3. Conflicting CSS Rules</h2>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {debugInfo.conflicts?.length > 0 ? (
            debugInfo.conflicts.map((conflict, index) => (
              <div key={index} className="text-xs font-mono bg-muted p-2 rounded">
                {conflict.error ? `Error: ${conflict.error}` : 
                 `Sheet ${conflict.sheet}: ${conflict.rule}`}
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">No conflicts detected</div>
          )}
        </div>
      </div>

      {/* React Component Tests */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-xl font-semibold mb-3">4. React Component Tests</h2>
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded">
              Primary Button
            </button>
            <button 
              className="px-4 py-2 rounded text-white"
              style={{ backgroundColor: 'hsl(346 77% 49.8%)' }}
            >
              Inline Style Button
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Actions */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-xl font-semibold mb-3">5. Emergency Fixes</h2>
        <div className="flex gap-3">
          <button 
            onClick={injectEmergencyFix}
            className="bg-destructive text-destructive-foreground px-4 py-2 rounded hover:bg-destructive/90"
          >
            🚨 Inject Emergency Fix
          </button>
          <button 
            onClick={clearEmergencyFix}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/80"
          >
            🧹 Clear Fix
          </button>
          <button 
            onClick={runDiagnostics}
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
          >
            🔄 Re-run Tests
          </button>
        </div>
        {debugInfo.injectionActive && (
          <div className="mt-2 text-sm text-amber-600">
            ⚠️ Emergency fix is active - this will override all theme styles
          </div>
        )}
      </div>

      {/* React-Specific Diagnostic Code */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-xl font-semibold mb-3">6. React Implementation Fixes</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold">A. Check your main.tsx/index.tsx:</h3>
            <pre className="bg-muted p-3 rounded mt-1 overflow-x-auto">
{`import './index.css'  // Make sure this comes FIRST
import './globals.css' // Before any component imports

// Wrong order - components first
import { Button } from './components/ui/button'
import './globals.css'  // Too late!`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold">B. Theme Provider Setup:</h3>
            <pre className="bg-muted p-3 rounded mt-1 overflow-x-auto">
{`// In your App.tsx or main component
<ThemeProvider defaultTheme="cyberpunk" storageKey="ui-theme">
  <div className="min-h-screen bg-background text-foreground">
    {/* Your app content */}
  </div>
</ThemeProvider>`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold">C. CSS Variable Definition (globals.css):</h3>
            <pre className="bg-muted p-3 rounded mt-1 overflow-x-auto">
{`@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --primary: 346 77% 49.8%;
    --primary-foreground: 355 7% 97%;
  }
  
  .cyberpunk {
    --primary: 346 77% 49.8%;
    --primary-foreground: 355 7% 97%;
  }
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReactThemeDebugger;