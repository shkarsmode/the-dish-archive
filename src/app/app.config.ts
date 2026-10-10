import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';

import { routes } from './app.routes';
import { MOCK_INTERCEPTORS } from './core/dev/mock-providers';
import { SelectivePreloading } from './core/services/selective-preloading';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(
            routes,
            // Preload the likely next pages (catalog, recipe, editor for writers) in the
            // background after first paint, so opening them is instant; admin pages
            // stay on demand (see SelectivePreloading).
            withPreloading(SelectivePreloading),
            withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
        ),
        // MOCK_INTERCEPTORS is empty outside `ng serve -c mock`.
        provideHttpClient(withFetch(), withInterceptors(MOCK_INTERCEPTORS)),
    ],
};
