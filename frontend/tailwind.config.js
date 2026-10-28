/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: { glassbox: { bg: '#CEE4E5', surface: '#FFFFFF', teal: '#A7D5D7', yellow: '#FFEA79', green: '#C1FF83', blue: '#90BDFF', pink: '#FF9A9A', ink: '#000000' } }, borderRadius: { panel: '24px' } } },
  plugins: []
};
