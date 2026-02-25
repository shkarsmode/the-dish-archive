import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnDestroy,
    Output,
    signal,
    ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface ImageEditorResult {
    blob: Blob;
    width: number;
    height: number;
}

/**
 * Canvas-based image editor: crop, resize, rotate, flip.
 * Mobile-first, touch-friendly with pinch-to-zoom on crop area.
 */
@Component({
    selector: 'app-image-editor',
    standalone: true,
    imports: [FormsModule],
    template: `
        <div class="ie-overlay" (click)="onBackdropClick($event)">
            <div class="ie-modal" (click)="$event.stopPropagation()">

                <!-- Header -->
                <div class="ie-header">
                    <h3>
                        <span class="material-symbols-outlined">tune</span>
                        Редактор зображення
                    </h3>
                    <button class="ie-close" (click)="cancel.emit()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                <!-- Canvas area -->
                <div class="ie-canvas-wrap" #canvasWrap
                    (pointerdown)="onPointerDown($event)"
                    (pointermove)="onPointerMove($event)"
                    (pointerup)="onPointerUp($event)"
                    (pointercancel)="onPointerUp($event)">
                    <canvas #editorCanvas></canvas>

                    <!-- Crop overlay -->
                    @if (mode() === 'crop') {
                        <div class="ie-crop-overlay">
                            <div class="ie-crop-box"
                                [style.left.px]="cropX()"
                                [style.top.px]="cropY()"
                                [style.width.px]="cropW()"
                                [style.height.px]="cropH()">
                                <div class="ie-crop-handle tl" data-handle="tl"></div>
                                <div class="ie-crop-handle tr" data-handle="tr"></div>
                                <div class="ie-crop-handle bl" data-handle="bl"></div>
                                <div class="ie-crop-handle br" data-handle="br"></div>
                                <div class="ie-crop-grid">
                                    <div class="ie-crop-line h1"></div>
                                    <div class="ie-crop-line h2"></div>
                                    <div class="ie-crop-line v1"></div>
                                    <div class="ie-crop-line v2"></div>
                                </div>
                            </div>
                        </div>
                    }
                </div>

                <!-- Info bar -->
                <div class="ie-info">
                    <span>{{ displayWidth() }} × {{ displayHeight() }} px</span>
                    @if (mode() === 'crop') {
                        <span class="ie-info-crop">
                            Обрізка: {{ Math.round(cropRealW()) }} × {{ Math.round(cropRealH()) }}
                        </span>
                    }
                </div>

                <!-- Tools -->
                <div class="ie-tools">
                    <!-- Mode tabs -->
                    <div class="ie-tabs">
                        <button class="ie-tab" [class.active]="mode() === 'transform'" (click)="setMode('transform')">
                            <span class="material-symbols-outlined">transform</span>
                            <span>Обертання</span>
                        </button>
                        <button class="ie-tab" [class.active]="mode() === 'crop'" (click)="setMode('crop')">
                            <span class="material-symbols-outlined">crop</span>
                            <span>Обрізка</span>
                        </button>
                        <button class="ie-tab" [class.active]="mode() === 'resize'" (click)="setMode('resize')">
                            <span class="material-symbols-outlined">aspect_ratio</span>
                            <span>Розмір</span>
                        </button>
                    </div>

                    <!-- Transform tools -->
                    @if (mode() === 'transform') {
                        <div class="ie-tool-row">
                            <button class="ie-tool-btn" (click)="rotateLeft()" title="Повернути вліво">
                                <span class="material-symbols-outlined">rotate_left</span>
                                <span class="ie-tool-label">−90°</span>
                            </button>
                            <button class="ie-tool-btn" (click)="rotateRight()" title="Повернути вправо">
                                <span class="material-symbols-outlined">rotate_right</span>
                                <span class="ie-tool-label">+90°</span>
                            </button>
                            <button class="ie-tool-btn" (click)="flipH()" title="Відзеркалити горизонтально">
                                <span class="material-symbols-outlined">flip</span>
                                <span class="ie-tool-label">↔ Гориз.</span>
                            </button>
                            <button class="ie-tool-btn" (click)="flipV()" title="Відзеркалити вертикально">
                                <span class="material-symbols-outlined" style="transform:rotate(90deg)">flip</span>
                                <span class="ie-tool-label">↕ Верт.</span>
                            </button>
                        </div>
                    }

                    <!-- Crop tools -->
                    @if (mode() === 'crop') {
                        <div class="ie-tool-row">
                            <button class="ie-tool-btn" [class.active]="cropAspect() === 'free'" (click)="setCropAspect('free')">
                                <span class="ie-tool-label">Вільно</span>
                            </button>
                            <button class="ie-tool-btn" [class.active]="cropAspect() === '1:1'" (click)="setCropAspect('1:1')">
                                <span class="ie-tool-label">1:1</span>
                            </button>
                            <button class="ie-tool-btn" [class.active]="cropAspect() === '4:3'" (click)="setCropAspect('4:3')">
                                <span class="ie-tool-label">4:3</span>
                            </button>
                            <button class="ie-tool-btn" [class.active]="cropAspect() === '16:9'" (click)="setCropAspect('16:9')">
                                <span class="ie-tool-label">16:9</span>
                            </button>
                            <button class="ie-crop-apply" (click)="applyCrop()">
                                <span class="material-symbols-outlined">check</span>
                                Обрізати
                            </button>
                        </div>
                    }

                    <!-- Resize tools -->
                    @if (mode() === 'resize') {
                        <div class="ie-resize-row">
                            <div class="ie-resize-field">
                                <label>Ш</label>
                                <input type="number" [ngModel]="resizeW()" (ngModelChange)="onResizeW($event)" min="10" max="8000" />
                            </div>
                            <button class="ie-lock-btn" [class.locked]="resizeLock()" (click)="resizeLock.set(!resizeLock())" title="Зберігати пропорції">
                                <span class="material-symbols-outlined">{{ resizeLock() ? 'lock' : 'lock_open' }}</span>
                            </button>
                            <div class="ie-resize-field">
                                <label>В</label>
                                <input type="number" [ngModel]="resizeH()" (ngModelChange)="onResizeH($event)" min="10" max="8000" />
                            </div>
                            <button class="ie-resize-apply" (click)="applyResize()">
                                <span class="material-symbols-outlined">check</span>
                            </button>
                        </div>
                    }
                </div>

                <!-- Footer -->
                <div class="ie-footer">
                    <button class="ie-reset-btn" (click)="resetAll()">
                        <span class="material-symbols-outlined">restart_alt</span>
                        Скинути
                    </button>
                    <div class="ie-actions">
                        <button class="ie-save-btn" (click)="save()">
                            @if (isSaving()) { Обробка... } @else { Готово }
                        </button>
                        <button class="ie-cancel-btn" (click)="cancel.emit()">Скасувати</button>
                    </div>
                </div>

            </div>
        </div>
    `,
    styles: [`
        @use 'mixins' as m;

        .ie-overlay {
            position: fixed;
            inset: 0;
            z-index: 1100;
            background: rgba(0,0,0,.6);
            display: flex;
            align-items: stretch;
            justify-content: stretch;
            padding: 0;
            animation: ieFadeIn .2s ease;

            @include m.tablet {
                align-items: center;
                justify-content: center;
                padding: var(--space-4);
            }
        }

        @keyframes ieFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .ie-modal {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            background: var(--color-surface);
            overflow: hidden;

            @include m.tablet {
                width: min(680px, 90vw);
                height: min(85vh, 720px);
                border-radius: var(--radius-lg);
                box-shadow: 0 20px 60px rgba(0,0,0,.35);
            }
        }

        // ── Header ──

        .ie-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-3) var(--space-4);
            border-bottom: 1px solid var(--color-border-light);
            flex-shrink: 0;

            h3 {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                margin: 0;
                font-family: var(--font-display);
                font-size: var(--text-base);
                font-weight: var(--weight-semibold);

                .material-symbols-outlined {
                    font-size: 20px;
                    color: var(--color-accent);
                }
            }
        }

        .ie-close {
            @include m.reset-button;
            @include m.tap-target(40px);
            border-radius: var(--radius-full);
            color: var(--color-text-secondary);
            transition: background .15s;

            @include m.hover {
                background: var(--color-surface-hover);
            }

            .material-symbols-outlined { font-size: 22px; }
        }

        // ── Canvas ──

        .ie-canvas-wrap {
            flex: 1;
            position: relative;
            overflow: hidden;
            background: #1a1a1a;
            display: flex;
            align-items: center;
            justify-content: center;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
            min-height: 0;

            canvas {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                display: block;
            }
        }

        // ── Crop overlay ──

        .ie-crop-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
        }

        .ie-crop-box {
            position: absolute;
            border: 2px solid #fff;
            box-shadow: 0 0 0 9999px rgba(0,0,0,.55);
            pointer-events: auto;
            cursor: move;
            touch-action: none;
        }

        .ie-crop-handle {
            position: absolute;
            width: 24px;
            height: 24px;
            background: #fff;
            border-radius: 50%;
            box-shadow: 0 1px 4px rgba(0,0,0,.3);
            transform: translate(-50%, -50%);
            touch-action: none;
            pointer-events: auto;
            z-index: 2;

            @include m.tablet { width: 16px; height: 16px; }

            &.tl { top: 0; left: 0; cursor: nwse-resize; }
            &.tr { top: 0; right: 0; transform: translate(50%, -50%); cursor: nesw-resize; }
            &.bl { bottom: 0; left: 0; transform: translate(-50%, 50%); cursor: nesw-resize; }
            &.br { bottom: 0; right: 0; transform: translate(50%, 50%); cursor: nwse-resize; }
        }

        .ie-crop-grid {
            position: absolute;
            inset: 0;

            .ie-crop-line {
                position: absolute;
                background: rgba(255,255,255,.3);

                &.h1 { top: 33.33%; left: 0; right: 0; height: 1px; }
                &.h2 { top: 66.66%; left: 0; right: 0; height: 1px; }
                &.v1 { left: 33.33%; top: 0; bottom: 0; width: 1px; }
                &.v2 { left: 66.66%; top: 0; bottom: 0; width: 1px; }
            }
        }

        // ── Info bar ──

        .ie-info {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-3);
            padding: var(--space-2) var(--space-3);
            background: var(--color-surface-hover);
            font-size: var(--text-xs);
            color: var(--color-text-secondary);
            flex-shrink: 0;
        }

        .ie-info-crop {
            color: var(--color-accent);
            font-weight: var(--weight-medium);
        }

        // ── Tools ──

        .ie-tools {
            flex-shrink: 0;
            border-top: 1px solid var(--color-border-light);
        }

        .ie-tabs {
            display: flex;
            border-bottom: 1px solid var(--color-border-light);
        }

        .ie-tab {
            @include m.reset-button;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            padding: var(--space-2) var(--space-2);
            font-size: 11px;
            color: var(--color-text-tertiary);
            transition: color .15s, background .15s;
            border-bottom: 2px solid transparent;

            .material-symbols-outlined { font-size: 20px; }

            @include m.hover {
                background: var(--color-surface-hover);
                color: var(--color-text);
            }

            &.active {
                color: var(--color-accent);
                border-bottom-color: var(--color-accent);
            }
        }

        .ie-tool-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-2);
            padding: var(--space-3);
            flex-wrap: wrap;
        }

        .ie-tool-btn {
            @include m.reset-button;
            @include m.tap-target(44px);
            flex-direction: column;
            gap: 2px;
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-sm);
            color: var(--color-text-secondary);
            font-size: 10px;
            transition: background .15s, color .15s;

            .material-symbols-outlined { font-size: 22px; }

            @include m.hover {
                background: var(--color-surface-hover);
                color: var(--color-text);
            }

            &.active {
                background: var(--color-accent-light);
                color: var(--color-accent-dark);
            }
        }

        .ie-tool-label {
            font-size: 10px;
            white-space: nowrap;
        }

        .ie-crop-apply {
            @include m.reset-button;
            display: inline-flex;
            align-items: center;
            gap: var(--space-1);
            padding: var(--space-2) var(--space-3);
            background: var(--color-accent);
            color: #fff;
            font-size: var(--text-xs);
            font-weight: var(--weight-medium);
            border-radius: var(--radius-sm);
            margin-left: auto;
            transition: background .15s;

            .material-symbols-outlined { font-size: 16px; }

            @include m.hover { background: var(--color-accent-dark); }
        }

        // ── Resize ──

        .ie-resize-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-2);
            padding: var(--space-3);
        }

        .ie-resize-field {
            display: flex;
            align-items: center;
            gap: var(--space-1);

            label {
                font-size: var(--text-xs);
                color: var(--color-text-tertiary);
                font-weight: var(--weight-medium);
            }

            input {
                width: 72px;
                padding: var(--space-1) var(--space-2);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-xs);
                font-size: var(--text-sm);
                text-align: center;
                background: var(--color-bg);
                color: var(--color-text-primary);

                &:focus {
                    outline: none;
                    border-color: var(--color-accent);
                }
            }
        }

        .ie-lock-btn {
            @include m.reset-button;
            @include m.tap-target(36px);
            border-radius: var(--radius-full);
            color: var(--color-text-tertiary);
            transition: color .15s, background .15s;

            .material-symbols-outlined { font-size: 18px; }

            &.locked { color: var(--color-accent); }

            @include m.hover { background: var(--color-surface-hover); }
        }

        .ie-resize-apply {
            @include m.reset-button;
            @include m.tap-target(36px);
            background: var(--color-accent);
            color: #fff;
            border-radius: var(--radius-sm);
            transition: background .15s;

            .material-symbols-outlined { font-size: 18px; }

            @include m.hover { background: var(--color-accent-dark); }
        }

        // ── Footer ──

        .ie-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-3) var(--space-4);
            border-top: 1px solid var(--color-border-light);
            flex-shrink: 0;
        }

        .ie-reset-btn {
            @include m.reset-button;
            display: inline-flex;
            align-items: center;
            gap: var(--space-1);
            padding: var(--space-2) var(--space-3);
            font-size: var(--text-xs);
            color: var(--color-text-tertiary);
            border-radius: var(--radius-sm);
            transition: color .15s, background .15s;

            .material-symbols-outlined { font-size: 16px; }

            @include m.hover {
                background: var(--color-surface-hover);
                color: var(--color-text);
            }
        }

        .ie-actions {
            display: flex;
            gap: var(--space-2);
        }

        .ie-save-btn {
            @include m.reset-button;
            padding: var(--space-2) var(--space-4);
            background: var(--color-accent);
            color: #fff;
            font-size: var(--text-xs);
            font-weight: var(--weight-semibold);
            border-radius: var(--radius-sm);
            transition: background .15s;

            @include m.hover { background: var(--color-accent-dark); }
        }

        .ie-cancel-btn {
            @include m.reset-button;
            padding: var(--space-2) var(--space-3);
            font-size: var(--text-xs);
            color: var(--color-text-tertiary);
            border-radius: var(--radius-sm);
            transition: color .15s, background .15s;

            @include m.hover {
                background: var(--color-surface-hover);
                color: var(--color-text);
            }
        }
    `],
})
export class ImageEditorComponent implements AfterViewInit, OnDestroy {
    @Input({ required: true }) imageSource!: string | File;
    @Output() readonly save$ = new EventEmitter<ImageEditorResult>();
    @Output() readonly cancel = new EventEmitter<void>();

    @ViewChild('editorCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('canvasWrap') wrapRef!: ElementRef<HTMLDivElement>;

    protected readonly Math = Math;

    // State
    protected readonly mode = signal<'transform' | 'crop' | 'resize'>('transform');
    protected readonly isSaving = signal(false);
    protected readonly displayWidth = signal(0);
    protected readonly displayHeight = signal(0);

    // Crop state (in canvas px)
    protected readonly cropX = signal(0);
    protected readonly cropY = signal(0);
    protected readonly cropW = signal(0);
    protected readonly cropH = signal(0);
    protected readonly cropAspect = signal<'free' | '1:1' | '4:3' | '16:9'>('free');

    // Resize state
    protected readonly resizeW = signal(0);
    protected readonly resizeH = signal(0);
    protected readonly resizeLock = signal(true);

    // Internal
    private srcImage: HTMLImageElement | null = null;
    private currentCanvas: HTMLCanvasElement | null = null;
    private scaleRatio = 1; // canvas display px / actual px

    // Crop dragging
    private dragType: 'move' | 'tl' | 'tr' | 'bl' | 'br' | null = null;
    private dragStartX = 0;
    private dragStartY = 0;
    private dragStartCropX = 0;
    private dragStartCropY = 0;
    private dragStartCropW = 0;
    private dragStartCropH = 0;

    ngAfterViewInit(): void {
        this.loadImage();
    }

    ngOnDestroy(): void {
        this.srcImage = null;
        this.currentCanvas = null;
    }

    // ── Load ──

    private async loadImage(): Promise<void> {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        if (this.imageSource instanceof File) {
            img.src = URL.createObjectURL(this.imageSource);
        } else {
            img.src = this.imageSource;
        }

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image'));
        });

        this.srcImage = img;

        // Create working canvas at full resolution
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        this.currentCanvas = c;

        this.updateDisplay();
    }

    private updateDisplay(): void {
        if (!this.currentCanvas) return;
        const c = this.currentCanvas;
        const displayCanvas = this.canvasRef.nativeElement;
        const wrap = this.wrapRef.nativeElement;

        const wW = wrap.clientWidth;
        const wH = wrap.clientHeight;

        // Fit image into wrap
        this.scaleRatio = Math.min(wW / c.width, wH / c.height, 1);
        const dw = Math.round(c.width * this.scaleRatio);
        const dh = Math.round(c.height * this.scaleRatio);

        displayCanvas.width = dw;
        displayCanvas.height = dh;
        const ctx = displayCanvas.getContext('2d')!;
        ctx.drawImage(c, 0, 0, dw, dh);

        this.displayWidth.set(c.width);
        this.displayHeight.set(c.height);
        this.resizeW.set(c.width);
        this.resizeH.set(c.height);

        // Init crop to full area
        this.cropX.set(0);
        this.cropY.set(0);
        this.cropW.set(dw);
        this.cropH.set(dh);
    }

    // ── Helpers: real crop size ──

    protected cropRealW(): number {
        return this.cropW() / this.scaleRatio;
    }

    protected cropRealH(): number {
        return this.cropH() / this.scaleRatio;
    }

    // ── Mode ──

    setMode(m: 'transform' | 'crop' | 'resize'): void {
        this.mode.set(m);
        if (m === 'crop') {
            // Reset crop to full
            const dc = this.canvasRef.nativeElement;
            this.cropX.set(0);
            this.cropY.set(0);
            this.cropW.set(dc.width);
            this.cropH.set(dc.height);
            this.cropAspect.set('free');
        }
    }

    // ── Transform ──

    rotateLeft(): void { this.rotate(-90); }
    rotateRight(): void { this.rotate(90); }

    private rotate(deg: number): void {
        if (!this.currentCanvas) return;
        const src = this.currentCanvas;
        const c = document.createElement('canvas');
        const isRight = Math.abs(deg) === 90;
        c.width = isRight ? src.height : src.width;
        c.height = isRight ? src.width : src.height;
        const ctx = c.getContext('2d')!;
        ctx.translate(c.width / 2, c.height / 2);
        ctx.rotate((deg * Math.PI) / 180);
        ctx.drawImage(src, -src.width / 2, -src.height / 2);
        this.currentCanvas = c;
        this.updateDisplay();
    }

    flipH(): void {
        if (!this.currentCanvas) return;
        const src = this.currentCanvas;
        const c = document.createElement('canvas');
        c.width = src.width; c.height = src.height;
        const ctx = c.getContext('2d')!;
        ctx.translate(c.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(src, 0, 0);
        this.currentCanvas = c;
        this.updateDisplay();
    }

    flipV(): void {
        if (!this.currentCanvas) return;
        const src = this.currentCanvas;
        const c = document.createElement('canvas');
        c.width = src.width; c.height = src.height;
        const ctx = c.getContext('2d')!;
        ctx.translate(0, c.height);
        ctx.scale(1, -1);
        ctx.drawImage(src, 0, 0);
        this.currentCanvas = c;
        this.updateDisplay();
    }

    // ── Crop ──

    setCropAspect(aspect: 'free' | '1:1' | '4:3' | '16:9'): void {
        this.cropAspect.set(aspect);
        if (aspect === 'free') return;

        const dc = this.canvasRef.nativeElement;
        const ratios: Record<string, number> = { '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9 };
        const r = ratios[aspect] ?? 1;

        let w = dc.width;
        let h = w / r;
        if (h > dc.height) {
            h = dc.height;
            w = h * r;
        }
        this.cropX.set((dc.width - w) / 2);
        this.cropY.set((dc.height - h) / 2);
        this.cropW.set(w);
        this.cropH.set(h);
    }

    applyCrop(): void {
        if (!this.currentCanvas) return;
        const sx = this.cropX() / this.scaleRatio;
        const sy = this.cropY() / this.scaleRatio;
        const sw = this.cropW() / this.scaleRatio;
        const sh = this.cropH() / this.scaleRatio;

        const c = document.createElement('canvas');
        c.width = Math.round(sw);
        c.height = Math.round(sh);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(this.currentCanvas, Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh), 0, 0, c.width, c.height);
        this.currentCanvas = c;
        this.mode.set('transform');
        this.updateDisplay();
    }

    // ── Resize ──

    onResizeW(w: number): void {
        this.resizeW.set(w);
        if (this.resizeLock() && this.currentCanvas) {
            const ratio = this.currentCanvas.height / this.currentCanvas.width;
            this.resizeH.set(Math.round(w * ratio));
        }
    }

    onResizeH(h: number): void {
        this.resizeH.set(h);
        if (this.resizeLock() && this.currentCanvas) {
            const ratio = this.currentCanvas.width / this.currentCanvas.height;
            this.resizeW.set(Math.round(h * ratio));
        }
    }

    applyResize(): void {
        if (!this.currentCanvas) return;
        const w = Math.max(10, Math.min(8000, this.resizeW()));
        const h = Math.max(10, Math.min(8000, this.resizeH()));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(this.currentCanvas, 0, 0, w, h);
        this.currentCanvas = c;
        this.mode.set('transform');
        this.updateDisplay();
    }

    // ── Reset ──

    resetAll(): void {
        this.loadImage();
        this.mode.set('transform');
    }

    // ── Save ──

    save(): void {
        if (!this.currentCanvas) return;
        this.isSaving.set(true);

        this.currentCanvas.toBlob(
            (blob) => {
                this.isSaving.set(false);
                if (!blob) return;
                this.save$.emit({
                    blob,
                    width: this.currentCanvas!.width,
                    height: this.currentCanvas!.height,
                });
            },
            'image/jpeg',
            0.92,
        );
    }

    // ── Pointer handling for crop drag ──

    onBackdropClick(event: Event): void {
        if (event.target === event.currentTarget) {
            this.cancel.emit();
        }
    }

    onPointerDown(event: PointerEvent): void {
        if (this.mode() !== 'crop') return;

        const target = event.target as HTMLElement;
        const handle = target.dataset?.['handle'];
        const wrap = this.wrapRef.nativeElement;
        const canvas = this.canvasRef.nativeElement;

        // Get canvas offset within wrap
        const canvasRect = canvas.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        const offsetX = canvasRect.left - wrapRect.left;
        const offsetY = canvasRect.top - wrapRect.top;

        const px = event.clientX - canvasRect.left;
        const py = event.clientY - canvasRect.top;

        if (handle) {
            this.dragType = handle as any;
        } else if (
            target.closest('.ie-crop-box') &&
            !target.classList.contains('ie-crop-handle')
        ) {
            this.dragType = 'move';
        } else {
            return;
        }

        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);

        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;
        this.dragStartCropX = this.cropX();
        this.dragStartCropY = this.cropY();
        this.dragStartCropW = this.cropW();
        this.dragStartCropH = this.cropH();

        event.preventDefault();
    }

    onPointerMove(event: PointerEvent): void {
        if (!this.dragType) return;

        const dx = event.clientX - this.dragStartX;
        const dy = event.clientY - this.dragStartY;
        const dc = this.canvasRef.nativeElement;
        const maxW = dc.width;
        const maxH = dc.height;

        const aspect = this.cropAspect();
        const ratios: Record<string, number> = { '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9 };
        const ar = aspect !== 'free' ? ratios[aspect] : 0;

        if (this.dragType === 'move') {
            let x = this.dragStartCropX + dx;
            let y = this.dragStartCropY + dy;
            x = Math.max(0, Math.min(maxW - this.cropW(), x));
            y = Math.max(0, Math.min(maxH - this.cropH(), y));
            this.cropX.set(x);
            this.cropY.set(y);
        } else {
            let x = this.dragStartCropX;
            let y = this.dragStartCropY;
            let w = this.dragStartCropW;
            let h = this.dragStartCropH;

            switch (this.dragType) {
                case 'br':
                    w = Math.max(30, this.dragStartCropW + dx);
                    h = ar ? w / ar : Math.max(30, this.dragStartCropH + dy);
                    break;
                case 'bl':
                    w = Math.max(30, this.dragStartCropW - dx);
                    h = ar ? w / ar : Math.max(30, this.dragStartCropH + dy);
                    x = this.dragStartCropX + this.dragStartCropW - w;
                    break;
                case 'tr':
                    w = Math.max(30, this.dragStartCropW + dx);
                    h = ar ? w / ar : Math.max(30, this.dragStartCropH - dy);
                    y = this.dragStartCropY + this.dragStartCropH - h;
                    break;
                case 'tl':
                    w = Math.max(30, this.dragStartCropW - dx);
                    h = ar ? w / ar : Math.max(30, this.dragStartCropH - dy);
                    x = this.dragStartCropX + this.dragStartCropW - w;
                    y = this.dragStartCropY + this.dragStartCropH - h;
                    break;
            }

            // Clamp to canvas bounds
            if (x < 0) { w += x; x = 0; }
            if (y < 0) { h += y; y = 0; }
            if (x + w > maxW) w = maxW - x;
            if (y + h > maxH) h = maxH - y;

            this.cropX.set(x);
            this.cropY.set(y);
            this.cropW.set(w);
            this.cropH.set(h);
        }

        event.preventDefault();
    }

    onPointerUp(_event: PointerEvent): void {
        this.dragType = null;
    }
}
