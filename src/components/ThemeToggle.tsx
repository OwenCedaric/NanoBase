import React, { useEffect, useState } from 'react';
import { RiSunLine, RiMoonLine } from '@remixicon/react';

const ThemeToggle: React.FC = () => {
    const [isDark, setIsDark] = useState(() => {
        // Initial state determination if possible synchronously
        if (typeof window !== 'undefined') {
            return localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    useEffect(() => {
        const root = document.documentElement;
        
        const applyTheme = (dark: boolean) => {
            if (dark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        // Init based on latest state
        applyTheme(isDark);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem('theme')) {
                setIsDark(e.matches);
                applyTheme(e.matches);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [isDark]);

    const toggleTheme = () => {
        setIsDark(prevDark => {
            const nextDark = !prevDark;
            localStorage.setItem('theme', nextDark ? 'dark' : 'light');
            return nextDark;
        });
    };

    return (
        <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 border border-transparent hover:border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:hover:border-zinc-800 dark:hover:text-white transition-all active:scale-95"
            aria-label="Toggle Dark Mode"
            title="Toggle Dark Mode"
        >
            {isDark ? (
                <RiSunLine className="w-4 h-4" />
            ) : (
                <RiMoonLine className="w-4 h-4" />
            )}
        </button>
    );
};

export default ThemeToggle;
