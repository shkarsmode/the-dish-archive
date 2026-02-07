import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CompareBarComponent } from './shared/components/compare-bar.component';
import { HeaderComponent } from './shared/components/header.component';
import { ToastContainerComponent } from './shared/components/toast-container.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, HeaderComponent, CompareBarComponent, ToastContainerComponent],
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {}
