import { Routes } from '@angular/router';

export const routes: Routes = [
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
