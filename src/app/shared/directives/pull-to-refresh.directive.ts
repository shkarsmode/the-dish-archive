import {
    Directive,
    ElementRef,
    inject,
    NgZone,
    OnDestroy,
    OnInit,
    Renderer2,
} from '@angular/core';

const THRESHOLD = 80;
const MAX_PULL = 130;
const BUBBLES = ['💨', '💧', '💧', '💨', '✨'];

@Directive({
    selector: '[appPullToRefresh]',
    standalone: true,
})
export class PullToRefreshDirective implements OnInit, OnDestroy {
    private readonly el = inject(ElementRef);
    private readonly zone = inject(NgZone);
    private readonly renderer = inject(Renderer2);

    private indicator!: HTMLElement;
    private potEl!: HTMLElement;
    private progressRing!: HTMLElement;

    private startY = 0;
    private currentY = 0;
    private pulling = false;
    private triggered = false;

    private touchStartFn?: () => void;
    private touchMoveFn?: () => void;
    private touchEndFn?: () => void;

    ngOnInit(): void {
        this.createIndicator();

        this.zone.runOutsideAngular(() => {
            this.touchStartFn = this.renderer.listen(
                this.el.nativeElement,
                'touchstart',
                (e: TouchEvent) => this.onTouchStart(e)
            );
            this.touchMoveFn = this.renderer.listen(
                this.el.nativeElement,
                'touchmove',
                (e: TouchEvent) => this.onTouchMove(e)
            );
            this.touchEndFn = this.renderer.listen(
                this.el.nativeElement,
                'touchend',
                () => this.onTouchEnd()
            );
        });
    }

    ngOnDestroy(): void {
        this.touchStartFn?.();
        this.touchMoveFn?.();
        this.touchEndFn?.();
        this.indicator?.remove();
    }

    private createIndicator(): void {
        this.indicator = this.renderer.createElement('div');
        this.indicator.innerHTML = `
            <div class="ptr-inner">
                <div class="ptr-progress-ring">
                    <svg viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2.5"
                                stroke-dasharray="106.8" stroke-dashoffset="106.8" stroke-linecap="round" />
                    </svg>
                </div>
                <span class="ptr-pot">🍲</span>
                <div class="ptr-steam"></div>
            </div>
        `;
        Object.assign(this.indicator.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: '9998',
            transform: 'translateY(-60px)',
            transition: 'none',
            willChange: 'transform',
        });

        const style = document.createElement('style');
        style.textContent = `
            .ptr-inner {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 48px;
                height: 48px;
            }
            .ptr-progress-ring {
                position: absolute;
                inset: 0;
                color: var(--color-accent, #B8926A);
                transition: opacity 0.2s;
            }
            .ptr-progress-ring svg {
                width: 100%;
                height: 100%;
                transform: rotate(-90deg);
            }
            .ptr-pot {
                font-size: 24px;
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                user-select: none;
            }
            .ptr-steam {
                position: absolute;
                top: -2px;
                left: 50%;
                transform: translateX(-50%);
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s;
            }
            .ptr-boiling .ptr-pot {
                animation: ptrBoil 0.3s ease infinite alternate;
            }
            .ptr-boiling .ptr-steam {
                opacity: 1;
            }
            @keyframes ptrBoil {
                from { transform: translateY(0) rotate(-3deg); }
                to   { transform: translateY(-2px) rotate(3deg); }
            }
            .ptr-bubble {
                position: absolute;
                font-size: 10px;
                animation: ptrBubbleUp 0.7s ease-out forwards;
                pointer-events: none;
            }
            @keyframes ptrBubbleUp {
                0%   { opacity: 1; transform: translateY(0) scale(0.5); }
                100% { opacity: 0; transform: translateY(-28px) scale(1.1); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(this.indicator);

        this.potEl = this.indicator.querySelector('.ptr-pot')!;
        this.progressRing = this.indicator.querySelector('.ptr-progress-ring circle') as any;
    }

    private onTouchStart(e: TouchEvent): void {
        if (window.scrollY > 5) return;
        this.startY = e.touches[0].clientY;
        this.pulling = true;
        this.triggered = false;
        this.indicator.style.transition = 'none';
    }

    private onTouchMove(e: TouchEvent): void {
        if (!this.pulling) return;

        const y = e.touches[0].clientY;
        const diff = Math.max(0, y - this.startY);
        if (diff === 0) return;

        // Dampen pull
        const pull = Math.min(MAX_PULL, diff * 0.45);
        this.currentY = pull;

        this.indicator.style.transform = `translateY(${pull - 20}px)`;

        // Update progress ring
        const progress = Math.min(1, pull / THRESHOLD);
        const offset = 106.8 * (1 - progress);
        (this.progressRing as any).style.strokeDashoffset = `${offset}`;

        // Scale pot based on progress
        this.potEl.style.transform = `scale(${0.8 + progress * 0.4})`;

        if (pull >= THRESHOLD && !this.triggered) {
            this.triggered = true;
            this.indicator.querySelector('.ptr-inner')!.classList.add('ptr-boiling');
            this.emitSteam();
        } else if (pull < THRESHOLD && this.triggered) {
            this.triggered = false;
            this.indicator.querySelector('.ptr-inner')!.classList.remove('ptr-boiling');
        }
    }

    private onTouchEnd(): void {
        if (!this.pulling) return;
        this.pulling = false;

        if (this.triggered) {
            // Snap to resting position with boil animation
            this.indicator.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            this.indicator.style.transform = 'translateY(40px)';

            // Burst of bubbles
            this.burstBubbles();

            // Reload after animation
            setTimeout(() => {
                this.indicator.style.transition = 'transform 0.3s ease';
                this.indicator.style.transform = 'translateY(-60px)';
                this.indicator.querySelector('.ptr-inner')!.classList.remove('ptr-boiling');
                // Reload page
                // window.location.reload();
            }, 900);
        } else {
            // Snap back
            this.indicator.style.transition = 'transform 0.3s ease';
            this.indicator.style.transform = 'translateY(-60px)';
            this.resetRing();
        }
    }

    private resetRing(): void {
        (this.progressRing as any).style.strokeDashoffset = '106.8';
        this.potEl.style.transform = '';
    }

    private emitSteam(): void {
        const steam = this.indicator.querySelector('.ptr-steam')!;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const b = document.createElement('span');
                b.className = 'ptr-bubble';
                b.textContent = BUBBLES[Math.floor(Math.random() * BUBBLES.length)];
                b.style.left = `${-8 + Math.random() * 16}px`;
                steam.appendChild(b);
                setTimeout(() => b.remove(), 700);
            }, i * 150);
        }
    }

    private burstBubbles(): void {
        const steam = this.indicator.querySelector('.ptr-steam')!;
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const b = document.createElement('span');
                b.className = 'ptr-bubble';
                b.textContent = BUBBLES[Math.floor(Math.random() * BUBBLES.length)];
                b.style.left = `${-12 + Math.random() * 24}px`;
                steam.appendChild(b);
                setTimeout(() => b.remove(), 700);
            }, i * 80);
        }
    }
}
