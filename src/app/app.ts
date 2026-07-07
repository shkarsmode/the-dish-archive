import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';
import { CompareBarComponent } from './shared/components/compare-bar.component';
import { HeaderComponent } from './shared/components/header.component';
import { ToastContainerComponent } from './shared/components/toast-container.component';
import { PullToRefreshDirective } from './shared/directives/pull-to-refresh.directive';

const CHROMELESS_PREFIXES = ['/login', '/access-pending', '/admin', '/family'];

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, HeaderComponent, CompareBarComponent, ToastContainerComponent, PullToRefreshDirective],
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    // Eagerly inject to apply theme and restore the auth session on startup.
    private readonly themeService = inject(ThemeService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    private readonly currentUrl = signal(this.router.url);

    /** Hide the header/compare bar on standalone auth + admin screens. */
    readonly showChrome = computed(() => {
        const path = this.currentUrl().split('?')[0];
        return !CHROMELESS_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix + '/'));
    });

    constructor() {
        this.router.events
            .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe(event => this.currentUrl.set(event.urlAfterRedirects));
    }
}
