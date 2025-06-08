export const injectEmergencyStyles = () => {
  // STEP 1: Force immediate HTML/body styling
  document.documentElement.style.cssText = `
    background-color: rgb(255, 255, 255) !important;
    color: rgb(14, 16, 22) !important;
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  `;
  
  document.body.style.cssText = `
    background-color: rgb(255, 255, 255) !important;
    color: rgb(14, 16, 22) !important;
    margin: 0 !important;
    padding: 0 !important;
    min-height: 100vh !important;
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  `;
  
  // STEP 2: Create emergency style tag
  const style = document.createElement('style');
  style.id = 'emergency-theme-styles';
  
  // Remove any existing emergency styles first
  const existing = document.getElementById('emergency-theme-styles');
  if (existing) {
    existing.remove();
  }

  style.textContent = `
    /* ULTRA-AGGRESSIVE EMERGENCY STYLING */
    /* FORCES STYLING ON EVERY ELEMENT */
    
    /* STEP 1: Force reset everything */
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
    
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: rgb(255, 255, 255) !important;
      color: rgb(14, 16, 22) !important;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      line-height: 1.6 !important;
      min-height: 100vh !important;
    }
    
    /* STEP 2: Force root and App container styling */
    #root, .App, [data-reactroot] {
      background-color: rgb(255, 255, 255) !important;
      color: rgb(14, 16, 22) !important;
      min-height: 100vh !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    /* STEP 3: CSS Variables with extreme specificity */
    :root, html, body, #root, .App {
      --background: 0 0% 100% !important;
      --foreground: 222.2 84% 4.9% !important;
      --card: 0 0% 100% !important;
      --card-foreground: 222.2 84% 4.9% !important;
      --primary: 262.1 83.3% 57.8% !important;
      --primary-foreground: 210 40% 98% !important;
      --secondary: 210 40% 96% !important;
      --secondary-foreground: 222.2 84% 4.9% !important;
      --muted: 210 40% 96% !important;
      --muted-foreground: 215.4 16.3% 46.9% !important;
      --accent: 210 40% 96% !important;
      --accent-foreground: 222.2 84% 4.9% !important;
      --destructive: 0 84.2% 60.2% !important;
      --destructive-foreground: 210 40% 98% !important;
      --border: 214.3 31.8% 91.4% !important;
      --input: 214.3 31.8% 91.4% !important;
      --ring: 262.1 83.3% 57.8% !important;
      --radius: 0.5rem !important;
    }

    /* Dark Theme */
    [data-theme="dark"] {
      --background: 222.2 84% 4.9% !important;
      --foreground: 210 40% 98% !important;
      --card: 222.2 84% 4.9% !important;
      --card-foreground: 210 40% 98% !important;
      --primary: 217.2 91.2% 59.8% !important;
      --primary-foreground: 222.2 84% 4.9% !important;
      --secondary: 217.2 32.6% 17.5% !important;
      --secondary-foreground: 210 40% 98% !important;
      --muted: 217.2 32.6% 17.5% !important;
      --muted-foreground: 215 20.2% 65.1% !important;
      --accent: 217.2 32.6% 17.5% !important;
      --accent-foreground: 210 40% 98% !important;
      --destructive: 0 62.8% 30.6% !important;
      --destructive-foreground: 210 40% 98% !important;
      --border: 217.2 32.6% 17.5% !important;
      --input: 217.2 32.6% 17.5% !important;
      --ring: 224.3 76.3% 94.0% !important;
    }

    /* Synthwave Theme */
    [data-theme="synthwave"] {
      --background: 345 100% 4% !important;
      --foreground: 317 100% 85% !important;
      --card: 345 100% 6% !important;
      --card-foreground: 317 100% 85% !important;
      --primary: 317 100% 54% !important;
      --primary-foreground: 345 100% 4% !important;
      --secondary: 292 84% 15% !important;
      --secondary-foreground: 317 100% 85% !important;
      --muted: 292 84% 15% !important;
      --muted-foreground: 317 30% 65% !important;
      --accent: 180 100% 50% !important;
      --accent-foreground: 345 100% 4% !important;
      --destructive: 0 100% 50% !important;
      --destructive-foreground: 317 100% 85% !important;
      --border: 292 84% 20% !important;
      --input: 292 84% 15% !important;
      --ring: 317 100% 54% !important;
    }

    /* Cyberpunk Theme */
    [data-theme="cyberpunk"] {
      --background: 280 100% 6% !important;
      --foreground: 60 100% 85% !important;
      --card: 280 100% 8% !important;
      --card-foreground: 60 100% 85% !important;
      --primary: 60 100% 50% !important;
      --primary-foreground: 280 100% 6% !important;
      --secondary: 300 100% 15% !important;
      --secondary-foreground: 60 100% 85% !important;
      --muted: 300 100% 15% !important;
      --muted-foreground: 60 30% 65% !important;
      --accent: 320 100% 50% !important;
      --accent-foreground: 280 100% 6% !important;
      --destructive: 0 100% 60% !important;
      --destructive-foreground: 60 100% 85% !important;
      --border: 300 100% 20% !important;
      --input: 300 100% 15% !important;
      --ring: 60 100% 50% !important;
    }

    /* Corporate Theme */
    [data-theme="corporate"] {
      --background: 0 0% 100% !important;
      --foreground: 210 11% 15% !important;
      --card: 0 0% 100% !important;
      --card-foreground: 210 11% 15% !important;
      --primary: 210 100% 56% !important;
      --primary-foreground: 0 0% 100% !important;
      --secondary: 210 11% 90% !important;
      --secondary-foreground: 210 11% 15% !important;
      --muted: 210 11% 90% !important;
      --muted-foreground: 210 11% 45% !important;
      --accent: 210 11% 85% !important;
      --accent-foreground: 210 11% 15% !important;
      --destructive: 0 100% 50% !important;
      --destructive-foreground: 0 0% 100% !important;
      --border: 214.3 31.8% 91.4% !important;
      --input: 214.3 31.8% 91.4% !important;
      --ring: 210 100% 56% !important;
    }

    /* Business Theme */
    [data-theme="business"] {
      --background: 210 6% 93% !important;
      --foreground: 210 6% 10% !important;
      --card: 210 6% 98% !important;
      --card-foreground: 210 6% 10% !important;
      --primary: 210 60% 45% !important;
      --primary-foreground: 210 6% 98% !important;
      --secondary: 210 6% 88% !important;
      --secondary-foreground: 210 6% 10% !important;
      --muted: 210 6% 88% !important;
      --muted-foreground: 210 6% 40% !important;
      --accent: 210 6% 82% !important;
      --accent-foreground: 210 6% 10% !important;
      --destructive: 0 70% 50% !important;
      --destructive-foreground: 210 6% 98% !important;
      --border: 210 6% 82% !important;
      --input: 210 6% 82% !important;
      --ring: 210 60% 45% !important;
    }

    /* Fantasy Theme */
    [data-theme="fantasy"] {
      --background: 290 30% 96% !important;
      --foreground: 290 30% 10% !important;
      --card: 290 30% 98% !important;
      --card-foreground: 290 30% 10% !important;
      --primary: 280 80% 55% !important;
      --primary-foreground: 290 30% 98% !important;
      --secondary: 290 30% 88% !important;
      --secondary-foreground: 290 30% 10% !important;
      --muted: 290 30% 88% !important;
      --muted-foreground: 290 30% 40% !important;
      --accent: 320 70% 65% !important;
      --accent-foreground: 290 30% 10% !important;
      --destructive: 0 80% 55% !important;
      --destructive-foreground: 290 30% 98% !important;
      --border: 290 30% 82% !important;
      --input: 290 30% 82% !important;
      --ring: 280 80% 55% !important;
    }

    /* Luxury Theme */
    [data-theme="luxury"] {
      --background: 40 15% 92% !important;
      --foreground: 40 15% 8% !important;
      --card: 40 15% 96% !important;
      --card-foreground: 40 15% 8% !important;
      --primary: 25 70% 40% !important;
      --primary-foreground: 40 15% 96% !important;
      --secondary: 40 15% 85% !important;
      --secondary-foreground: 40 15% 8% !important;
      --muted: 40 15% 85% !important;
      --muted-foreground: 40 15% 35% !important;
      --accent: 35 60% 55% !important;
      --accent-foreground: 40 15% 8% !important;
      --destructive: 0 70% 45% !important;
      --destructive-foreground: 40 15% 96% !important;
      --border: 40 15% 80% !important;
      --input: 40 15% 80% !important;
      --ring: 25 70% 40% !important;
    }

    /* FORCE APPLY BACKGROUND AND TEXT COLORS IMMEDIATELY */
    html, body, #root, .App {
      background-color: hsl(var(--background)) !important;
      color: hsl(var(--foreground)) !important;
      transition: all 0.3s ease !important;
    }

    /* STEP 4: FORCE EVERY TAILWIND CLASS WITH AGGRESSIVE SPECIFICITY */
    
    /* Background classes */
    .bg-background, [class*="bg-background"] { background-color: rgb(255, 255, 255) !important; }
    .bg-card, [class*="bg-card"] { background-color: rgb(255, 255, 255) !important; }
    .bg-primary, [class*="bg-primary"] { background-color: rgb(139, 92, 246) !important; }
    .bg-secondary, [class*="bg-secondary"] { background-color: rgb(241, 245, 249) !important; }
    .bg-muted, [class*="bg-muted"] { background-color: rgb(241, 245, 249) !important; }
    
    /* Text classes */
    .text-foreground, [class*="text-foreground"] { color: rgb(14, 16, 22) !important; }
    .text-primary, [class*="text-primary"] { color: rgb(139, 92, 246) !important; }
    .text-secondary, [class*="text-secondary"] { color: rgb(100, 116, 139) !important; }
    .text-muted-foreground, [class*="text-muted-foreground"] { color: rgb(100, 116, 139) !important; }
    .text-card-foreground, [class*="text-card-foreground"] { color: rgb(14, 16, 22) !important; }
    .text-primary-foreground, [class*="text-primary-foreground"] { color: rgb(248, 250, 252) !important; }
    .text-white, [class*="text-white"] { color: rgb(255, 255, 255) !important; }
    
    /* Border classes */
    .border, [class*="border"]:not([class*="border-0"]) { border: 1px solid rgb(226, 232, 240) !important; }
    .border-border, [class*="border-border"] { border-color: rgb(226, 232, 240) !important; }
    .border-primary, [class*="border-primary"] { border-color: rgb(139, 92, 246) !important; }
    .border-input, [class*="border-input"] { border-color: rgb(226, 232, 240) !important; }
    
    /* Shadow classes */
    .shadow-sm, [class*="shadow-sm"] { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1) !important; }
    .shadow-md, [class*="shadow-md"] { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1) !important; }
    .shadow-lg, [class*="shadow-lg"] { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1) !important; }
    .shadow-xl, [class*="shadow-xl"] { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important; }
    
    /* STEP 5: FORCE COMMON COMPONENT STYLES */
    
    /* Header styling */
    header, [role="banner"], nav {
      background-color: rgb(255, 255, 255) !important;
      border-bottom: 1px solid rgb(226, 232, 240) !important;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
    }
    
    /* Card styling */
    .card, [data-slot="card"], .grid > div, .flex.flex-col.space-y-4 > div {
      background-color: rgb(255, 255, 255) !important;
      border: 1px solid rgb(226, 232, 240) !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
      padding: 24px !important;
    }
    
    /* Button styling */
    button, .btn, [role="button"], input[type="submit"] {
      background-color: rgb(139, 92, 246) !important;
      color: rgb(255, 255, 255) !important;
      border: none !important;
      border-radius: 6px !important;
      padding: 8px 16px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
    }
    
    button:hover, .btn:hover, [role="button"]:hover {
      background-color: rgb(124, 58, 237) !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
    }
    
    /* Input styling */
    input, select, textarea {
      background-color: rgb(255, 255, 255) !important;
      border: 1px solid rgb(226, 232, 240) !important;
      border-radius: 6px !important;
      padding: 8px 12px !important;
      color: rgb(14, 16, 22) !important;
      font-size: 14px !important;
    }
    
    input:focus, select:focus, textarea:focus {
      outline: none !important;
      border-color: rgb(139, 92, 246) !important;
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1) !important;
    }
    
    /* Typography */
    h1, h2, h3, h4, h5, h6 {
      color: rgb(14, 16, 22) !important;
      font-weight: 600 !important;
      margin-bottom: 16px !important;
    }
    
    h1 { font-size: 36px !important; font-weight: 800 !important; }
    h2 { font-size: 30px !important; font-weight: 700 !important; }
    h3 { font-size: 24px !important; font-weight: 600 !important; }
    
    p, span, div {
      color: rgb(14, 16, 22) !important;
    }
    
    a {
      color: rgb(139, 92, 246) !important;
      text-decoration: none !important;
    }
    
    a:hover {
      color: rgb(124, 58, 237) !important;
      text-decoration: underline !important;
    }
    
    /* Layout utilities */
    .container, .max-w-7xl, .max-w-4xl, .max-w-2xl {
      margin: 0 auto !important;
      padding-left: 24px !important;
      padding-right: 24px !important;
    }
    
    .space-y-4 > * + * { margin-top: 16px !important; }
    .space-y-6 > * + * { margin-top: 24px !important; }
    .space-y-8 > * + * { margin-top: 32px !important; }
    
    .gap-4 { gap: 16px !important; }
    .gap-6 { gap: 24px !important; }
    .gap-8 { gap: 32px !important; }
  `;
  
  document.head.appendChild(style);
  
  // STEP 3: Force immediate element manipulation
  const forceElementStyling = () => {
    // Force root elements
    const root = document.getElementById('root');
    if (root) {
      root.style.cssText = `
        background-color: rgb(255, 255, 255) !important;
        color: rgb(14, 16, 22) !important;
        min-height: 100vh !important;
        font-family: Inter, system-ui, sans-serif !important;
      `;
    }
    
    // Force all elements with common classes
    document.querySelectorAll('.bg-background, .bg-card').forEach(el => {
      (el as HTMLElement).style.backgroundColor = 'rgb(255, 255, 255)';
    });
    
    document.querySelectorAll('.text-foreground, .text-card-foreground').forEach(el => {
      (el as HTMLElement).style.color = 'rgb(14, 16, 22)';
    });
    
    document.querySelectorAll('.bg-primary').forEach(el => {
      (el as HTMLElement).style.backgroundColor = 'rgb(139, 92, 246)';
    });
    
    document.querySelectorAll('.text-primary').forEach(el => {
      (el as HTMLElement).style.color = 'rgb(139, 92, 246)';
    });
    
    // Force all cards to have proper styling
    document.querySelectorAll('.grid > div, .space-y-4 > div, .space-y-6 > div').forEach(el => {
      const element = el as HTMLElement;
      element.style.cssText += `
        background-color: rgb(255, 255, 255) !important;
        border: 1px solid rgb(226, 232, 240) !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        padding: 24px !important;
      `;
    });
    
    // Force all buttons
    document.querySelectorAll('button, .btn, [role="button"]').forEach(el => {
      const element = el as HTMLElement;
      if (!element.style.backgroundColor || element.style.backgroundColor === 'transparent') {
        element.style.cssText += `
          background-color: rgb(139, 92, 246) !important;
          color: rgb(255, 255, 255) !important;
          border: none !important;
          border-radius: 6px !important;
          padding: 8px 16px !important;
        `;
      }
    });
  };
  
  // Apply immediately
  forceElementStyling();
  
  // Apply again after a short delay to catch dynamically rendered elements
  setTimeout(forceElementStyling, 100);
  setTimeout(forceElementStyling, 500);
  setTimeout(forceElementStyling, 1000);
  
  // Force immediate re-render by toggling a class
  document.documentElement.classList.add('emergency-styles-loaded');
  
  console.log('🚨 ULTRA-AGGRESSIVE EMERGENCY STYLES APPLIED - Multiple failsafes engaged');
  
  // STEP 4: Set up MutationObserver to catch any new elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          
          // Apply styling to new elements immediately
          if (element.classList.contains('bg-background') || element.classList.contains('bg-card')) {
            element.style.backgroundColor = 'rgb(255, 255, 255)';
          }
          if (element.classList.contains('text-foreground')) {
            element.style.color = 'rgb(14, 16, 22)';
          }
          if (element.classList.contains('bg-primary')) {
            element.style.backgroundColor = 'rgb(139, 92, 246)';
          }
          if (element.tagName === 'BUTTON') {
            element.style.cssText += `
              background-color: rgb(139, 92, 246) !important;
              color: rgb(255, 255, 255) !important;
              border: none !important;
              border-radius: 6px !important;
              padding: 8px 16px !important;
            `;
          }
          
          // Force styling on all child elements too
          element.querySelectorAll('.bg-background, .bg-card').forEach(el => {
            (el as HTMLElement).style.backgroundColor = 'rgb(255, 255, 255)';
          });
          element.querySelectorAll('.text-foreground').forEach(el => {
            (el as HTMLElement).style.color = 'rgb(14, 16, 22)';
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};

// Also export a function to apply theme
export const applyEmergencyTheme = (theme: string) => {
  document.documentElement.setAttribute('data-theme', theme);
  console.log(`🎨 Emergency theme applied: ${theme}`);
};