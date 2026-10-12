import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, map, merge } from 'rxjs';
import {
    ALL_CATEGORIES,
    ALL_TASTE_KEYS,
    CATEGORY_LABELS,
    DIFFICULTY_LABELS,
    Dish,
    DishCategory,
    DishDifficulty,
    TASTE_LABELS,
} from '../../core/models/dish.model';
import {
    AiRecipeDraft,
    AiService,
    EstimableField,
    ImportIssue,
    ImportPlatform,
    ImportPreview,
    RecipeImportInput,
    RecipeImportResult,
} from '../../core/services/ai.service';
import { cld } from '../../core/utils/cloudinary';
import { compressImage } from '../../core/utils/image-compress';
import { DishService } from '../../core/services/dish.service';
import { FamilyService } from '../../core/services/family.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { EditorDraftService } from '../../core/services/editor-draft.service';
import { SelectComponent, SelectOption } from '../../shared/components/select.component';
import { ImportKind, ImportProgressComponent } from './import/import-progress.component';
import { ImportReviewComponent } from './import/import-review.component';
import { detectPlatform } from './import/platform-icon.component';
import { RecipeImportStartComponent } from './import/recipe-import-start.component';

const CYRILLIC: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y',
    і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
    т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia',
};
const slugify = (v: string) => v.toLowerCase().split('').map(c => CYRILLIC[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Mirrors the backend's input cap; the composed edit context is trimmed to fit. */
const AI_MAX_INPUT = 6000;

/** Which screen of "new recipe" is showing: source picker, AI at work, or the form. */
type EditorMode = 'start' | 'importing' | 'form';

/** Form sections an import issue can point at (element ids in the template). */
const ISSUE_SECTION: Record<ImportIssue['field'], string> = {
    title: 'sec-basic',
    ingredients: 'sec-ingredients',
    steps: 'sec-steps',
    temperature: 'sec-steps',
    time: 'sec-details',
    servings: 'sec-details',
    equipment: 'sec-steps',
    other: 'sec-extra',
    estimates: 'sec-details',
};

/** Per-serving kcal from a whole-dish total; mirrors the backend's rounding. */
function kcalPerServing(total: number, servings: number): number {
    const value = total / servings;
    if (!(value > 0)) return 0;
    return value >= 50 ? Math.round(value / 10) * 10 : Math.max(1, Math.round(value));
}

/** "200 г борошна" / "борошно - 200 г" / "2 яйця" -> ingredient row parts. */
const UNIT = String.raw`(г|гр|кг|мл|л|шт\.?|ст\.?\s?л\.?|ч\.?\s?л\.?|склянк[аи]?|склянок|дрібк[аи]|пучок|зубчик[аи]?|упаковк[аи]|g|kg|ml|l)`;
const AMOUNT = String.raw`(\d+(?:[.,]\d+)?(?:\s*[-/]\s*\d+(?:[.,]\d+)?)?)`;
const LEADING_AMOUNT = new RegExp(String.raw`^${AMOUNT}\s*${UNIT}?\.?\s+(.+)$`, 'i');
const TRAILING_AMOUNT = new RegExp(String.raw`^(.+?)\s*[-:\u2013\u2014]?\s*${AMOUNT}\s*${UNIT}?\.?$`, 'i');
const TO_TASTE = /^(.+?)\s*[-:\u2013\u2014]?\s*(за смаком|по смаку)$/i;

function parseIngredientLine(line: string): { name: string; amount: string; unit: string; optional: boolean } | null {
    const text = line
        .replace(/^\s*\d+[.)]\s+/, '')
        .replace(/^\s*[-\u2013\u2014\u2022*\u00b7]\s*/, '')
        .trim();
    if (!text) return null;
    const lead = text.match(LEADING_AMOUNT);
    if (lead) return { amount: lead[1].replace(/\s+/g, ''), unit: lead[2] ?? '', name: lead[3].trim(), optional: false };
    const tail = text.match(TRAILING_AMOUNT);
    if (tail) return { name: tail[1].trim(), amount: tail[2].replace(/\s+/g, ''), unit: tail[3] ?? '', optional: false };
    const toTaste = text.match(TO_TASTE);
    if (toTaste) return { name: toTaste[1].trim(), amount: 'за смаком', unit: '', optional: false };
    return { name: text, amount: '', unit: '', optional: false };
}

/** One line of the "what the AI changed" changelog shown after an update. */
interface AiChange {
    label: string;
    before: string;
    after: string;
    /** Items gained / lost, for list-shaped fields (ingredients, steps, tags, categories). */
    added?: string[];
    removed?: string[];
}

@Component({
    selector: 'app-recipe-editor',
    imports: [
        NgTemplateOutlet,
        ReactiveFormsModule,
        FormsModule,
        SelectComponent,
        RecipeImportStartComponent,
        ImportProgressComponent,
        ImportReviewComponent,
    ],
    templateUrl: './recipe-editor.html',
    styleUrl: './recipe-editor.scss',
})
export class RecipeEditorPage {
    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly dishService = inject(DishService);
    protected readonly familyService = inject(FamilyService);
    private readonly auth = inject(AuthService);
    private readonly ai = inject(AiService);
    private readonly uploadService = inject(UploadService);
    private readonly toast = inject(ToastService);
    private readonly confirm = inject(ConfirmService);
    private readonly drafts = inject(EditorDraftService);
    private readonly destroyRef = inject(DestroyRef);

    protected readonly allCategories = ALL_CATEGORIES;
    protected readonly categoryLabels = CATEGORY_LABELS;
    protected readonly tasteKeys = ALL_TASTE_KEYS;
    protected readonly tasteLabels = TASTE_LABELS;
    protected readonly difficultyLabels = DIFFICULTY_LABELS;
    protected readonly difficulties: DishDifficulty[] = ['easy', 'medium', 'hard'];
    protected readonly difficultyOptions: SelectOption[] =
        this.difficulties.map(d => ({ value: d, label: DIFFICULTY_LABELS[d] }));
    protected readonly familyOptions = computed<SelectOption[]>(() =>
        this.familyService.editableFamilies().map(f => ({ value: f.id, label: f.name })));

    protected readonly saving = signal(false);
    protected readonly uploading = signal(false);
    protected readonly deleting = signal(false);
    protected saved = false;

    /** Timestamp of the last local autosave; drives the "draft saved" indicator. */
    protected readonly draftSavedAt = signal<number | null>(null);
    /** True only when a draft from a previous session was restored on load. */
    protected readonly restoredDraft = signal(false);
    private hydrating = false;

    // ── New recipe: source picker -> AI import -> review ──
    protected readonly mode = signal<EditorMode>('form');
    /** An autosaved draft offered on the start screen instead of being forced open. */
    private pendingDraft: { savedAt: number; value: any } | null = null;
    protected readonly pendingDraftTitle = signal<string | null>(null);
    protected readonly importKind = signal<ImportKind>('link');
    protected readonly importPlatform = signal<ImportPlatform | null>(null);
    protected readonly importPreview = signal<ImportPreview | null>(null);
    protected readonly importPhotos = signal<string[]>([]);
    protected readonly importText = signal('');
    protected readonly importDone = signal(false);
    protected readonly importError = signal<string | null>(null);
    protected readonly notRecipe = signal<string | null>(null);
    protected readonly importResult = signal<RecipeImportResult | null>(null);
    protected readonly showReview = signal(false);
    /** Import issues pinned to the exact form rows they are about (survives reordering). */
    private readonly rowIssues = new WeakMap<AbstractControl, ImportIssue>();
    private importSeq = 0;
    /** Optional sections of the form start folded so the essentials stay in view. */
    protected readonly showExtra = signal(false);
    protected readonly bulkOpen = signal(false);
    protected bulkText = '';

    // ── AI compose / assist (group admins + super-admin) ──
    protected readonly aiText = signal('');
    protected readonly aiLoading = signal(false);
    protected readonly aiError = signal<string | null>(null);
    protected readonly aiWarnings = signal<string[]>([]);
    protected readonly aiDaily = signal<{ limit: number | null; used: number | null; remaining: number | null } | null>(null);
    /**
     * Edit mode applies the AI update straight to the form and reports what it changed
     * here, so a complex update reads as a changelog instead of a checklist.
     */
    protected readonly aiChanges = signal<AiChange[]>([]);
    /** Set once an AI update has been applied and can still be rolled back. */
    protected readonly aiCanUndo = signal(false);
    /** Full form snapshot taken immediately before the AI update, for one-click undo. */
    private aiUndoSnapshot: any = null;
    /** Form state right after the AI update — lets undo detect later manual edits. */
    private aiAppliedFingerprint: string | null = null;

    // ── AI estimates: servings, time and kcal the source did not state ──
    /** Numbers the AI estimated; each keeps its "≈ AI" mark until the cook edits it. */
    protected readonly estimated = signal<ReadonlySet<EstimableField>>(new Set());
    /** Whole-dish kcal behind an estimated per-serving value, so it can follow the servings. */
    private estimatedKcalTotal = 0;
    /** Minutes an estimated total adds on top of prep + cook (marinating, chilling). */
    private estimatedTimeExtra = 0;
    /** Set while the AI writes the form, so the follow rules do not react to its own writes. */
    private applyingAi = false;
    /** Mirrors the backend default (AI_ALLOWED_ROLES): anyone who writes recipes in a family. */
    protected readonly canUseAi = computed(() =>
        this.auth.isSuperAdmin() ||
        this.auth.approvedMemberships().some((m) => m.role === 'owner' || m.role === 'admin' || m.role === 'editor'),
    );

    private readonly editId = toSignal(this.route.paramMap.pipe(map(p => p.get('dishId'))));
    protected readonly isEdit = computed(() => !!this.editId());
    /** The AI assist panel of edit mode (new recipes get the import screen instead). */
    protected readonly showAi = computed(() => this.canUseAi());
    /** In edit mode the AI assist card starts folded; one tap opens it. */
    protected readonly aiAssistOpen = signal(false);

    protected readonly form = this.fb.group({
        familyId: ['', Validators.required],
        title: ['', Validators.required],
        slug: ['', Validators.required],
        description: [''],
        visibility: ['public'],
        status: ['draft'],
        prepTime: [0], cookTime: [0], totalTime: [0],
        calories: [0], servings: [1],
        difficulty: ['easy'],
        priceAmount: [0], priceCurrency: ['UAH'],
        categories: [[] as DishCategory[]],
        notes: [''], sourceUrl: [''],
        images: this.fb.array<FormControl>([]),
        ingredients: this.fb.array<ReturnType<RecipeEditorPage['newIngredient']>>([]),
        steps: this.fb.array<ReturnType<RecipeEditorPage['newStep']>>([]),
        tags: this.fb.array<FormControl<string>>([]),
        taste: this.fb.group({ sweet: [0], salty: [0], sour: [0], bitter: [0], spicy: [0], umami: [0] }),
    });

    protected newTag = '';
    private slugTouched = false;

    /** familyId as a signal, so the permission checks below react to a family switch. */
    private readonly familyId = toSignal(this.form.controls.familyId.valueChanges, {
        initialValue: this.form.controls.familyId.value,
    });

    /** Whether the selected family lets this user publish publicly (owner/admin/super). */
    protected readonly canMakePublic = computed(() => {
        const familyId = this.familyId();
        return !!familyId && this.auth.canAdminFamily(familyId);
    });
    /** One family is the common case: then the family picker is just noise. */
    protected readonly showFamilyPicker = computed(() => this.familyService.editableFamilies().length > 1);

    get images(): FormArray { return this.form.controls.images; }
    get ingredients(): FormArray { return this.form.controls.ingredients; }
    get steps(): FormArray { return this.form.controls.steps; }
    get tags(): FormArray { return this.form.controls.tags; }

    constructor() {
        queueMicrotask(() => {
            const id = this.editId();
            if (id) {
                void this.loadDish(id);
            } else {
                this.initNewRecipe();
            }
        });
        // Leaving mid-import: drop the late answer instead of applying it somewhere else.
        this.destroyRef.onDestroy(() => this.importSeq++);
        // Families load in the background; pick the first one as soon as they arrive.
        effect(() => {
            const first = this.familyService.editableFamilies()[0];
            const control = this.form.controls.familyId;
            if (first && !control.value && !this.isEdit()) control.setValue(first.id, { emitEvent: false });
            if (first) control.updateValueAndValidity({ onlySelf: true });
        });
        // An estimated kcal-per-serving follows the servings (the dish itself stays the
        // same size), and an estimated total follows prep + cook, until the cook edits them.
        this.form.controls.servings.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((servings) => {
                if (this.applyingAi || !this.estimatedKcalTotal || !this.isEstimated('calories')) return;
                const count = Number(servings);
                if (count > 0) this.form.controls.calories.setValue(kcalPerServing(this.estimatedKcalTotal, count));
            });
        merge(this.form.controls.prepTime.valueChanges, this.form.controls.cookTime.valueChanges)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                if (this.applyingAi || !this.isEstimated('totalTime')) return;
                const { prepTime, cookTime } = this.form.getRawValue();
                this.form.controls.totalTime.setValue((Number(prepTime) || 0) + (Number(cookTime) || 0) + this.estimatedTimeExtra);
            });
    }

    /**
     * Start a fresh recipe on the source picker. An autosaved draft is offered there
     * ("continue") rather than forced open; ?manual=1 skips straight to the form and
     * ?url=... starts an import right away (share links, bookmarklets).
     */
    private initNewRecipe(): void {
        const params = this.route.snapshot.queryParamMap;
        const draft = this.drafts.load(null);
        if (draft && RecipeEditorPage.draftHasContent(draft.value)) {
            this.pendingDraft = draft as { savedAt: number; value: any };
            this.pendingDraftTitle.set(String((draft.value as any)?.title || '').trim() || 'Рецепт без назви');
        }
        this.resetForm();
        const sharedUrl = params.get('url') || params.get('text');
        if (params.get('manual')) {
            this.mode.set('form');
        } else if (sharedUrl && this.canUseAi()) {
            this.mode.set('start');
            // Drop ?url from the address bar so a reload never pays for a second import.
            void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
            void this.startImport({ kind: 'link', url: sharedUrl });
        } else {
            this.mode.set(this.canUseAi() || this.pendingDraft ? 'start' : 'form');
        }
        // Autosave locally on every change so a reload never loses work.
        this.form.valueChanges
            .pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                if (this.hydrating || this.saved || this.mode() !== 'form') return;
                const savedAt = this.drafts.save(null, this.form.getRawValue());
                this.draftSavedAt.set(savedAt);
            });
    }

    private static draftHasContent(value: any): boolean {
        const named = (list: any[], key: string) => (list ?? []).filter((item) => String(item?.[key] ?? '').trim()).length;
        return !!String(value?.title ?? '').trim() || named(value?.ingredients, 'name') > 1 || named(value?.steps, 'description') > 0;
    }

    /** An empty recipe with one blank ingredient and step, in the default family. */
    private resetForm(): void {
        const first = this.familyService.editableFamilies()[0];
        this.hydrate({ familyId: first?.id ?? '' });
        this.form.markAsPristine();
    }

    // ── Start screen actions ─────────────────────────────────────────────────

    protected resumeDraft(): void {
        if (!this.pendingDraft) return;
        this.hydrate(this.pendingDraft.value);
        this.draftSavedAt.set(this.pendingDraft.savedAt);
        this.restoredDraft.set(true);
        this.pendingDraft = null;
        this.pendingDraftTitle.set(null);
        this.mode.set('form');
    }

    protected startManual(): void {
        this.importResult.set(null);
        this.showReview.set(false);
        this.mode.set('form');
        queueMicrotask(() => (document.querySelector('#sec-basic input') as HTMLInputElement | null)?.focus());
    }

    /** Run an AI import; the start screen stays mounted underneath for errors. */
    protected async startImport(request: RecipeImportInput & { kind: ImportKind }): Promise<void> {
        const token = ++this.importSeq;
        this.importKind.set(request.kind);
        this.importPlatform.set(request.url ? detectPlatform(request.url) : request.kind === 'photo' ? 'photo' : 'text');
        this.importPreview.set(null);
        this.importPhotos.set(request.images ?? []);
        this.importText.set(request.text ?? '');
        this.importDone.set(false);
        this.importError.set(null);
        this.notRecipe.set(null);
        this.mode.set('importing');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (request.url) {
            // Free and fast: shows the post / page the AI is reading while it works.
            this.ai.previewImport(request.url)
                .then((preview) => token === this.importSeq && this.importPreview.set(preview))
                .catch(() => undefined);
        }
        try {
            const result = await this.ai.importRecipe({ url: request.url, text: request.text, images: request.images });
            if (token !== this.importSeq) return;
            if (result.meta) {
                this.aiDaily.set({ limit: result.meta.dailyLimit, used: result.meta.dailyUsed, remaining: result.meta.dailyRemaining });
            }
            if (!result.isRecipe) {
                this.notRecipe.set(result.notRecipeReason || 'Тут не знайшлося рецепта.');
                this.mode.set('start');
                return;
            }
            this.importDone.set(true);
            // Let the checklist tick through before the form replaces it.
            await new Promise((resolve) => setTimeout(resolve, 700));
            if (token !== this.importSeq) return;
            this.applyImport(result);
            this.mode.set('form');
            window.scrollTo({ top: 0 });
        } catch (error: any) {
            if (token !== this.importSeq) return;
            const payload = error?.error ?? {};
            const retryAfterMs = Number(payload.retryAfterMs);
            const wait = Number.isFinite(retryAfterMs) && retryAfterMs > 0
                ? ` Спробуйте через ${Math.ceil(retryAfterMs / 1000)} с.`
                : '';
            const offline = error?.status === 0 ? 'Немає з\'єднання з сервером. Перевірте інтернет і спробуйте ще раз.' : '';
            this.importError.set(offline || (payload.message || 'Не вдалося отримати рецепт. Спробуйте ще раз.') + wait);
            this.mode.set('start');
        }
    }

    protected cancelImport(): void {
        this.importSeq++;
        this.mode.set('start');
    }

    /** Fill the form from an import and pin each issue to the row it is about. */
    private applyImport(result: RecipeImportResult): void {
        const current = this.form.getRawValue();
        this.hydrate({
            familyId: current.familyId || this.familyService.editableFamilies()[0]?.id || '',
            visibility: current.visibility,
            title: result.title,
            slug: result.title ? slugify(result.title) : '',
            description: result.description,
            status: 'draft',
            prepTime: result.cookingTime.preparation,
            cookTime: result.cookingTime.cooking,
            totalTime: result.cookingTime.total,
            calories: result.calories,
            servings: result.servings || 1,
            difficulty: result.difficulty,
            categories: result.categories,
            notes: result.notes,
            sourceUrl: result.sourceUrl,
            images: result.images,
            ingredients: result.ingredients,
            steps: result.steps.map((s) => ({ description: s.description, duration: s.duration ?? null })),
            tags: result.tags,
            taste: result.taste,
            priceAmount: 0,
            priceCurrency: 'UAH',
        });
        this.setEstimates(result);
        for (const issue of result.issues) {
            if (issue.itemIndex == null) continue;
            const array = issue.field === 'ingredients' ? this.ingredients : issue.field === 'steps' ? this.steps : null;
            const control = array?.at(issue.itemIndex);
            if (control) this.rowIssues.set(control, issue);
        }
        this.importResult.set(result);
        this.showReview.set(true);
        this.pendingDraft = null;
        this.pendingDraftTitle.set(null);
        this.form.markAsDirty();
        this.draftSavedAt.set(this.drafts.save(null, this.form.getRawValue()));
    }

    /** Back to the source picker, after confirming if there is work to lose. */
    protected async restartImport(): Promise<void> {
        if (this.form.dirty) {
            const ok = await this.confirm.ask({
                title: 'Почати з іншого джерела?',
                message: 'Поточний рецепт у формі буде очищено.',
                confirmLabel: 'Почати заново',
                danger: true,
                icon: 'restart_alt',
            });
            if (!ok) return;
        }
        this.importResult.set(null);
        this.showReview.set(false);
        this.notRecipe.set(null);
        this.importError.set(null);
        this.drafts.clear(null);
        this.draftSavedAt.set(null);
        this.restoredDraft.set(false);
        this.resetForm();
        this.mode.set('start');
        window.scrollTo({ top: 0 });
    }

    // ── Issue markers on the form ────────────────────────────────────────────

    /** The import issue pinned to this ingredient/step row, until the cook edits it. */
    protected rowIssue(row: AbstractControl): ImportIssue | null {
        const issue = this.rowIssues.get(row);
        return issue && !row.dirty ? issue : null;
    }

    /** Section-level issues (time, servings, temperature...) that have not been edited yet. */
    protected sectionIssues(...fields: ImportIssue['field'][]): ImportIssue[] {
        const result = this.importResult();
        if (!result) return [];
        const touched: Partial<Record<ImportIssue['field'], boolean>> = {
            time: this.form.controls.prepTime.dirty || this.form.controls.cookTime.dirty || this.form.controls.totalTime.dirty,
            servings: this.form.controls.servings.dirty,
            // The estimates note goes once no number is still the AI's guess.
            estimates: ![...this.estimated()].some((field) => this.isEstimated(field)),
        };
        return result.issues.filter((issue) =>
            fields.includes(issue.field) && issue.itemIndex == null && !touched[issue.field]);
    }

    /** Icon of an issue note, matching the review panel. */
    protected issueIcon(issue: ImportIssue): string {
        switch (issue.severity) {
            case 'assumed': return 'lightbulb';
            case 'unclear': return 'help';
            case 'conflict': return 'warning';
            default: return 'error';
        }
    }

    // ── AI estimates ─────────────────────────────────────────────────────────

    /** True while a number is still the AI's estimate (the cook has not edited it). */
    protected isEstimated(field: EstimableField): boolean {
        return this.estimated().has(field) && !this.form.controls[field].dirty;
    }

    /**
     * Mark the numbers an AI result estimated. The AI's value replaces whatever was
     * there, so those controls count as untouched again. In edit mode, a mark from an
     * earlier update survives on a number this update left as it was.
     */
    private setEstimates(draft: AiRecipeDraft, before?: Record<string, unknown>): void {
        const value = this.form.getRawValue() as Record<EstimableField, number | null>;
        const next = new Set<EstimableField>();
        for (const field of draft.estimated ?? []) {
            if (!(Number(value[field]) > 0)) continue;
            next.add(field);
            this.form.controls[field].markAsPristine({ onlySelf: true });
        }
        if (before) {
            for (const field of this.estimated()) {
                if (Number(value[field]) > 0 && Number(before[field]) === Number(value[field])) next.add(field);
            }
        }
        const kcalTotal = draft.caloriesTotal ?? 0;
        this.estimatedKcalTotal = next.has('calories') ? (kcalTotal > 0 ? kcalTotal : this.estimatedKcalTotal) : 0;
        this.estimatedTimeExtra = Math.max(
            0,
            (Number(value.totalTime) || 0) - (Number(value.prepTime) || 0) - (Number(value.cookTime) || 0),
        );
        this.estimated.set(next);
    }

    private clearEstimates(): void {
        this.estimated.set(new Set());
        this.estimatedKcalTotal = 0;
        this.estimatedTimeExtra = 0;
    }

    protected jumpToIssue(issue: ImportIssue): void {
        let target: HTMLElement | null = null;
        if (issue.itemIndex != null && (issue.field === 'ingredients' || issue.field === 'steps')) {
            target = document.querySelector<HTMLElement>(`[data-row="${issue.field}-${issue.itemIndex}"]`);
        }
        if (issue.field === 'other') this.showExtra.set(true);
        target ??= document.getElementById(ISSUE_SECTION[issue.field] ?? 'sec-basic');
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.remove('flash');
        void target.offsetWidth;
        target.classList.add('flash');
        // The empty field is usually the point of the issue (a missing amount, a blank step).
        const field = target.querySelector<HTMLElement>('input:placeholder-shown, textarea:placeholder-shown')
            ?? target.querySelector<HTMLElement>('input, textarea');
        setTimeout(() => field?.focus({ preventScroll: true }), 450);
    }

    // ── Ingredients pasted as a list ─────────────────────────────────────────

    protected applyBulkIngredients(): void {
        const rows = this.bulkText
            .split(/\r?\n/)
            .map((line) => parseIngredientLine(line))
            .filter((row): row is NonNullable<ReturnType<typeof parseIngredientLine>> => !!row);
        if (!rows.length) {
            this.bulkOpen.set(false);
            return;
        }
        // Replace the lone empty starter row instead of leaving it dangling on top.
        const onlyBlank = this.ingredients.length === 1 && !String(this.ingredients.at(0).value?.name ?? '').trim();
        if (onlyBlank) this.ingredients.clear();
        rows.forEach((row) => this.ingredients.push(this.newIngredient(row)));
        this.form.markAsDirty();
        this.bulkText = '';
        this.bulkOpen.set(false);
        const n = rows.length;
        const word = n % 10 === 1 && n % 100 !== 11 ? 'інгредієнт' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'інгредієнти' : 'інгредієнтів';
        this.toast.show(`Додано ${n} ${word}`, 'success');
    }

    /**
     * Rebuild the whole form (scalars + arrays) from a stored raw value.
     * All mutations use { emitEvent: false } so hydration never triggers the
     * debounced autosave (which would otherwise resurrect a cleared draft).
     */
    private hydrate(value: any): void {
        this.hydrating = true;
        // A rebuilt form starts with no AI marks; an AI apply re-adds its own afterwards.
        this.clearEstimates();
        this.slugTouched = !!value?.slug;
        const silent = { emitEvent: false };
        this.form.patchValue({
            familyId: value?.familyId ?? '',
            title: value?.title ?? '',
            slug: value?.slug ?? '',
            description: value?.description ?? '',
            visibility: value?.visibility ?? 'public',
            status: value?.status ?? 'draft',
            prepTime: value?.prepTime ?? 0,
            cookTime: value?.cookTime ?? 0,
            totalTime: value?.totalTime ?? 0,
            calories: value?.calories ?? 0,
            servings: value?.servings ?? 1,
            difficulty: value?.difficulty ?? 'easy',
            priceAmount: value?.priceAmount ?? 0,
            priceCurrency: value?.priceCurrency ?? 'UAH',
            categories: Array.isArray(value?.categories) ? [...value.categories] : [],
            notes: value?.notes ?? '',
            sourceUrl: value?.sourceUrl ?? '',
            taste: value?.taste ?? { sweet: 0, salty: 0, sour: 0, bitter: 0, spicy: 0, umami: 0 },
        }, silent);
        this.images.clear(silent);
        (value?.images ?? []).forEach((img: unknown) => this.images.push(this.fb.control(img), silent));
        this.ingredients.clear(silent);
        (value?.ingredients ?? []).forEach((ing: any) => this.ingredients.push(this.newIngredient(ing), silent));
        this.steps.clear(silent);
        (value?.steps ?? []).forEach((s: any) => this.steps.push(this.newStep({ description: s?.description ?? '', duration: s?.duration ?? null }), silent));
        this.tags.clear(silent);
        (value?.tags ?? []).forEach((tag: string) => this.tags.push(this.fb.control(tag, { nonNullable: true }), silent));
        if (this.ingredients.length === 0) this.ingredients.push(this.newIngredient(), silent);
        if (this.steps.length === 0) this.steps.push(this.newStep(), silent);
        // Silent patches skip valueChanges; refresh the familyId signal explicitly.
        this.form.controls.familyId.updateValueAndValidity({ onlySelf: true });
        this.hydrating = false;
    }

    /** Discard the restored local draft and go back to the source picker. */
    protected async startFresh(): Promise<void> {
        const ok = await this.confirm.ask({
            title: 'Почати заново?',
            message: 'Відновлену чернетку буде видалено, а форму очищено.',
            confirmLabel: 'Очистити',
            danger: true,
            icon: 'restart_alt',
        });
        if (!ok) return;
        this.drafts.clear(null);
        this.draftSavedAt.set(null);
        this.restoredDraft.set(false);
        this.importResult.set(null);
        this.showReview.set(false);
        this.resetForm();
        if (this.canUseAi()) this.mode.set('start');
    }

    /**
     * New recipe: generate a draft and fill the empty form.
     * Existing recipe: send the current recipe as context, apply the update, and
     * report the diff. Nothing is persisted until the user presses «Зберегти», and
     * the pre-update snapshot stays available for undo.
     */
    protected async generateWithAi(): Promise<void> {
        const text = this.aiText().trim();
        if (text.length < 10) {
            this.aiError.set('Опишіть страву докладніше (мінімум кілька слів).');
            return;
        }
        this.aiLoading.set(true);
        this.aiError.set(null);
        this.aiWarnings.set([]);
        // Undo state is deliberately NOT cleared here: if this call fails, the previous
        // update stays applied and must stay revertible.
        let applied = false;
        try {
            const draft = await this.ai.parseRecipe(this.isEdit() ? this.composeEditPrompt(text) : text);
            if (this.isEdit()) {
                const before = this.form.getRawValue();
                const beforeJson = JSON.stringify(before);
                this.applyAiUpdate(draft, before);
                const afterJson = JSON.stringify(this.form.getRawValue());
                this.aiChanges.set(this.diffAgainst(before));
                // Reversibility keys off the raw form, never off the (lossy) changelog —
                // otherwise a rewrite the diff cannot see would be silent and permanent.
                applied = afterJson !== beforeJson;
                if (applied) {
                    this.aiUndoSnapshot = before;
                    this.aiAppliedFingerprint = afterJson;
                    this.aiCanUndo.set(true);
                    this.form.markAsDirty();
                }
            } else {
                this.applyAiDraft(draft);
            }
            this.aiWarnings.set(draft.warnings ?? []);
            if (draft.meta) {
                this.aiDaily.set({
                    limit: draft.meta.dailyLimit,
                    used: draft.meta.dailyUsed,
                    remaining: draft.meta.dailyRemaining,
                });
            }
            this.toast.success(this.isEdit()
                ? (applied
                    ? 'Рецепт оновлено ✨ Перевірте зміни і збережіть'
                    : 'AI не запропонував змін')
                : 'Рецепт згенеровано ✨ Перевірте і збережіть');
        } catch (error: any) {
            const payload = error?.error ?? {};
            const retryAfterMs = Number(payload.retryAfterMs);
            const wait = Number.isFinite(retryAfterMs) && retryAfterMs > 0
                ? ` Спробуйте через ${Math.ceil(retryAfterMs / 1000)} с.`
                : '';
            this.aiError.set((payload.message || 'Не вдалося згенерувати рецепт. Спробуйте ще раз.') + wait);
        } finally {
            this.aiLoading.set(false);
        }
    }

    /**
     * Serialize the recipe currently in the form into a single-line description the
     * parse endpoint understands, then append the author's request. Only the context
     * is truncated to fit the backend's input cap — the author's text is never cut.
     */
    private composeEditPrompt(userText: string): string {
        const v = this.form.getRawValue();
        const parts: string[] = [];
        if (v.title) parts.push(`Страва: ${v.title}.`);
        if (v.description) parts.push(`Опис: ${v.description}`);
        if (v.servings) parts.push(`Порцій: ${v.servings}.`);
        if (v.prepTime || v.cookTime || v.totalTime) {
            parts.push(`Час: підготовка ${v.prepTime ?? 0} хв, готування ${v.cookTime ?? 0} хв, разом ${v.totalTime ?? 0} хв.`);
        }
        if (v.calories) parts.push(`Калорійність: ${v.calories} ккал.`);
        if (v.difficulty) parts.push(`Складність: ${DIFFICULTY_LABELS[v.difficulty as DishDifficulty]}.`);
        const categories = (v.categories ?? []).map(c => CATEGORY_LABELS[c]).filter(Boolean);
        if (categories.length) parts.push(`Категорії: ${categories.join(', ')}.`);
        const ingredients = this.ingredients.value
            .filter((i: any) => i?.name?.trim())
            .map((i: any) => {
                const line = [i.amount, i.unit, i.name].filter(Boolean).join(' ').trim();
                return i.optional ? `${line} (за бажанням)` : line;
            });
        if (ingredients.length) parts.push(`Інгредієнти: ${ingredients.join('; ')}.`);
        const steps = this.steps.value
            .filter((s: any) => s?.description?.trim())
            .map((s: any, i: number) => `${i + 1}) ${s.description}`);
        if (steps.length) parts.push(`Кроки: ${steps.join(' ')}`);
        if (this.tags.length) parts.push(`Теги: ${this.tags.value.join(', ')}.`);
        const taste = ALL_TASTE_KEYS
            .filter(k => (v.taste as any)?.[k])
            .map(k => `${TASTE_LABELS[k].toLowerCase()} ${(v.taste as any)[k]}`);
        if (taste.length) parts.push(`Смаковий профіль (0-5): ${taste.join(', ')}.`);
        if (v.notes) parts.push(`Нотатки: ${v.notes}`);

        const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
        let context = collapse(parts.join(' '));
        const budget = AI_MAX_INPUT - userText.length - 120;
        if (context.length > budget) context = context.slice(0, Math.max(0, budget));
        return collapse(`${context} Додатково від автора: ${userText}`);
    }

    /**
     * Write the whole AI update into the form. Deliberately never touches title, slug,
     * images, price, sourceUrl, visibility or familyId — the recipe's identity, photos
     * and public URL stay exactly as the author left them.
     */
    private applyAiUpdate(draft: AiRecipeDraft, before: Record<string, unknown>): void {
        // The AI's own writes must not trigger the estimate follow rules mid-patch.
        this.applyingAi = true;
        try {
            this.form.patchValue({
                description: draft.description,
                notes: draft.notes,
                prepTime: draft.cookingTime.preparation,
                cookTime: draft.cookingTime.cooking,
                totalTime: draft.cookingTime.total,
                calories: draft.calories,
                // The model may omit servings (the API then sends 0) — keep what we have.
                servings: draft.servings || this.form.controls.servings.value || 1,
                difficulty: draft.difficulty,
                categories: [...draft.categories],
                taste: draft.taste,
            });
            this.ingredients.clear();
            draft.ingredients.forEach(ing => this.ingredients.push(this.newIngredient(ing)));
            if (this.ingredients.length === 0) this.ingredients.push(this.newIngredient());
            this.steps.clear();
            draft.steps.forEach(s => this.steps.push(this.newStep({ description: s.description, duration: s.duration ?? null })));
            if (this.steps.length === 0) this.steps.push(this.newStep());
            this.tags.clear();
            draft.tags.forEach(tag => this.tags.push(this.fb.control(tag, { nonNullable: true })));
        } finally {
            this.applyingAi = false;
        }
        this.setEstimates(draft, before);
    }

    /** Roll the form back to the snapshot taken before the AI update. */
    protected async undoAiUpdate(): Promise<void> {
        if (!this.aiUndoSnapshot) return;
        // Undo restores the whole form, so anything typed after the AI update goes too.
        if (JSON.stringify(this.form.getRawValue()) !== this.aiAppliedFingerprint) {
            const ok = await this.confirm.ask({
                title: 'Повернути попередню версію?',
                message: 'Ви редагували рецепт після оновлення AI. Повернення відкине і ці правки теж.',
                confirmLabel: 'Повернути',
                danger: true,
                icon: 'undo',
            });
            if (!ok) return;
        }
        this.hydrate(this.aiUndoSnapshot);
        this.aiUndoSnapshot = null;
        this.aiAppliedFingerprint = null;
        this.aiCanUndo.set(false);
        this.aiChanges.set([]);
        this.toast.show('Зміни скасовано', 'info');
    }

    private static ingredientLine(i: any): string {
        const line = [i?.amount, i?.unit, i?.name].filter(Boolean).join(' ').trim();
        return i?.optional ? `${line} (за бажанням)` : line;
    }

    /** Includes duration — applyAiUpdate writes it, so the diff has to see it. */
    private static stepLine(s: any): string {
        const description = RecipeEditorPage.clip(s?.description, 70);
        return s?.duration ? `${description} · ${s.duration} хв` : description;
    }

    private static clip(text: string | null | undefined, max = 90): string {
        const value = (text ?? '').trim();
        return value.length > max ? `${value.slice(0, max)}…` : value;
    }

    /** Compare the form against a pre-update snapshot and describe what changed. */
    private diffAgainst(before: any): AiChange[] {
        const after = this.form.getRawValue();
        const changes: AiChange[] = [];

        // Compare the FULL text and clip only for display, or an edit past the cutoff
        // would be reported as "no change" while the form already holds the rewrite.
        const text = (label: string, b: any, a: any) => {
            const from = (b ?? '').toString().trim();
            const to = (a ?? '').toString().trim();
            if (from === to) return;
            changes.push({
                label,
                before: from ? RecipeEditorPage.clip(from) : '—',
                after: to ? RecipeEditorPage.clip(to) : '—',
            });
        };

        // Numbers: null, undefined and 0 all mean "not set", so they must not diff.
        // "≈" marks a value the AI estimated rather than took from the request.
        const num = (label: string, field: EstimableField, b: any, a: any, suffix = '') => {
            const from = Number(b) || 0, to = Number(a) || 0;
            if (from === to) return;
            const approx = this.estimated().has(field) ? '≈ ' : '';
            changes.push({
                label,
                before: from ? `${from}${suffix}` : '—',
                after: to ? `${approx}${to}${suffix}` : '—',
            });
        };

        text('Опис', before.description, after.description);
        text('Нотатки', before.notes, after.notes);
        num('Підготовка', 'prepTime', before.prepTime, after.prepTime, ' хв');
        num('Готування', 'cookTime', before.cookTime, after.cookTime, ' хв');
        num('Загальний час', 'totalTime', before.totalTime, after.totalTime, ' хв');
        num('Калорійність', 'calories', before.calories, after.calories, ' ккал');
        num('Порції', 'servings', before.servings, after.servings);
        if (before.difficulty !== after.difficulty) {
            changes.push({
                label: 'Складність',
                before: DIFFICULTY_LABELS[before.difficulty as DishDifficulty] ?? '—',
                after: DIFFICULTY_LABELS[after.difficulty as DishDifficulty] ?? '—',
            });
        }

        const list = (
            label: string,
            beforeItems: string[],
            afterItems: string[],
            unit: string,
        ) => {
            const added = afterItems.filter(x => !beforeItems.includes(x));
            const removed = beforeItems.filter(x => !afterItems.includes(x));
            // Set membership alone misses two real changes: a pure reorder (buildDish
            // derives step `order` from array position) and duplicate-count changes.
            const countChanged = beforeItems.length !== afterItems.length;
            const reordered = !countChanged && beforeItems.some((item, i) => afterItems[i] !== item);
            if (!added.length && !removed.length && !countChanged && !reordered) return;
            changes.push({
                label,
                before: `${beforeItems.length} ${unit}`,
                after: `${afterItems.length} ${unit}${reordered ? ' · порядок змінено' : ''}`,
                added: added.length ? added : undefined,
                removed: removed.length ? removed : undefined,
            });
        };

        list(
            'Інгредієнти',
            (before.ingredients ?? []).filter((i: any) => i?.name?.trim()).map(RecipeEditorPage.ingredientLine),
            (after.ingredients ?? []).filter((i: any) => i?.name?.trim()).map(RecipeEditorPage.ingredientLine),
            'поз.',
        );
        list(
            'Кроки',
            (before.steps ?? []).filter((s: any) => s?.description?.trim()).map(RecipeEditorPage.stepLine),
            (after.steps ?? []).filter((s: any) => s?.description?.trim()).map(RecipeEditorPage.stepLine),
            'шт.',
        );
        list(
            'Категорії',
            (before.categories ?? []).map((c: DishCategory) => CATEGORY_LABELS[c] ?? c),
            (after.categories ?? []).map((c: DishCategory) => CATEGORY_LABELS[c] ?? c),
            'шт.',
        );
        list('Теги', before.tags ?? [], after.tags ?? [], 'шт.');

        const tasteChanged = ALL_TASTE_KEYS
            .filter(key => (before.taste?.[key] ?? 0) !== (after.taste?.[key] ?? 0))
            .map(key => `${TASTE_LABELS[key]}: ${before.taste?.[key] ?? 0} → ${after.taste?.[key] ?? 0}`);
        if (tasteChanged.length) {
            const fmt = (source: any) => ALL_TASTE_KEYS
                .filter(key => source?.[key]).map(key => `${TASTE_LABELS[key]} ${source[key]}`).join(', ') || '—';
            changes.push({
                label: 'Смаковий профіль',
                before: fmt(before.taste),
                after: fmt(after.taste),
                added: tasteChanged,
            });
        }

        return changes;
    }

    /** Fill the editor form from an AI draft (keeps the family, photos, price and source). */
    private applyAiDraft(draft: AiRecipeDraft): void {
        // hydrate() rebuilds everything it is given and defaults the rest, so anything
        // the user already entered has to be carried across explicitly.
        const current = this.form.getRawValue();
        const images = this.images.value;
        this.hydrate({
            familyId: current.familyId,
            images,
            priceAmount: current.priceAmount,
            priceCurrency: current.priceCurrency,
            sourceUrl: current.sourceUrl,
            // Never silently re-publish a recipe the author marked family-only.
            visibility: current.visibility,
            title: draft.title,
            slug: draft.title ? slugify(draft.title) : '',
            description: draft.description,
            status: 'draft',
            prepTime: draft.cookingTime.preparation,
            cookTime: draft.cookingTime.cooking,
            totalTime: draft.cookingTime.total,
            calories: draft.calories,
            servings: draft.servings || 1,
            difficulty: draft.difficulty,
            categories: draft.categories,
            notes: draft.notes,
            ingredients: draft.ingredients,
            steps: draft.steps.map((s) => ({ description: s.description, duration: s.duration ?? null })),
            tags: draft.tags,
            taste: draft.taste,
        });
        this.setEstimates(draft);
        this.form.markAsDirty();
        // hydrate() is silent, so the debounced autosave never sees the AI result —
        // persist it here or a reload right after generating would lose everything.
        this.draftSavedAt.set(this.drafts.save(null, this.form.getRawValue()));
    }

    private newIngredient(value?: { name: string; amount: string; unit: string; optional: boolean }) {
        return this.fb.group({
            name: [value?.name ?? '', Validators.required],
            amount: [value?.amount ?? ''],
            unit: [value?.unit ?? ''],
            optional: [value?.optional ?? false],
        });
    }

    private newStep(value?: { description: string; duration: number | null }) {
        return this.fb.group({
            description: [value?.description ?? '', Validators.required],
            duration: [value?.duration ?? null],
        });
    }

    private async loadDish(id: string): Promise<void> {
        // Always start from the server's copy: the catalog list can come from the
        // local cache, and saving a stale copy would undo someone's newer edits.
        let dish: Dish | null | undefined = await this.dishService.fetchDishById(id).catch(() => null);
        if (!dish) {
            await this.dishService.reload();
            dish = this.dishService.allDishes().find(d => d.id === id);
        }
        if (!dish) {
            this.toast.show('Рецепт не знайдено', 'error');
            void this.router.navigate(['/']);
            return;
        }
        this.slugTouched = true;
        this.form.patchValue({
            familyId: dish.familyId,
            title: dish.title,
            slug: dish.slug,
            description: dish.description,
            visibility: dish.visibility,
            status: dish.status,
            prepTime: dish.cookingTime.preparation,
            cookTime: dish.cookingTime.cooking,
            totalTime: dish.cookingTime.total,
            calories: dish.calories,
            servings: dish.servings,
            difficulty: dish.difficulty,
            priceAmount: dish.price.amount,
            priceCurrency: dish.price.currency,
            categories: [...dish.categories],
            notes: dish.notes,
            sourceUrl: dish.sourceUrl,
            taste: dish.tasteProfile,
        });
        dish.images.forEach(image => this.images.push(this.fb.control(image)));
        dish.ingredients.forEach(ing => this.ingredients.push(this.newIngredient(ing)));
        dish.steps.forEach(step => this.steps.push(this.newStep({ description: step.description, duration: step.duration ?? null })));
        dish.tags.forEach(tag => this.tags.push(this.fb.control(tag, { nonNullable: true })));
    }

    protected onTitleInput(value: string): void {
        if (!this.slugTouched) {
            this.form.controls.slug.setValue(slugify(value));
        }
    }

    protected markSlugTouched(): void { this.slugTouched = true; }

    protected toggleCategory(category: DishCategory): void {
        const current = this.form.controls.categories.value ?? [];
        this.form.controls.categories.setValue(
            current.includes(category) ? current.filter(c => c !== category) : [...current, category],
        );
        this.form.markAsDirty();
    }

    protected isCategoryActive(category: DishCategory): boolean {
        return (this.form.controls.categories.value ?? []).includes(category);
    }

    protected addIngredient(): void { this.ingredients.push(this.newIngredient()); this.form.markAsDirty(); }
    protected removeIngredient(i: number): void { this.ingredients.removeAt(i); this.form.markAsDirty(); }
    protected addStep(): void { this.steps.push(this.newStep()); this.form.markAsDirty(); }
    protected removeStep(i: number): void { this.steps.removeAt(i); this.form.markAsDirty(); }

    protected addTag(): void {
        const value = this.newTag.trim();
        if (value && !this.tags.value.includes(value)) {
            this.tags.push(this.fb.control(value, { nonNullable: true }));
            this.form.markAsDirty();
        }
        this.newTag = '';
    }
    protected removeTag(i: number): void { this.tags.removeAt(i); this.form.markAsDirty(); }

    protected async onImageSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files ?? []);
        if (!files.length) return;
        this.uploading.set(true);
        for (const file of files) {
            try {
                // Phone photos are 4-12 MB; a 2000 px JPEG uploads 10x faster and looks the same.
                const upload = await compressImage(file, 2000, 0.86).then((image) => image.blob).catch(() => file);
                const { url } = await this.uploadService.uploadImage(upload);
                this.images.push(this.fb.control({ url, alt: this.form.controls.title.value ?? '', isPrimary: this.images.length === 0 }));
            } catch {
                this.toast.show('Не вдалося завантажити фото', 'error');
            }
        }
        this.uploading.set(false);
        input.value = '';
        this.form.markAsDirty();
    }

    protected setPrimary(index: number): void {
        this.images.controls.forEach((control, i) =>
            control.setValue({ ...control.value, isPrimary: i === index }));
        this.form.markAsDirty();
    }
    protected removeImage(index: number): void {
        const wasPrimary = this.images.at(index).value.isPrimary;
        this.images.removeAt(index);
        if (wasPrimary && this.images.length > 0) {
            this.images.at(0).setValue({ ...this.images.at(0).value, isPrimary: true });
        }
        this.form.markAsDirty();
    }

    protected imageUrl(index: number): string { return cld(this.images.at(index).value.url, 'f_auto,q_auto,c_fill,w_400'); }
    protected imageIsPrimary(index: number): boolean { return this.images.at(index).value.isPrimary; }

    private buildDish(status: 'draft' | 'published'): Partial<Dish> {
        const v = this.form.getRawValue();
        return {
            familyId: v.familyId!,
            title: v.title!,
            slug: v.slug!,
            description: v.description ?? '',
            visibility: (this.canMakePublic() ? v.visibility : 'family') as Dish['visibility'],
            status,
            images: this.images.value,
            ingredients: this.ingredients.value,
            steps: this.steps.value.map((s: { description: string; duration: number | null }, i: number) => ({
                order: i + 1, description: s.description, duration: s.duration ?? undefined,
            })),
            cookingTime: { preparation: v.prepTime ?? 0, cooking: v.cookTime ?? 0, total: v.totalTime ?? 0 },
            calories: v.calories ?? 0,
            servings: v.servings ?? 1,
            difficulty: v.difficulty as Dish['difficulty'],
            price: { amount: v.priceAmount ?? 0, currency: v.priceCurrency ?? 'UAH' },
            categories: v.categories ?? [],
            tags: this.tags.value,
            tasteProfile: v.taste as Dish['tasteProfile'],
            notes: v.notes ?? '',
            sourceUrl: v.sourceUrl ?? '',
        };
    }

    protected async save(status: 'draft' | 'published'): Promise<void> {
        if (this.form.controls.title.invalid || this.form.controls.familyId.invalid) {
            this.form.markAllAsTouched();
            this.toast.show('Заповніть назву та оберіть родину', 'error');
            return;
        }
        this.saving.set(true);
        try {
            const payload = this.buildDish(status);
            let dish: Dish;
            if (this.isEdit()) {
                dish = await this.dishService.updateDish(this.editId()!, payload);
            } else {
                dish = await this.dishService.createDish(payload);
            }
            this.saved = true;
            this.drafts.clear(null);
            this.toast.show(status === 'published' ? 'Опубліковано ✨' : 'Чернетку збережено', 'success');
            void this.router.navigate(['/dish', dish.slug]);
        } catch (error: any) {
            this.toast.show(`Помилка: ${error?.message ?? 'не вдалося зберегти'}`, 'error');
        } finally {
            this.saving.set(false);
        }
    }

    protected cancel(): void {
        void this.router.navigate(this.isEdit() ? ['/dish', this.form.controls.slug.value] : ['/']);
    }

    /** Delete the current recipe (edit mode) after a confirmation dialog. */
    protected async remove(): Promise<void> {
        const id = this.editId();
        if (!id || this.deleting()) return;
        const ok = await this.confirm.ask({
            title: 'Видалити рецепт?',
            message: `«${this.form.controls.title.value || 'Цей рецепт'}» буде видалено назавжди разом із фото, інгредієнтами та кроками. Цю дію не можна скасувати.`,
            confirmLabel: 'Видалити',
            danger: true,
            icon: 'delete',
        });
        if (!ok) return;
        this.deleting.set(true);
        try {
            await this.dishService.deleteDish(id);
            this.saved = true;
            this.drafts.clear(id);
            this.toast.show('Рецепт видалено', 'success');
            void this.router.navigate(['/']);
        } catch (error: any) {
            this.toast.show(`Не вдалося видалити: ${error?.message ?? 'помилка'}`, 'error');
        } finally {
            this.deleting.set(false);
        }
    }

    canDeactivate(): boolean | Promise<boolean> {
        // New-recipe work is autosaved locally, so leaving never loses it.
        if (this.saved || !this.form.dirty || !this.isEdit()) return true;
        return this.confirm.ask({
            title: 'Вийти без збереження?',
            message: 'Незбережені зміни цього рецепта буде втрачено.',
            confirmLabel: 'Вийти',
            danger: true,
            icon: 'logout',
        });
    }
}
