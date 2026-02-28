import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChangelogService } from '../../core/services/changelog.service';

@Component({
    selector: 'app-changelog',
    imports: [RouterLink],
    templateUrl: './changelog.html',
    styleUrl: './changelog.scss',
})
export class ChangelogPage implements OnInit {
    protected readonly changelogService = inject(ChangelogService);

    ngOnInit(): void {
        this.changelogService.loadChangelog();
    }

    protected getActionIcon(action: string): string {
        switch (action) {
            case 'added': return '✨';
            case 'updated': return '📝';
            case 'removed': return '🗑️';
            case 'fixed': return '🔧';
            case 'improved': return '⚡';
            default: return '📋';
        }
    }

    protected getActionLabel(action: string): string {
        switch (action) {
            case 'added': return 'Додано';
            case 'updated': return 'Оновлено';
            case 'removed': return 'Видалено';
            case 'fixed': return 'Виправлено';
            case 'improved': return 'Покращено';
            default: return 'Зміна';
        }
    }

    protected getActionClass(action: string): string {
        return `action-${action}`;
    }

    protected formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }

    protected formatTime(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    protected isToday(dateStr: string): boolean {
        const date = new Date(dateStr);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    protected isYesterday(dateStr: string): boolean {
        const date = new Date(dateStr);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return date.toDateString() === yesterday.toDateString();
    }

    protected getRelativeDate(dateStr: string): string {
        if (this.isToday(dateStr)) return 'Сьогодні';
        if (this.isYesterday(dateStr)) return 'Вчора';
        return this.formatDate(dateStr);
    }
}
