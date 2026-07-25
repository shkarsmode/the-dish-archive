import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AiService } from '../../core/services/ai.service';

type Period = 'today' | '7d' | '30d' | 'all';
type Status = 'all' | 'success' | 'error';

@Component({
    selector: 'app-admin-ai-usage',
    imports: [DecimalPipe],
    template: `
        <section class="page">
            <div class="page-head">
                <div>
                    <h2 class="page-title">Використання AI</h2>
                    <p class="page-sub">Хто і скільки генерував рецептів за допомогою AI.</p>
                </div>
                <button class="refresh" (click)="reload()" [disabled]="loading()" title="Оновити">
                    <span class="material-symbols-outlined">refresh</span>
                </button>
            </div>

            @if (summary(); as s) {
                <div class="kpis">
                    <div class="kpi"><span class="kpi-value">{{ s.counts.today }}</span><span class="kpi-label">Сьогодні</span></div>
                    <div class="kpi"><span class="kpi-value">{{ s.counts.last7Days }}</span><span class="kpi-label">7 днів</span></div>
                    <div class="kpi"><span class="kpi-value">{{ s.counts.last30Days }}</span><span class="kpi-label">30 днів</span></div>
                    <div class="kpi"><span class="kpi-value">{{ s.counts.total }}</span><span class="kpi-label">Всього</span></div>
                    <div class="kpi"><span class="kpi-value">{{ s.period.successRate }}%</span><span class="kpi-label">Успішних</span></div>
                    <div class="kpi"><span class="kpi-value">{{ (s.period.totalTokens || 0) | number }}</span><span class="kpi-label">Токенів</span></div>
                    <div class="kpi"><span class="kpi-value">{{ s.period.avgLatencyMs }} мс</span><span class="kpi-label">Сер. час</span></div>
                    <div class="kpi"><span class="kpi-value">{{ s.period.errors }}</span><span class="kpi-label">Помилок</span></div>
                </div>
            }

            @if (limits(); as l) {
                <p class="model-line">
                    Модель: <strong>{{ l.model }}</strong> ·
                    {{ l.configured ? 'налаштовано ✓' : 'ключ не налаштовано ✕' }} ·
                    сьогодні {{ l.usage.requestsToday }} запитів
                    @if (l.official) { / офіційний ліміт {{ l.official.rpd }}/день }
                </p>
            }

            <div class="filters">
                <div class="segmented">
                    @for (p of periods; track p.v) {
                        <button [class.active]="period() === p.v" (click)="setPeriod(p.v)">{{ p.l }}</button>
                    }
                </div>
                <select [value]="status()" (change)="setStatus($any($event.target).value)">
                    <option value="all">Усі статуси</option>
                    <option value="success">Успішні</option>
                    <option value="error">Помилки</option>
                </select>
                @if (summary()?.models?.length) {
                    <select [value]="model()" (change)="setModel($any($event.target).value)">
                        <option value="">Усі моделі</option>
                        @for (m of summary().models; track m.model) {
                            <option [value]="m.model">{{ m.model }}</option>
                        }
                    </select>
                }
            </div>

            @if (requests(); as r) {
                <div class="table-wrap">
                    <table class="usage-table">
                        <thead>
                            <tr>
                                <th>Користувач</th><th>Статус</th><th>Інгр.</th><th>Кроки</th>
                                <th>Токени</th><th>Час</th><th>Коли</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (row of r.items; track row.id) {
                                <tr>
                                    <td>
                                        <div class="u-name">{{ row.userName }}</div>
                                        <div class="u-email">{{ row.userEmail }}</div>
                                    </td>
                                    <td>
                                        <span class="badge" [class.ok]="row.status === 'success'" [class.err]="row.status !== 'success'">
                                            {{ row.status === 'success' ? 'ок' : (row.errorCode || 'помилка') }}
                                        </span>
                                    </td>
                                    <td>{{ row.recognizedIngredients ?? '—' }}</td>
                                    <td>{{ row.recognizedSteps ?? '—' }}</td>
                                    <td>{{ row.totalTokens ?? '—' }}</td>
                                    <td>{{ row.durationMs != null ? row.durationMs + ' мс' : '—' }}</td>
                                    <td class="when">{{ fmtDate(row.createdAt) }}</td>
                                </tr>
                            } @empty {
                                <tr><td colspan="7" class="empty">Записів немає</td></tr>
                            }
                        </tbody>
                    </table>
                </div>

                <div class="pager">
                    <button (click)="prev()" [disabled]="r.page <= 1">← Назад</button>
                    <span>Сторінка {{ r.page }} з {{ r.totalPages }} · {{ r.total }} записів</span>
                    <button (click)="next()" [disabled]="r.page >= r.totalPages">Далі →</button>
                </div>
            }
        </section>
    `,
    styles: [`
        :host { display: block; }
        .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
        .page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); margin: 0; color: var(--color-text-primary); }
        .page-sub { margin: 4px 0 0; color: var(--color-text-tertiary); font-size: var(--text-sm); }
        .refresh { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: 1px solid var(--color-border); border-radius: var(--radius-full); background: var(--color-surface); color: var(--color-text-secondary); cursor: pointer; }
        .refresh:disabled { opacity: 0.5; }
        .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px; }
        .kpi { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 14px 16px; text-align: center; }
        .kpi-value { display: block; font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
        .kpi-label { display: block; margin-top: 2px; font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .model-line { font-size: var(--text-sm); color: var(--color-text-secondary); margin: 0 0 16px; }
        .filters { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .segmented { display: inline-flex; border: 1px solid var(--color-border); border-radius: var(--radius-full); overflow: hidden; }
        .segmented button { border: none; background: var(--color-surface); color: var(--color-text-secondary); padding: 8px 14px; font-size: var(--text-sm); cursor: pointer; }
        .segmented button.active { background: var(--color-accent); color: var(--color-text-inverse); }
        select { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text-primary); font-size: var(--text-sm); }
        .table-wrap { overflow-x: auto; border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
        .usage-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); min-width: 640px; }
        .usage-table th { text-align: left; padding: 10px 14px; background: var(--color-surface-hover); color: var(--color-text-secondary); font-weight: var(--weight-semibold); border-bottom: 1px solid var(--color-border); white-space: nowrap; }
        .usage-table td { padding: 10px 14px; border-bottom: 1px solid var(--color-border-light); color: var(--color-text-primary); vertical-align: top; }
        .u-name { font-weight: var(--weight-medium); }
        .u-email { font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: var(--weight-semibold); }
        .badge.ok { background: var(--color-success-light); color: var(--color-success); }
        .badge.err { background: var(--color-error-light); color: var(--color-error); }
        .when { color: var(--color-text-tertiary); white-space: nowrap; }
        .empty { text-align: center; color: var(--color-text-tertiary); padding: 24px; }
        .pager { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; font-size: var(--text-sm); color: var(--color-text-secondary); }
        .pager button { border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text-primary); padding: 8px 14px; border-radius: var(--radius-full); cursor: pointer; }
        .pager button:disabled { opacity: 0.5; cursor: not-allowed; }
    `],
})
export class AdminAiUsagePage {
    private readonly ai = inject(AiService);

    protected readonly summary = signal<any>(null);
    protected readonly limits = signal<any>(null);
    protected readonly requests = signal<{ items: any[]; page: number; pageSize: number; total: number; totalPages: number } | null>(null);
    protected readonly loading = signal(false);

    protected readonly period = signal<Period>('30d');
    protected readonly status = signal<Status>('all');
    protected readonly model = signal<string>('');
    protected readonly page = signal(1);

    protected readonly periods: { v: Period; l: string }[] = [
        { v: 'today', l: 'Сьогодні' },
        { v: '7d', l: '7 днів' },
        { v: '30d', l: '30 днів' },
        { v: 'all', l: 'Весь час' },
    ];

    constructor() {
        void this.reload();
    }

    private query() {
        return { period: this.period(), status: this.status(), model: this.model() || undefined };
    }

    protected async reload(): Promise<void> {
        this.loading.set(true);
        try {
            const [summary, requests, limits] = await Promise.all([
                this.ai.statistics('summary', this.query()),
                this.ai.statistics('requests', { ...this.query(), page: this.page(), pageSize: 20 }),
                this.ai.statistics('limits'),
            ]);
            this.summary.set(summary);
            this.requests.set(requests as any);
            this.limits.set(limits);
        } catch {
            /* ignore — likely no data yet */
        } finally {
            this.loading.set(false);
        }
    }

    protected setPeriod(p: Period): void { this.period.set(p); this.page.set(1); void this.reload(); }
    protected setStatus(s: Status): void { this.status.set(s); this.page.set(1); void this.reload(); }
    protected setModel(m: string): void { this.model.set(m); this.page.set(1); void this.reload(); }
    protected prev(): void { if (this.page() > 1) { this.page.update((p) => p - 1); void this.reload(); } }
    protected next(): void {
        const r = this.requests();
        if (r && this.page() < r.totalPages) { this.page.update((p) => p + 1); void this.reload(); }
    }

    protected fmtDate(iso: string): string {
        return new Date(iso).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' });
    }
}
