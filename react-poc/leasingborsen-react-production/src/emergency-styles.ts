export const injectEmergencyStyles = () => {
  const style = document.createElement('style');
  style.id = 'emergency-theme-styles';
  
  // Remove any existing emergency styles first
  const existing = document.getElementById('emergency-theme-styles');
  if (existing) {
    existing.remove();
  }

  style.textContent = `
    /* EMERGENCY CSS VARIABLES - INJECTED VIA JAVASCRIPT */
    /* This bypasses all build tools and forces variables directly into DOM */
    
    :root {
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

    /* Ensure Tailwind classes work with our variables */
    .bg-background { background-color: hsl(var(--background)) !important; }
    .bg-card { background-color: hsl(var(--card)) !important; }
    .bg-primary { background-color: hsl(var(--primary)) !important; }
    .bg-secondary { background-color: hsl(var(--secondary)) !important; }
    .bg-muted { background-color: hsl(var(--muted)) !important; }
    
    .text-foreground { color: hsl(var(--foreground)) !important; }
    .text-primary { color: hsl(var(--primary)) !important; }
    .text-secondary { color: hsl(var(--secondary)) !important; }
    .text-muted-foreground { color: hsl(var(--muted-foreground)) !important; }
    .text-card-foreground { color: hsl(var(--card-foreground)) !important; }
    .text-primary-foreground { color: hsl(var(--primary-foreground)) !important; }
    
    .border-border { border-color: hsl(var(--border)) !important; }
    .border-primary { border-color: hsl(var(--primary)) !important; }
    .border-input { border-color: hsl(var(--input)) !important; }
    
    /* Additional utility classes */
    .shadow-sm { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1) !important; }
    .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1) !important; }
    .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1) !important; }
  `;
  
  document.head.appendChild(style);
  
  // Force immediate re-render by toggling a class
  document.documentElement.classList.add('emergency-styles-loaded');
  
  console.log('🚨 EMERGENCY STYLES INJECTED - CSS Variables forced into DOM');
};

// Also export a function to apply theme
export const applyEmergencyTheme = (theme: string) => {
  document.documentElement.setAttribute('data-theme', theme);
  console.log(`🎨 Emergency theme applied: ${theme}`);
};