import { Component, input, output } from '@angular/core';

@Component({
    selector: 'app-tag-chip',
    template: `
        <span
            class="tag-chip"
            [class.active]="active()"
            [class.removable]="removable()"
            role="button"
            [attr.tabindex]="clickable() ? 0 : null"
            (click)="tagClicked.emit()"
            (keydown.enter)="tagClicked.emit()">
            {{ label() }}
            @if (removable()) {
                <span class="material-symbols-outlined remove-icon" (click)="removed.emit(); $event.stopPropagation()">
                    close
                </span>
            }
        </span>
    `,
    styles: `
        .tag-chip {
            display: inline-flex;
            align-items: center;
            gap: var(--space-1);
            padding: var(--space-1) var(--space-3);
            background: var(--color-surface-hover);
            color: var(--color-text-secondary);
            font-size: var(--text-xs);
            font-weight: var(--weight-medium);
            line-height: 1.4;
            border-radius: var(--radius-full);
            white-space: nowrap;
            transition: background-color var(--transition-fast),
                        color var(--transition-fast);
            user-select: none;

            &[tabindex="0"] {
                cursor: pointer;

                &:hover {
                    background: var(--color-accent-light);
                    color: var(--color-accent-dark);
                }
            }

            &.active {
                background: var(--color-accent);
                color: var(--color-text-inverse);
            }
        }

        .remove-icon {
            font-size: 14px;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity var(--transition-fast);

            &:hover {
                opacity: 1;
            }
        }
    `,
})
export class TagChipComponent {
    readonly label = input.required<string>();
    readonly active = input(false);
    readonly removable = input(false);
    readonly clickable = input(true);

    readonly tagClicked = output<void>();
    readonly removed = output<void>();
}
