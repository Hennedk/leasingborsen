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
      borderRadius: {
        DEFAULT: '10px',
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        bold: '700',
      },
      colors: {
        primary: "#1A1A1A", // Updated global primary (black)
        "primary-content": "#FFFFFF", // White text on primary
         "card-bg": "#fbfafc",  // 🎨 Background for cards
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
          info: "#3ABFF8",
          success: "#36D399",
          warning: "#FBBD23",
          error: "#F87272",
          "--rounded-box": "10px",
          "--rounded-btn": "10px",
          "--rounded-badge": "10px",
          "--btn-text-case": "none",
          "--btn-text-size": "1rem",
          "--btn-font-weight": "500",
          "--input-text-size": "1rem",
          "--select-text-size": "1rem",
          "--navbar-padding": "1rem",
        },
      },
      "dark", // Optional: keep dark mode support
    ],
  },
}
