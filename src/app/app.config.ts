import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';

import { routes } from './app.routes';
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
        provideHttpClient(withFetch()),
    ],
};
