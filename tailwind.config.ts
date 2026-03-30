import type { Config } from 'tailwindcss';

export default {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	prefix: '',
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				background: '#F8F6F2', // Off-white / ivory
				surface: '#FFFFFF', // Clean white for cards
				secondary: {
					DEFAULT: '#E8E1D9', // Warm beige
					foreground: '#737373',
				},
				accent: {
					DEFAULT: '#C6A77D', // Soft gold
					foreground: '#FFFFFF',
				},
				text: {
					primary: '#2B2B2B', // Dark charcoal
					muted: '#737373', // Muted text
				},
				border: '#E8E1D9',
				input: '#E8E1D9',
				ring: '#C6A77D',
				foreground: '#2B2B2B',
				primary: {
					DEFAULT: '#C6A77D',
					foreground: '#FFFFFF',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: '#E8E1D9',
					foreground: '#737373',
				},
				popover: {
					DEFAULT: '#FFFFFF',
					foreground: '#2B2B2B',
				},
				card: {
					DEFAULT: '#FFFFFF',
					foreground: '#2B2B2B',
				},
			},
			fontFamily: {
				serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
				sans: ['"Outfit"', 'system-ui', 'sans-serif'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'2xl': '1.25rem', // Soft rounded cards
				'3xl': '1.75rem', // Hero sections
			},
			boxShadow: {
				soft: '0 8px 30px rgba(43, 43, 43, 0.04)',
				card: '0 8px 30px -8px rgba(43, 43, 43, 0.1)',
				elevated: '0 20px 50px -12px rgba(43, 43, 43, 0.15)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' },
				},
				'fade-up': {
					from: { opacity: '0', transform: 'translateY(20px)' },
					to: { opacity: '1', transform: 'translateY(0)' },
				},
				'fade-in': {
					from: { opacity: '0' },
					to: { opacity: '1' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-up': 'fade-up 0.6s ease-out forwards',
				'fade-in': 'fade-in 0.8s ease-out forwards',
				'fade-in-fast': 'fade-in 0.2s ease-out forwards',
			},
		},
	},
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	plugins: [require('tailwindcss-animate')],
} satisfies Config;
