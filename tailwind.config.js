// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"], // 🔥 Main font
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
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        carwow: {
          primary: "#1A1A1A",          // Black as primary
          "primary-content": "#FFFFFF", // White text on primary
          secondary: "#00AEEF",
          accent: "#FFD100",
          neutral: "#dedcd9",
          "base-100": "#FFFFFF", // White background
          "base-200": "#EDEDED",
          "base-300": "#E0E0E0",
          "base-content": "#1A1A1A", // Black text for carwow theme
          info: "#3ABFF8",
          success: "#36D399",
          warning: "#FBBD23",
          error: "#F87272",
        },
      },
      "dark", // Optional: keep dark mode support
      "synthwave", // Testing theme for validation
      "cyberpunk", // Testing theme for color issues
    ],
  },
}
