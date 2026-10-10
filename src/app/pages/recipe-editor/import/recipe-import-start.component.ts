import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    computed,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { RecipeImportInput } from '../../../core/services/ai.service';
import { compressImage, UnsupportedImageError } from '../../../core/utils/image-compress';
import { PLATFORM_LABELS, PlatformIconComponent, detectPlatform, extractUrl } from './platform-icon.component';

type Panel = 'link' | 'photo' | 'text';

interface PickedPhoto {
    id: number;
    dataUrl: string;
}

const MAX_PHOTOS = 4;
/** All photos together, as data URLs (the API accepts 4 MB bodies). */
const MAX_PAYLOAD_CHARS = 3_200_000;
const SUPPORTED: { key: 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'telegram' | 'website'; label: string }[] = [
    { key: 'instagram', label: 'Instagram' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'telegram', label: 'Telegram' },
    { key: 'website', label: 'Сайти' },
];

/**
 * The first screen of "new recipe": AI import first (a link, photos, or a few
 * words / voice), with manual entry one tap away for people who prefer typing.
 */
@Component({
    selector: 'app-recipe-import-start',
    imports: [PlatformIconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './recipe-import-start.component.html',
    styleUrl: './recipe-import-start.component.scss',
    host: {
        '(dragover)': 'onDragOver($event)',
        '(dragleave)': 'dragging.set(false)',
        '(drop)': 'onDrop($event)',
        '(document:paste)': 'onPaste($event)',
    },
})
export class RecipeImportStartComponent {
    private readonly destroyRef = inject(DestroyRef);

    /** Message from a failed attempt (network, private post...). */
    readonly error = input<string | null>(null);
    /** The model read the source but found no recipe in it. */
    readonly notRecipe = input<string | null>(null);
    /** Title of an autosaved draft that can be resumed, if any. */
    readonly draftTitle = input<string | null>(null);
    readonly quota = input<{ remaining: number | null; limit: number | null } | null>(null);
    readonly aiAvailable = input(true);

    readonly start = output<RecipeImportInput & { kind: Panel }>();
    readonly manual = output<void>();
    readonly resumeDraft = output<void>();

    protected readonly supported = SUPPORTED;
    protected readonly labels = PLATFORM_LABELS;
    protected readonly panel = signal<Panel>('link');
    protected readonly link = signal('');
    protected readonly photos = signal<PickedPhoto[]>([]);
    protected readonly photoNote = signal('');
    protected readonly text = signal('');
    protected readonly preparing = signal(false);
    protected readonly localError = signal<string | null>(null);
    protected readonly dragging = signal(false);
    protected readonly listening = signal(false);
    protected readonly speechSupported =
        typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    protected readonly detected = computed(() => {
        const url = extractUrl(this.link());
        return url ? detectPlatform(url) : null;
    });
    protected readonly linkValid = computed(() => !!extractUrl(this.link()));
    protected readonly shownError = computed(() => this.localError() || this.error());

    private readonly linkInput = viewChild<ElementRef<HTMLInputElement>>('linkInput');
    private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
    private recognition: any = null;
    private photoSeq = 0;

    constructor() {
        this.destroyRef.onDestroy(() => this.stopListening());
    }

    protected setPanel(panel: Panel): void {
        this.localError.set(null);
        this.panel.set(panel);
        if (panel === 'photo' && !this.photos().length) this.fileInput()?.nativeElement.click();
        if (panel === 'link') queueMicrotask(() => this.linkInput()?.nativeElement.focus());
    }

    // ── Link ───────────────────────────────────────────────────────────────

    protected async pasteFromClipboard(): Promise<void> {
        this.localError.set(null);
        try {
            const clip = await navigator.clipboard.readText();
            const url = extractUrl(clip);
            if (url) {
                this.link.set(url);
                // Pressing "paste" with a link on the clipboard means "use this one".
                this.submitLink();
                return;
            }
            this.localError.set('У буфері обміну немає посилання. Скопіюйте адресу допису і спробуйте ще раз.');
        } catch {
            this.linkInput()?.nativeElement.focus();
        }
    }

    protected submitLink(): void {
        const url = extractUrl(this.link());
        if (!url) {
            this.localError.set('Вставте посилання на допис, відео або сторінку з рецептом.');
            return;
        }
        this.localError.set(null);
        this.start.emit({ kind: 'link', url });
    }

    // ── Photos ─────────────────────────────────────────────────────────────

    protected openPicker(): void {
        this.fileInput()?.nativeElement.click();
    }

    protected async onFiles(event: Event): Promise<void> {
        const inputEl = event.target as HTMLInputElement;
        const files = Array.from(inputEl.files ?? []);
        inputEl.value = '';
        await this.addPhotos(files);
    }

    private async addPhotos(files: File[]): Promise<void> {
        const images = files.filter((file) => file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name));
        if (!images.length) return;
        this.panel.set('photo');
        this.localError.set(null);
        const room = MAX_PHOTOS - this.photos().length;
        if (room <= 0) {
            this.localError.set(`Можна додати до ${MAX_PHOTOS} фото.`);
            return;
        }
        this.preparing.set(true);
        try {
            for (const file of images.slice(0, room)) {
                const { dataUrl } = await compressImage(file, 1600, 0.82);
                this.photos.update((list) => [...list, { id: ++this.photoSeq, dataUrl }]);
            }
            if (images.length > room) this.localError.set(`Додано лише ${room} фото - більше не помістилось.`);
        } catch (error) {
            this.localError.set(
                error instanceof UnsupportedImageError ? error.message : 'Не вдалося відкрити фото. Спробуйте інше.',
            );
        } finally {
            this.preparing.set(false);
        }
    }

    protected removePhoto(id: number): void {
        this.photos.update((list) => list.filter((photo) => photo.id !== id));
    }

    protected async submitPhotos(): Promise<void> {
        let images = this.photos().map((photo) => photo.dataUrl);
        if (!images.length) {
            this.openPicker();
            return;
        }
        // Requests over ~4 MB never reach the API (and fail without a readable error),
        // so detailed pages are re-encoded smaller until all photos fit together.
        for (const [side, quality] of [[1280, 0.76], [1024, 0.7], [860, 0.66]] as const) {
            if (images.reduce((sum, image) => sum + image.length, 0) <= MAX_PAYLOAD_CHARS) break;
            this.preparing.set(true);
            try {
                images = await Promise.all(
                    images.map(async (image) => (await compressImage(await (await fetch(image)).blob(), side, quality)).dataUrl),
                );
            } finally {
                this.preparing.set(false);
            }
        }
        const note = this.photoNote().trim();
        this.start.emit({ kind: 'photo', images, ...(note ? { text: note } : {}) });
    }

    protected onDragOver(event: DragEvent): void {
        if (!event.dataTransfer?.types?.includes('Files')) return;
        event.preventDefault();
        this.dragging.set(true);
    }

    protected onDrop(event: DragEvent): void {
        if (!event.dataTransfer?.files?.length) return;
        event.preventDefault();
        this.dragging.set(false);
        void this.addPhotos(Array.from(event.dataTransfer.files));
    }

    /** Ctrl+V of a screenshot anywhere on the screen adds it as a photo. */
    protected onPaste(event: ClipboardEvent): void {
        const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith('image/'));
        if (files.length) {
            event.preventDefault();
            void this.addPhotos(files);
        }
    }

    // ── Text and voice ─────────────────────────────────────────────────────

    protected submitText(): void {
        const text = this.text().trim();
        if (text.length < 10) {
            this.localError.set('Опишіть страву трохи докладніше: що в ній є і як готувати.');
            return;
        }
        this.stopListening();
        this.start.emit({ kind: 'text', text });
    }

    protected toggleVoice(): void {
        if (this.listening()) {
            this.stopListening();
            return;
        }
        const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!Recognition) return;
        const recognition = new Recognition();
        recognition.lang = 'uk-UA';
        recognition.continuous = true;
        recognition.interimResults = true;
        const base = this.text().trim();
        recognition.onresult = (event: any) => {
            let finalText = '';
            let interim = '';
            for (let i = 0; i < event.results.length; i++) {
                const chunk = event.results[i][0]?.transcript ?? '';
                if (event.results[i].isFinal) finalText += chunk;
                else interim += chunk;
            }
            this.text.set([base, finalText, interim].filter(Boolean).join(' ').replace(/\s+/g, ' '));
        };
        recognition.onerror = (event: any) => {
            if (event?.error === 'not-allowed') this.localError.set('Дозвольте доступ до мікрофона, щоб диктувати.');
            this.listening.set(false);
        };
        recognition.onend = () => this.listening.set(false);
        try {
            recognition.start();
            this.recognition = recognition;
            this.listening.set(true);
            this.localError.set(null);
        } catch {
            this.listening.set(false);
        }
    }

    private stopListening(): void {
        try {
            this.recognition?.stop();
        } catch {
            /* already stopped */
        }
        this.recognition = null;
        this.listening.set(false);
    }
}
