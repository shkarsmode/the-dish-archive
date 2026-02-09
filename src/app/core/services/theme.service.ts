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

    toggle(event?: MouseEvent): void {
        // Fallback — no View Transition API
        if (typeof document.startViewTransition !== 'function') {
            this.applyToggle();
            return;
        }

        const goingDark = this.theme() === 'light';

        // Click origin (or screen center)
        const x = event?.clientX ?? innerWidth / 2;
        const y = event?.clientY ?? innerHeight / 2;

        // Radius to the farthest corner
        const endRadius = Math.hypot(
            Math.max(x, innerWidth - x),
            Math.max(y, innerHeight - y),
        );

        // 1) Kill individual view-transition-names so only root is captured
        const suppress = document.createElement('style');
        suppress.textContent = '*, *::before, *::after { view-transition-name: none !important; }';
        document.head.appendChild(suppress);

        // 2) Start the transition — update DOM *synchronously* inside the callback
        //    so the new snapshot correctly reflects the toggled theme.
        const transition = document.startViewTransition(() => {
            const next: Theme = goingDark ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem(STORAGE_KEY, next);
            this.theme.set(next);
            // Return a resolved promise so the transition captures this frame
            return Promise.resolve();
        });

        // 3) Once both snapshots are captured, run the clip-path animation
        transition.ready.then(() => {
            suppress.remove();

            // z-index: the layer we clip must be on top
            const zStyle = document.createElement('style');
            zStyle.textContent = goingDark
                ? '::view-transition-new(root){z-index:1}::view-transition-old(root){z-index:-1}'
                : '::view-transition-old(root){z-index:1}::view-transition-new(root){z-index:-1}';
            document.head.appendChild(zStyle);

            const duration = 800;

            document.documentElement.animate(
                goingDark
                    ? { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] }
                    : { clipPath: [`circle(${endRadius}px at ${x}px ${y}px)`, `circle(0px at ${x}px ${y}px)`] },
                {
                    duration,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    pseudoElement: goingDark ? '::view-transition-new(root)' : '::view-transition-old(root)',
                },
            );

            setTimeout(() => zStyle.remove(), duration + 100);
        });
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
