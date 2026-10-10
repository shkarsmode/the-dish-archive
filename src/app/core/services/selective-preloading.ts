import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Preload only what a person is likely to open next: the catalog and recipe pages
 * for everyone (`data: { preload: true }`), the editor only for people who can
 * write recipes (`'editor'`). Admin and statistics pages load on demand, instead
 * of every visitor downloading them in the background.
 */
@Injectable({ providedIn: 'root' })
export class SelectivePreloading implements PreloadingStrategy {
    private readonly auth = inject(AuthService);

    preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
        const mode = route.data?.['preload'];
        if (mode === true) return load();
        if (mode === 'editor' && this.auth.canEditAnything()) return load();
        return of(null);
    }
}
