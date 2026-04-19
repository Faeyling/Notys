/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        noty: {
          red:     '#ffadad',
          peach:   '#ffbda6',
          orange:  '#ffcc9e',
          yellow:  '#ffe0a0',
          lemon:   '#fff3a2',
          lime:    '#e6edb3',
          green:   '#c9e7c3',
          teal:    '#c8e7e1',
          blue:    '#b4daf3',
          lavender:'#dcc6f1',
          pink:    '#ffc7ee',
          sand:    '#e1c6b0',
          salmon:  '#f0baaf',
        },
      },
    },
  },
  plugins: [],
};
