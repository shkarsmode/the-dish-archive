import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guards';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./pages/login/login').then(m => m.LoginPage),
    },
    {
        path: 'access-pending',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/access-pending/access-pending').then(m => m.AccessPendingPage),
    },
    {
        path: '',
        loadComponent: () => import('./pages/catalog/catalog').then(m => m.CatalogPage),
    },
    {
        path: 'dish/:slug',
        loadComponent: () => import('./pages/dish-detail/dish-detail').then(m => m.DishDetailPage),
    },
    {
        path: 'changelog',
        loadComponent: () => import('./pages/changelog/changelog').then(m => m.ChangelogPage),
    },
    {
        path: '**',
        redirectTo: '',
    },
];
