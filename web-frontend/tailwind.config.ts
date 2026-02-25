import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: ['class'],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            fontSize: {
                'xs': ['0.75rem', { lineHeight: '1rem' }],
                'sm': ['0.875rem', { lineHeight: '1.25rem' }],
                'base': ['1.125rem', { lineHeight: '1.75rem' }], // Augmenté de 1rem à 1.125rem
                'lg': ['1.25rem', { lineHeight: '1.75rem' }], // Augmenté de 1.125rem à 1.25rem
                'xl': ['1.5rem', { lineHeight: '2rem' }], // Augmenté de 1.25rem à 1.5rem
                '2xl': ['2rem', { lineHeight: '2.5rem' }], // Augmenté de 1.5rem à 2rem
                '3xl': ['2.5rem', { lineHeight: '3rem' }], // Augmenté de 1.875rem à 2.5rem
                '4xl': ['3rem', { lineHeight: '3.5rem' }], // Augmenté de 2.25rem à 3rem
                '5xl': ['3.5rem', { lineHeight: '4rem' }], // Augmenté de 3rem à 3.5rem
                '6xl': ['4rem', { lineHeight: '4.5rem' }], // Augmenté de 3.75rem à 4rem
            },
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
};

export default config;
