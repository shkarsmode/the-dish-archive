import { Injectable } from '@angular/core';

export interface StoredDraft {
    savedAt: number;
    value: unknown;
}

/**
 * Persists in-progress recipe-editor form state to localStorage so a page
 * reload, crash, or accidental navigation never loses unsaved work.
 * Keyed per target ('new' for a fresh recipe, or the dish id when editing).
 */
@Injectable({ providedIn: 'root' })
export class EditorDraftService {
    private static readonly PREFIX = 'dishArchive.editorDraft.';
    /** Drafts older than this are treated as stale and ignored. */
    private static readonly MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

    private key(target: string | null): string {
        return `${EditorDraftService.PREFIX}${target ?? 'new'}`;
    }

    save(target: string | null, value: unknown): number {
        const savedAt = Date.now();
        try {
            localStorage.setItem(this.key(target), JSON.stringify({ savedAt, value } satisfies StoredDraft));
        } catch {
            // Storage full or unavailable — autosave is best-effort.
        }
        return savedAt;
    }

    load(target: string | null): StoredDraft | null {
        try {
            const raw = localStorage.getItem(this.key(target));
            if (!raw) return null;
            const parsed = JSON.parse(raw) as StoredDraft;
            if (!parsed || typeof parsed.savedAt !== 'number') return null;
            if (Date.now() - parsed.savedAt > EditorDraftService.MAX_AGE_MS) {
                this.clear(target);
                return null;
            }
            return parsed;
        } catch {
            return null;
        }
    }

    clear(target: string | null): void {
        try {
            localStorage.removeItem(this.key(target));
        } catch {
            // ignore
        }
    }
}
