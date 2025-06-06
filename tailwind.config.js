/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter", 
          "-apple-system", 
          "BlinkMacSystemFont", 
          "'Segoe UI'", 
          "Roboto", 
          "Oxygen", 
          "Ubuntu", 
          "Cantarell", 
          "'Fira Sans'", 
          "'Droid Sans'", 
          "'Helvetica Neue'", 
          "sans-serif"
        ],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        base: ['15px', '24px'],
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
} 