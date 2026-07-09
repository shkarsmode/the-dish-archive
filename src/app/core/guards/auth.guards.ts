import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

interface CanDeactivateComponent {
    canDeactivate?: () => boolean;
}

/** Warns before leaving a form with unsaved changes. */
export const unsavedChangesGuard: CanDeactivateFn<CanDeactivateComponent> = component =>
    component?.canDeactivate ? component.canDeactivate() : true;

/** Requires an authenticated session; otherwise sends the user to /login. */
export const authGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.whenReady();
    return auth.isAuthenticated() ? true : router.parseUrl('/login');
};

/**
 * Recipe pages are shareable, so anyone may open one: RLS still limits an
 * unauthenticated/pending visitor to published + public recipes (a private one
 * simply renders as "not found"). We only wait for the session to resolve so the
 * dish cache is populated before the page decides what to show.
 */
export const publicDishGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    await auth.whenReady();
    return true;
};

/** Requires the user to be approved in a family (or super admin). */
export const approvedUserGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.whenReady();
    if (!auth.isAuthenticated()) {
        return router.parseUrl('/login');
    }
    return auth.isApproved() ? true : router.parseUrl('/access-pending');
};

/** Restricts a route to the global super admin. */
export const superAdminGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.whenReady();
    if (auth.isSuperAdmin()) {
        return true;
    }
    return router.parseUrl(auth.isAuthenticated() ? '/' : '/login');
};

/** Restricts a family admin route to owners/admins of that family (or super admin). */
export const familyAdminGuard: CanActivateFn = async route => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.whenReady();
    if (!auth.isAuthenticated()) {
        return router.parseUrl('/login');
    }
    if (auth.isSuperAdmin()) {
        return true;
    }
    const slug = route.paramMap.get('familySlug');
    const family = slug ? auth.familyBySlug(slug) : null;
    if (family && auth.canAdminFamily(family.id)) {
        return true;
    }
    return router.parseUrl('/access-pending');
};
