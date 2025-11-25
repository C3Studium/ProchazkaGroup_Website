/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/modules/resend/emails/**/*.{js,jsx,tsx}"
  ],
  theme: {
    screens: {
      // Custom breakpoints optimized for email templates
      'mobile': '320px',
      // Breakpoint at 600px for mobile to desktop transition
      'tablet': '600px',
    },
    extend: {
      colors: {
        customGray: '#5E758D',
        customPurple: '#9151e0',
        neonCyan: '#4bdadc',
        neonPurple: '#9151e0',
        red: '#ff4d4d',
      },
      fontFamily: {
        'satoshi': ['Satoshi', 'sans-serif'],
        'switzer': ['Switzer', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
