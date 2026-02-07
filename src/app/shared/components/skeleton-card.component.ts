import { Component } from '@angular/core';

@Component({
    selector: 'app-skeleton-card',
    template: `
        <div class="skeleton-card" aria-hidden="true">
            <div class="skeleton-image"></div>
            <div class="skeleton-body">
                <div class="skeleton-tag"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
                <div class="skeleton-meta">
                    <div class="skeleton-meta-item"></div>
                    <div class="skeleton-meta-item"></div>
                    <div class="skeleton-meta-item"></div>
                </div>
            </div>
        </div>
    `,
    styles: `
        @use 'mixins' as m;

        .skeleton-card {
            background: var(--color-surface);
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-card);
        }

        .skeleton-image {
            aspect-ratio: var(--card-aspect);
            @include m.skeleton;
            border-radius: 0;
        }

        .skeleton-body {
            padding: var(--space-4);
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
        }

        .skeleton-tag {
            width: 60px;
            height: 14px;
            @include m.skeleton;
        }

        .skeleton-title {
            width: 75%;
            height: 20px;
            @include m.skeleton;
        }

        .skeleton-text {
            width: 100%;
            height: 14px;
            @include m.skeleton;

            &.short { width: 60%; }
        }

        .skeleton-meta {
            display: flex;
            gap: var(--space-4);
            margin-top: var(--space-2);
            padding-top: var(--space-3);
            border-top: 1px solid var(--color-border-light);
        }

        .skeleton-meta-item {
            width: 60px;
            height: 14px;
            @include m.skeleton;
        }
    `,
})
export class SkeletonCardComponent {}
