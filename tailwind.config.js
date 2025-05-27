// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      fontSize: {
        // Adding a consistent size resembling 18px
        'form-lg': ['1.125rem', '1.75rem'], // 18px, line-height: ~28px
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        compadre: {
          primary: "#ff3355",
          secondary: "#f9c842",
          accent: "#38bdf8",
          neutral: "#1e1e2f",
          "base-100": "#ffffff",
          "base-200": "#f2f2f7",
          "base-300": "#ececec",
          info: "#3ABFF8",
          success: "#36D399",
          warning: "#FBBD23",
          error: "#F87272",
          "--rounded-box": "1rem",
          "--rounded-btn": "1.25rem",
          "--rounded-badge": "1.25rem",
          // Optional: DaisyUI-specific text sizes if supported
          '--btn-text-size': '1.125rem',    // Button text
          '--input-text-size': '1.125rem',  // Input fields
          '--select-text-size': '1.125rem', // Select fields
        },
      },
    ],
  },
}
