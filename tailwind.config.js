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
            "base-100": "#ffffff",   // main surface (e.g., cards)
            "base-200": "#f2f2f7",   // page background ✅
            "base-300": "#ececec",   // secondary surface
            info: "#3ABFF8",
            success: "#36D399",
            warning: "#FBBD23",
            error: "#F87272",
            "--rounded-box": "1rem",
            "--rounded-btn": "1.25rem",
            "--rounded-badge": "1.25rem"
        },
      },
    ],
  },
}
