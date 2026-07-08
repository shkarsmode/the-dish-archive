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

    private themeAnimTimer: ReturnType<typeof setTimeout> | null = null;

    toggle(_event?: MouseEvent): void {
        // Quick, native-feeling color crossfade (no View Transition). A short-lived
        // class enables color transitions on surfaces just for the switch.
        const root = document.documentElement;
        root.classList.add('theme-anim');
        this.applyToggle();
        if (this.themeAnimTimer) clearTimeout(this.themeAnimTimer);
        this.themeAnimTimer = setTimeout(() => root.classList.remove('theme-anim'), 320);
    }

    private applyToggle(): void {
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
