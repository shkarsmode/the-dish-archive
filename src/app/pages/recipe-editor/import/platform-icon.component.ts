import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ImportPlatform } from '../../../core/services/ai.service';

/** Simple monochrome brand glyphs (currentColor) for the import sources. */
@Component({
    selector: 'app-platform-icon',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @switch (platform()) {
            @case ('instagram') {
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5.5" fill="none" stroke="currentColor" stroke-width="2" />
                    <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" stroke-width="2" />
                    <circle cx="17.4" cy="6.6" r="1.25" fill="currentColor" />
                </svg>
            }
            @case ('tiktok') {
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M15.2 2.5c.4 2.3 1.9 3.9 4.3 4.2v3.1a7.4 7.4 0 0 1-4.2-1.4v6.3a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.2a2.5 2.5 0 1 0 1.6 2.3V2.5h3z" />
                </svg>
            }
            @case ('youtube') {
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" fill-rule="evenodd" d="M6.2 4.8h11.6A4.2 4.2 0 0 1 22 9v6a4.2 4.2 0 0 1-4.2 4.2H6.2A4.2 4.2 0 0 1 2 15V9a4.2 4.2 0 0 1 4.2-4.2zM10 8.8v6.4l5.4-3.2L10 8.8z" />
                </svg>
            }
            @case ('facebook') {
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M13.6 21.5v-8h2.7l.4-3.2h-3.1V8.3c0-.9.3-1.6 1.6-1.6h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.5v3.2h2.8v8h3.3z" />
                </svg>
            }
            @case ('telegram') {
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M21.4 3.6 2.9 10.8c-1.2.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.4.9 1 .9.4 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.2-15.1c.3-1.3-.5-1.9-1.6-1.6zM9.3 14.4l9.2-5.8c.5-.3.9-.1.5.2l-7.6 6.9-.3 3.3-1.8-4.6z" />
                </svg>
            }
            @case ('pinterest') {
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.6-1.8-4.3-4.5-4.3-3 0-4.8 2.3-4.8 4.6 0 .9.4 1.9.8 2.4.1.1.1.2.1.3l-.3 1.2c0 .2-.2.3-.4.2-1.4-.6-2.2-2.6-2.2-4.2 0-3.4 2.5-6.6 7.2-6.6 3.8 0 6.7 2.7 6.7 6.3 0 3.8-2.4 6.8-5.7 6.8-1.1 0-2.2-.6-2.5-1.3l-.7 2.6c-.2 1-.9 2.2-1.4 2.9A10 10 0 1 0 12 2z" />
                </svg>
            }
            @case ('threads') {
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M17.5 8.6C16.7 5.8 14.6 4 11.8 4 7.6 4 5 7.2 5 12s2.6 8 6.8 8c3.5 0 6-2 6-4.9 0-2.5-2-4-5-4-2.4 0-3.9 1.2-3.9 2.8 0 1.5 1.3 2.4 2.9 2.4 2.6 0 3.6-2.2 3.6-5.6" />
                </svg>
            }
            @case ('x') {
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />
                </svg>
            }
            @case ('photo') {
                <span class="material-symbols-outlined">photo_camera</span>
            }
            @case ('text') {
                <span class="material-symbols-outlined">edit_note</span>
            }
            @default {
                <span class="material-symbols-outlined">language</span>
            }
        }
    `,
    styles: `
        :host { display: inline-grid; place-items: center; width: 1.25em; height: 1.25em; line-height: 1; }
        svg { width: 100%; height: 100%; display: block; }
        .material-symbols-outlined { font-size: 1.25em; }
    `,
})
export class PlatformIconComponent {
    readonly platform = input<ImportPlatform | null>('website');
}

export const PLATFORM_LABELS: Record<ImportPlatform, string> = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    facebook: 'Facebook',
    telegram: 'Telegram',
    pinterest: 'Pinterest',
    threads: 'Threads',
    x: 'X',
    website: 'Сайт',
    photo: 'Фото',
    text: 'Текст',
};

/** Client-side mirror of the backend detection, for instant feedback while typing. */
export function detectPlatform(value: string): ImportPlatform | null {
    const match = String(value || '').match(/(?:https?:\/\/)?([^\s/?#]+\.[^\s/?#]+)/i);
    if (!match) return null;
    const host = match[1].toLowerCase().replace(/^(www|m|mobile|mbasic|vm|vt)\./, '');
    if (/(^|\.)instagram\.com$|^instagr\.am$/.test(host)) return 'instagram';
    if (/(^|\.)tiktok\.com$/.test(host)) return 'tiktok';
    if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) return 'youtube';
    if (/(^|\.)facebook\.com$|^fb\.(com|watch)$/.test(host)) return 'facebook';
    if (/^t\.me$|^telegram\.(me|dog)$/.test(host)) return 'telegram';
    if (/pinterest\.|^pin\.it$/.test(host)) return 'pinterest';
    if (/^threads\.(net|com)$/.test(host)) return 'threads';
    if (/^(x|twitter)\.com$/.test(host)) return 'x';
    return 'website';
}

/** First http(s) URL in a pasted string ("Look at this: https://..."). */
export function extractUrl(value: string): string | null {
    const text = String(value || '').trim();
    const found = text.match(/https?:\/\/[^\s<>"'«»]+/i)?.[0];
    if (found) return found.replace(/[)\].,;!?»"']+$/, '');
    if (/^(www\.)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(text)) return `https://${text}`;
    return null;
}
