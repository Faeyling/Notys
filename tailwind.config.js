/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cherry: ['"Cherry Bomb One"', 'cursive'],
        quicksand: ['Quicksand', 'sans-serif'],
      },
      colors: {
        noty: {
          red:    '#ffadad',
          peach:  '#ffbda6',
          orange: '#ffcc9e',
          yellow: '#ffe0a0',
          lemon:  '#fff3a2',
          lime:   '#e6edb3',
          green:  '#c9e7c3',
          teal:   '#c8e7e1',
          blue:   '#b4daf3',
          lavender:'#dcc6f1',
          pink:   '#ffc7ee',
          sand:   '#e1c6b0',
          salmon: '#f0baaf',
        },
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'wave-wiggle': 'wave-wiggle 0.4s ease-in-out',
        'confetti-fall': 'confetti-fall 1s ease-in forwards',
        'bounce-in': 'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        'fade-up': 'fade-up 0.35s ease-out',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'wave-wiggle': {
          '0%,100%': { transform: 'scaleY(1)' },
          '25%': { transform: 'scaleY(1.08)' },
          '75%': { transform: 'scaleY(0.94)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
