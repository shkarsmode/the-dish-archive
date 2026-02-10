import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScrollRestorationService {
    private _lastDishSlug: string | null = null;
    private _isRestoring = false;

    get lastDishSlug(): string | null {
        return this._lastDishSlug;
    }

    /** True while navigating back from a dish detail page. */
    get isRestoring(): boolean {
        return this._isRestoring;
    }

    saveDishSlug(slug: string): void {
        this._lastDishSlug = slug;
        this._isRestoring = true;
    }

    consume(): string | null {
        const slug = this._lastDishSlug;
        this._lastDishSlug = null;
        return slug;
    }

    doneRestoring(): void {
        this._isRestoring = false;
    }
}
