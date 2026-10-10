import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Dev-only hook. Production builds ship this empty list; `ng serve -c mock`
 * swaps in mock-providers.mock.ts (angular.json fileReplacements), which fakes
 * the API so the UI can be previewed without a backend or a Google sign-in.
 */
export const MOCK_INTERCEPTORS: HttpInterceptorFn[] = [];
