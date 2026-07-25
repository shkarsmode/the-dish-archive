import { Routes } from '@angular/router';
import { approvedUserGuard, authGuard, familyAdminGuard, publicDishGuard, superAdminGuard, unsavedChangesGuard } from './core/guards/auth.guards';

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
        canActivate: [approvedUserGuard],
        loadComponent: () => import('./pages/catalog/catalog').then(m => m.CatalogPage),
    },
    {
        path: 'dish/:slug',
        canActivate: [publicDishGuard],
        loadComponent: () => import('./pages/dish-detail/dish-detail').then(m => m.DishDetailPage),
    },
    {
        path: 'changelog',
        canActivate: [approvedUserGuard],
        loadComponent: () => import('./pages/changelog/changelog').then(m => m.ChangelogPage),
    },
    {
        path: 'insights',
        canActivate: [approvedUserGuard],
        loadComponent: () => import('./pages/insights/insights').then(m => m.InsightsPage),
    },
    {
        path: 'whats-new',
        canActivate: [approvedUserGuard],
        loadComponent: () => import('./pages/whats-new/whats-new').then(m => m.WhatsNewPage),
    },
    {
        path: 'cook/:slug',
        canActivate: [approvedUserGuard],
        loadComponent: () => import('./pages/cook-mode/cook-mode').then(m => m.CookModePage),
    },
    {
        path: 'recipes/new',
        canActivate: [approvedUserGuard],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./pages/recipe-editor/recipe-editor').then(m => m.RecipeEditorPage),
    },
    {
        path: 'recipes/:dishId/edit',
        canActivate: [approvedUserGuard],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./pages/recipe-editor/recipe-editor').then(m => m.RecipeEditorPage),
    },
    {
        path: 'family/:familySlug/admin',
        canActivate: [familyAdminGuard],
        loadComponent: () => import('./pages/family/family-admin').then(m => m.FamilyAdminPage),
    },
    {
        path: 'admin',
        canActivate: [superAdminGuard],
        loadComponent: () => import('./pages/admin/admin-layout').then(m => m.AdminLayoutPage),
        children: [
            {
                path: '',
                loadComponent: () => import('./pages/admin/admin-dashboard').then(m => m.AdminDashboardPage),
            },
            {
                path: 'access-requests',
                loadComponent: () => import('./pages/admin/admin-access-requests').then(m => m.AdminAccessRequestsPage),
            },
            {
                path: 'families',
                loadComponent: () => import('./pages/admin/admin-families').then(m => m.AdminFamiliesPage),
            },
            {
                path: 'families/:familyId',
                loadComponent: () => import('./pages/admin/admin-family-members').then(m => m.AdminFamilyMembersPage),
            },
            {
                path: 'users',
                loadComponent: () => import('./pages/admin/admin-users').then(m => m.AdminUsersPage),
            },
            {
                path: 'activity',
                loadComponent: () => import('./pages/admin/admin-activity').then(m => m.AdminActivityPage),
            },
            {
                path: 'ai-usage',
                loadComponent: () => import('./pages/admin/admin-ai-usage').then(m => m.AdminAiUsagePage),
            },
        ],
    },
    {
        path: '**',
        redirectTo: '',
    },
];
