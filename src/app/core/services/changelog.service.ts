import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { AdminService } from './admin.service';

export interface ChangelogEntryItem {
    id: number;
    version: string;
    title: string;
    description: string;
    action: 'added' | 'updated' | 'removed' | 'fixed' | 'improved';
    dishId: string | null;
    dishTitle: string | null;
    changes: string[];
    date: string;
}

export interface ChangelogGroup {
    date: string;
    entries: ChangelogEntryItem[];
}

@Injectable({ providedIn: 'root' })
export class ChangelogService {
    private readonly http = inject(HttpClient);
    private readonly adminService = inject(AdminService);

    readonly groups = signal<ChangelogGroup[]>([]);
    readonly isLoading = signal(false);
    readonly loadError = signal<string | null>(null);

    loadChangelog(): void {
        this.isLoading.set(true);
        this.loadError.set(null);

        const url = `${this.adminService.apiUrl()}/api/changelog`;

        this.http.get<ChangelogGroup[]>(url).subscribe({
            next: (data) => {
                this.groups.set(data);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load changelog:', err);
                this.loadError.set('Не вдалося завантажити історію змін');
                this.isLoading.set(false);
            },
        });
    }
}
