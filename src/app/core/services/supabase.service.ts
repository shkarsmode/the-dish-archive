import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Thin wrapper that owns the single Supabase client instance for the app.
 * Auth, data access and storage services all build on top of `client`.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
    readonly client: SupabaseClient = createClient(
        environment.supabaseUrl,
        environment.supabaseAnonKey,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                flowType: 'pkce',
            },
        },
    );
}
