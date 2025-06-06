import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
        display: ["Poppins", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        base: ['16px', '24px'],
        lg: ['18px', '28px'],
        xl: ['20px', '30px'],
        '2xl': ['24px', '32px'],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        bold: '700',
      },
    },
  },
  plugins: [
    daisyui
  ],
  daisyui: {
    themes: [
      {
        carwow: {
          "primary": "#1A1A1A",          // Black as primary
          "primary-content": "#FFFFFF",  // White text on primary
          "secondary": "#00AEEF",        // Blue secondary
          "secondary-content": "#FFFFFF", // White text on secondary
          "accent": "#FFD100",           // Yellow accent
          "accent-content": "#1A1A1A",   // Black text on accent
          "neutral": "#F5F5F5",          // Very light gray neutral
          "neutral-content": "#1A1A1A",  // Black text on neutral
          "base-100": "#FFFFFF",         // White background
          "base-200": "#F8F8F8",         // Very light gray
          "base-300": "#E8E8E8",         // Light gray
          "base-content": "#1A1A1A",     // Black text
          "info": "#3ABFF8",
          "info-content": "#FFFFFF",
          "success": "#36D399",
          "success-content": "#FFFFFF",
          "warning": "#FBBD23",
          "warning-content": "#1A1A1A",
          "error": "#F87272",
          "error-content": "#FFFFFF",
        },
      },
      "light",     // Default light theme
      "dark",      // Dark theme
      "synthwave", // Testing theme for validation
      "cyberpunk", // Testing theme for color issues
    ],
  },
} 