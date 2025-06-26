/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx", // Your main App component
    "./components/**/*.{js,ts,jsx,tsx}", // All components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
