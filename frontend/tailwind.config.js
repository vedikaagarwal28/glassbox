/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: { glassbox: { bg: '#0b0d14', surface: '#10131d', accent: '#8b9cff', line: '#252c40' } }, borderRadius: { panel: '10px' } } },
  plugins: []
};
