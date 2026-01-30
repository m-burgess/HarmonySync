/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "../packages/ui/public/index.html",
    "./src/**/*.{js,jsx,ts,tsx,html}"
  ],
  theme: {
    extend: {
      colors: {
        stage: '#0f1724',
        surface: '#111827',
        card: '#151a23',
        accent: '#ff8a00',
        accent2: '#06b6d4',
        muted: '#9ca3af',
        text: '#e6eef6',
      },
      borderRadius: {
        xl: '12px',
      },
      boxShadow: {
        subtle: '0 6px 18px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
