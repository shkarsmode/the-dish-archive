import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { CompareBarComponent } from './shared/components/compare-bar.component';
import { HeaderComponent } from './shared/components/header.component';
import { ToastContainerComponent } from './shared/components/toast-container.component';
import { PullToRefreshDirective } from './shared/directives/pull-to-refresh.directive';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, HeaderComponent, CompareBarComponent, ToastContainerComponent, PullToRefreshDirective],
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    // Eagerly inject to apply theme on startup
    private readonly themeService = inject(ThemeService);
}
