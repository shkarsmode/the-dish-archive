import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChangeType, WhatsNewService } from '../../core/services/whats-new.service';

const TYPE_META: Record<ChangeType, { label: string; icon: string; cls: string }> = {
    feature: { label: 'Нове', icon: 'auto_awesome', cls: 't-feature' },
    improvement: { label: 'Покращення', icon: 'bolt', cls: 't-improvement' },
    fix: { label: 'Виправлення', icon: 'build', cls: 't-fix' },
    removed: { label: 'Прибрано', icon: 'remove_circle', cls: 't-removed' },
};

/** "Що нового" — curated app release notes, gymos-style timeline. */
@Component({
    selector: 'app-whats-new',
    imports: [RouterLink],
    template: `
        <header class="wn-header">
            <a routerLink="/" class="icon-btn" aria-label="До каталогу"><span class="material-symbols-outlined">arrow_back</span></a>
            <div>
                <h1 class="wn-title">Що нового</h1>
                <p class="wn-sub">Історія оновлень Кулінарної книги</p>
            </div>
        </header>

        <div class="wn-body">
            @for (rel of wn.releases; track rel.version; let first = $first) {
                <article class="release" [class.latest]="first">
                    <div class="rel-rail"><span class="rel-dot"></span></div>
                    <div class="rel-content">
                        <div class="rel-head">
                            <span class="rel-version">v{{ rel.version }}</span>
                            <h2 class="rel-name">{{ rel.title }}</h2>
                            @if (first) { <span class="rel-badge">Найновіше</span> }
                        </div>
                        <time class="rel-date">{{ formatDate(rel.date) }}</time>
                        <ul class="rel-items">
                            @for (item of rel.items; track item.text) {
                                <li class="rel-item">
                                    <span class="rel-tag" [class]="meta(item.type).cls">
                                        <span class="material-symbols-outlined">{{ meta(item.type).icon }}</span>
                                        {{ meta(item.type).label }}
                                    </span>
                                    <span class="rel-text">{{ item.text }}</span>
                                </li>
                            }
                        </ul>
                    </div>
                </article>
            }
        </div>
    `,
    styles: [`
        :host { display: block; min-height: 100dvh; background: var(--color-bg); }
        .wn-header {
            display: flex; align-items: center; gap: var(--space-3);
            max-width: 720px; margin: 0 auto; padding: var(--space-6) var(--space-4) var(--space-4);
        }
        .icon-btn { width: 42px; height: 42px; flex: none; border: none; cursor: pointer; display: grid; place-items: center; border-radius: var(--radius-full); background: var(--color-surface-hover); color: var(--color-text-secondary); }
        .wn-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); margin: 0; color: var(--color-text-primary); }
        .wn-sub { margin: 2px 0 0; font-size: var(--text-sm); color: var(--color-text-tertiary); }

        .wn-body { max-width: 720px; margin: 0 auto; padding: 0 var(--space-4) var(--space-16); }

        .release { display: flex; gap: var(--space-4); }
        .rel-rail { position: relative; width: 14px; flex: none; display: flex; justify-content: center; }
        .rel-rail::before { content: ''; position: absolute; top: 6px; bottom: -8px; width: 2px; background: var(--color-border); }
        .release:last-child .rel-rail::before { display: none; }
        .rel-dot { width: 14px; height: 14px; border-radius: var(--radius-full); background: var(--color-surface); border: 3px solid var(--color-border); z-index: 1; margin-top: 3px; }
        .release.latest .rel-dot { border-color: var(--color-accent); box-shadow: 0 0 0 4px var(--color-accent-light); }

        .rel-content {
            flex: 1; min-width: 0; margin-bottom: var(--space-6);
            background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
            padding: var(--space-5); box-shadow: var(--shadow-card);
        }
        .release.latest .rel-content { border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border)); }
        .rel-head { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); }
        .rel-version { font-family: var(--font-display); font-weight: var(--weight-bold); font-size: var(--text-sm); color: var(--color-accent-dark); background: var(--color-accent-light); padding: 2px 10px; border-radius: var(--radius-full); }
        .rel-name { font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--weight-semibold); margin: 0; color: var(--color-text-primary); }
        .rel-badge { font-size: var(--text-xs); font-weight: var(--weight-bold); color: #fff; background: var(--color-accent); padding: 2px 10px; border-radius: var(--radius-full); }
        .rel-date { display: block; font-size: var(--text-xs); color: var(--color-text-tertiary); margin: var(--space-1) 0 var(--space-4); }

        .rel-items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-3); }
        .rel-item { display: flex; gap: var(--space-3); align-items: flex-start; }
        .rel-tag {
            display: inline-flex; align-items: center; gap: 4px; flex: none;
            font-size: 11px; font-weight: var(--weight-semibold); padding: 3px 9px; border-radius: var(--radius-full);
            width: 108px; box-sizing: border-box;
        }
        .rel-tag .material-symbols-outlined { font-size: 14px; }
        .t-feature { background: var(--color-accent-light); color: var(--color-accent-dark); }
        .t-improvement { background: var(--color-secondary-light); color: var(--color-secondary-dark); }
        .t-fix { background: var(--color-success-light); color: var(--color-success); }
        .t-removed { background: var(--color-surface-active); color: var(--color-text-tertiary); }
        .rel-text { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: var(--leading-relaxed); }

        @media (max-width: 560px) {
            .rel-item { flex-direction: column; gap: 4px; }
            .rel-tag { width: auto; }
        }
    `],
})
export class WhatsNewPage implements OnInit {
    protected readonly wn = inject(WhatsNewService);

    ngOnInit(): void { this.wn.markSeen(); }

    protected meta(type: ChangeType) { return TYPE_META[type]; }

    protected formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
    }
}
