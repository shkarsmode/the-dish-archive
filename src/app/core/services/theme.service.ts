import { effect, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'dish-archive-theme';
export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    readonly theme = signal<Theme>(this.loadTheme());

    constructor() {
        effect(() => {
            const t = this.theme();
            document.documentElement.setAttribute('data-theme', t);
            localStorage.setItem(STORAGE_KEY, t);
        });
    }

    toggle(): void {
        this.theme.update(t => (t === 'light' ? 'dark' : 'light'));
    }

    private loadTheme(): Theme {
        try {
            const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
            if (stored === 'light' || stored === 'dark') return stored;
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        } catch {
            /* noop */
        }
        return 'light';
    }
}
