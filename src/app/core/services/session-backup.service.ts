import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** Same-origin function (api/session.js) holding the token in a first-party httpOnly cookie. */
const ENDPOINT = '/api/session';
/** Readable flag that function sets next to the copy. */
const FLAG = 'dish_signed_in';

/**
 * Backup of the session token that outlives Safari's storage cleanup. Safari erases
 * localStorage (where ApiService keeps the token) after 7 days without a visit and
 * never sends the API's own cookie, since the API lives on another site. A cookie
 * set by this site's server survives both, so a returning visitor is restored from
 * it instead of landing on the login page.
 */
@Injectable({ providedIn: 'root' })
export class SessionBackupService {
    private readonly doc = inject(DOCUMENT);

    hasBackup(): boolean {
        return this.doc.cookie.split(/;\s*/).includes(`${FLAG}=1`);
    }

    /** The backed-up token, or null. Asks the server only when the flag says there is one. */
    async restore(): Promise<string | null> {
        if (!this.hasBackup()) return null;
        try {
            const response = await fetch(ENDPOINT, { cache: 'no-store' });
            if (!response.ok) return null;
            const body = (await response.json()) as { token?: unknown };
            return typeof body?.token === 'string' && body.token ? body.token : null;
        } catch {
            return null;
        }
    }

    save(token: string): void {
        void fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
            keepalive: true,
        }).catch(() => undefined);
    }

    clear(): void {
        // Drop the flag right here (works offline too), so a failed request below can
        // never sign a signed-out visitor back in on the next start.
        this.doc.cookie = `${FLAG}=; Path=/; Max-Age=0; Secure; SameSite=Lax`;
        void fetch(ENDPOINT, { method: 'DELETE', keepalive: true }).catch(() => undefined);
    }
}
