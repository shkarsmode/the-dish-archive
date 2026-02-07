import { ChangeDetectorRef, Directive, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';

@Directive({
    selector: '[appReveal]',
    host: {
        '[class.reveal]': 'true',
        '[class.revealed]': 'isRevealed',
    },
})
export class RevealDirective implements OnInit, OnDestroy {
    private readonly el = inject(ElementRef);
    private readonly cdr = inject(ChangeDetectorRef);
    private observer?: IntersectionObserver;
    protected isRevealed = false;

    ngOnInit(): void {
        this.observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    this.isRevealed = true;
                    this.cdr.markForCheck();
                    this.observer?.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
        );
        this.observer.observe(this.el.nativeElement);
    }

    ngOnDestroy(): void {
        this.observer?.disconnect();
    }
}
