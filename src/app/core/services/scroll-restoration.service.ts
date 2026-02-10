import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScrollRestorationService {
    private _lastDishSlug: string | null = null;

    get lastDishSlug(): string | null {
        return this._lastDishSlug;
    }

    saveDishSlug(slug: string): void {
        this._lastDishSlug = slug;
    }

    consume(): string | null {
        const slug = this._lastDishSlug;
        this._lastDishSlug = null;
        return slug;
    }
}
