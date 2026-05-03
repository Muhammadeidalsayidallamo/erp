/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: '#e8a020', light: '#f5c842', dark: '#c07818' },
        navy: { DEFAULT: '#0f3460', light: '#1a4a7e', dark: '#081c38' },
        success: '#00d68f',
        danger: '#ff4757',
        bg: {
          base: '#060b18',
          surface: '#0d1629',
          card: '#111827',
          elevated: '#1a2540',
        },
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'count-up': 'countUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideInRight: { from: { transform: 'translateX(16px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        scaleIn: { from: { transform: 'scale(0.95)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      boxShadow: {
        'glow-gold': '0 0 30px rgba(232,160,32,0.2)',
        'glow-navy': '0 0 30px rgba(15,52,96,0.3)',
        'glow-success': '0 0 30px rgba(0,214,143,0.15)',
        'card': '0 8px 40px rgba(0,0,0,0.35)',
        'elevated': '0 20px 60px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}
