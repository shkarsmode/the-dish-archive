import { computed, Injectable, signal } from '@angular/core';

export type DisplayMode = 'compact' | 'cozy' | 'spacious';

export interface AppSettings {
    displayMode: DisplayMode;
}

const STORAGE_KEY = 'dishArchive.settings.v1';

const DEFAULTS: AppSettings = {
    displayMode: 'cozy',
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
    private readonly state = signal<AppSettings>(this.load());

    readonly settings = this.state.asReadonly();
    readonly displayMode = computed(() => this.state().displayMode);

    updateSettings(partial: Partial<AppSettings>): void {
        this.state.update(current => {
            const next = { ...current, ...partial };
            this.persist(next);
            return next;
        });
    }

    private load(): AppSettings {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return DEFAULTS;
            const parsed = JSON.parse(raw);
            return { ...DEFAULTS, ...parsed };
        } catch {
            return DEFAULTS;
        }
    }

    private persist(settings: AppSettings): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            /* noop */
        }
    }
}
