import { Component, HostListener, input, signal } from '@angular/core';

/**
 * Reusable contextual hint. On pointer devices it behaves like a hover tooltip;
 * on touch/mobile a tap opens a bottom sheet with a dimmed backdrop.
 */
@Component({
    selector: 'app-hint',
    template: `
        <button
            type="button"
            class="hint-trigger"
            [class.open]="open()"
            (click)="toggle($event)"
            (mouseenter)="onEnter()"
            (mouseleave)="onLeave()"
            (focus)="onEnter()"
            (blur)="onLeave()"
            [attr.aria-expanded]="open()"
            [attr.aria-label]="label() || 'Підказка'">
            <span class="material-symbols-outlined">{{ icon() }}</span>
        </button>

        @if (open()) {
            <div class="hint-backdrop" (click)="close($event)"></div>
            <div class="hint-bubble" role="tooltip" (click)="$event.stopPropagation()">
                <span class="hint-grip" aria-hidden="true"></span>
                @if (title()) { <span class="hint-title">{{ title() }}</span> }
                <span class="hint-text">{{ text() }}</span>
            </div>
        }
    `,
    styles: [`
        :host { position: relative; display: inline-flex; vertical-align: middle; }
        .hint-trigger {
            display: inline-grid; place-items: center; width: 22px; height: 22px;
            border: none; padding: 0; border-radius: var(--radius-full); cursor: pointer;
            background: var(--color-surface-hover); color: var(--color-text-tertiary);
            transition: background var(--transition-base), color var(--transition-base);
        }
        .hint-trigger:hover, .hint-trigger.open { background: var(--color-accent-light); color: var(--color-accent-dark); }
        .hint-trigger .material-symbols-outlined { font-size: 16px; }

        .hint-backdrop { position: fixed; inset: 0; z-index: var(--z-modal, 1000); background: transparent; }

        .hint-bubble {
            position: absolute; z-index: calc(var(--z-modal, 1000) + 1);
            bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
            width: max-content; max-width: 260px;
            display: flex; flex-direction: column; gap: 3px;
            padding: 10px 13px; border-radius: var(--radius-md);
            background: var(--color-text-primary); color: var(--color-bg);
            box-shadow: var(--shadow-lg); text-align: left;
            animation: hintIn 0.16s var(--ease-out, ease);
        }
        .hint-bubble::after {
            content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
            border: 6px solid transparent; border-top-color: var(--color-text-primary);
        }
        .hint-grip { display: none; }
        .hint-title { font-size: var(--text-xs); font-weight: var(--weight-bold); letter-spacing: 0.01em; }
        .hint-text { font-size: var(--text-xs); line-height: var(--leading-relaxed); opacity: 0.92; }

        @keyframes hintIn { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

        /* Mobile: dimmed backdrop + bottom sheet */
        @media (max-width: 640px) {
            .hint-backdrop { background: color-mix(in srgb, #000 42%, transparent); backdrop-filter: blur(1px); }
            .hint-bubble {
                position: fixed; inset: auto 0 0 0; left: 0; right: 0; bottom: 0; top: auto;
                transform: none; width: auto; max-width: none;
                padding: var(--space-4) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom));
                border-radius: var(--radius-lg) var(--radius-lg) 0 0;
                gap: var(--space-1); align-items: flex-start;
                animation: sheetIn 0.22s var(--ease-out, ease);
            }
            .hint-bubble::after { display: none; }
            .hint-grip {
                display: block; align-self: center; width: 38px; height: 4px; margin-bottom: var(--space-2);
                border-radius: var(--radius-full); background: color-mix(in srgb, var(--color-bg) 40%, transparent);
            }
            .hint-title { font-size: var(--text-sm); }
            .hint-text { font-size: var(--text-sm); }
        }
        @keyframes sheetIn { from { transform: translateY(100%); } to { transform: translateY(0); } }
    `],
})
export class HintComponent {
    readonly text = input.required<string>();
    readonly title = input<string>('');
    readonly icon = input<string>('help');
    readonly label = input<string>('');

    protected readonly open = signal(false);

    private get hoverCapable(): boolean {
        return typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;
    }

    protected onEnter(): void {
        if (this.hoverCapable) this.open.set(true);
    }

    protected onLeave(): void {
        if (this.hoverCapable) this.open.set(false);
    }

    protected toggle(event: Event): void {
        event.stopPropagation();
        this.open.update(v => !v);
    }

    protected close(event?: Event): void {
        event?.stopPropagation();
        this.open.set(false);
    }

    @HostListener('document:keydown.escape')
    protected onEscape(): void {
        this.open.set(false);
    }
}
