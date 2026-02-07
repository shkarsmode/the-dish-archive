import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CookRank } from '../../core/services/rank.service';

@Component({
    selector: 'app-rank-badge',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        :host { display: inline-flex; }
        .badge { display: flex; align-items: center; justify-content: center; }
        svg { display: block; }
    `,
    template: `
        <div class="badge" [style.--badge-glow]="rank().glow" [style.--badge-glow-r]="glowRadius()">
            <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                @switch (rank().id) {
                    <!-- ─── Tier 1: Новачок (1-3) - Simple utensils ─── -->
                    @case (1) {
                        <!-- Wooden spoon -->
                        <rect x="29" y="10" width="6" height="40" rx="3" [attr.fill]="rank().color" opacity=".5"/>
                        <ellipse cx="32" cy="14" rx="7" ry="5" [attr.fill]="rank().color" opacity=".7"/>
                    }
                    @case (2) {
                        <!-- Fork -->
                        <rect x="29" y="28" width="6" height="26" rx="3" [attr.fill]="rank().color"/>
                        <rect x="22" y="8" width="3" height="18" rx="1.5" [attr.fill]="rank().color" opacity=".8"/>
                        <rect x="30.5" y="8" width="3" height="18" rx="1.5" [attr.fill]="rank().color" opacity=".8"/>
                        <rect x="39" y="8" width="3" height="18" rx="1.5" [attr.fill]="rank().color" opacity=".8"/>
                    }
                    @case (3) {
                        <!-- Knife -->
                        <rect x="29" y="32" width="6" height="22" rx="3" [attr.fill]="rank().color"/>
                        <path d="M32 6 L37 32 H27 Z" [attr.fill]="rank().color" opacity=".85"/>
                        <line x1="27" y1="32" x2="37" y2="32" [attr.stroke]="rank().color" stroke-width="2"/>
                    }
                    <!-- ─── Tier 2: Зелений (4-6) ─── -->
                    @case (4) {
                        <!-- Cutting board with knife -->
                        <rect x="12" y="16" width="40" height="32" rx="4" [attr.fill]="rank().color" opacity=".25"/>
                        <rect x="16" y="20" width="32" height="24" rx="2" [attr.fill]="rank().color" opacity=".4"/>
                        <path d="M40 12 L44 20 H36 Z" [attr.fill]="rank().color"/>
                        <rect x="38" y="20" width="4" height="14" rx="2" [attr.fill]="rank().color"/>
                    }
                    @case (5) {
                        <!-- Pan -->
                        <circle cx="28" cy="32" r="16" [attr.fill]="rank().color" opacity=".35"/>
                        <circle cx="28" cy="32" r="12" [attr.fill]="rank().color" opacity=".55"/>
                        <rect x="42" y="28" width="16" height="6" rx="3" [attr.fill]="rank().color"/>
                    }
                    @case (6) {
                        <!-- Pot with lid -->
                        <ellipse cx="32" cy="38" rx="18" ry="14" [attr.fill]="rank().color" opacity=".4"/>
                        <rect x="14" y="24" width="36" height="22" rx="4" [attr.fill]="rank().color" opacity=".6"/>
                        <ellipse cx="32" cy="24" rx="18" ry="5" [attr.fill]="rank().color" opacity=".8"/>
                        <circle cx="32" cy="18" r="3" [attr.fill]="rank().color"/>
                        <!-- Steam -->
                        <path d="M24 14 Q24 8 28 8" stroke="currentColor" fill="none" stroke-width="1.5" opacity=".4"/>
                        <path d="M36 12 Q36 6 40 6" stroke="currentColor" fill="none" stroke-width="1.5" opacity=".4"/>
                    }
                    <!-- ─── Tier 3: Синій (7-9) ─── -->
                    @case (7) {
                        <!-- Knife crossed with spoon -->
                        <rect x="14" y="30" width="36" height="4" rx="2" [attr.fill]="rank().color" opacity=".7" transform="rotate(-45 32 32)"/>
                        <rect x="14" y="30" width="36" height="4" rx="2" [attr.fill]="rank().color" opacity=".7" transform="rotate(45 32 32)"/>
                        <circle cx="32" cy="32" r="5" [attr.fill]="rank().color"/>
                    }
                    @case (8) {
                        <!-- Whisk -->
                        <rect x="30" y="36" width="4" height="20" rx="2" [attr.fill]="rank().color"/>
                        <path d="M24 10 Q24 34 32 36 Q40 34 40 10" fill="none" [attr.stroke]="rank().color" stroke-width="2"/>
                        <path d="M27 10 Q27 32 32 34 Q37 32 37 10" fill="none" [attr.stroke]="rank().color" stroke-width="1.5" opacity=".6"/>
                        <path d="M30 10 Q30 30 32 32 Q34 30 34 10" fill="none" [attr.stroke]="rank().color" stroke-width="1" opacity=".4"/>
                    }
                    @case (9) {
                        <!-- Tasting spoon with sparkle -->
                        <ellipse cx="32" cy="20" rx="10" ry="7" [attr.fill]="rank().color" opacity=".5"/>
                        <ellipse cx="32" cy="20" rx="6" ry="4" [attr.fill]="rank().color" opacity=".8"/>
                        <rect x="30" y="26" width="4" height="28" rx="2" [attr.fill]="rank().color" opacity=".65"/>
                        <!-- Sparkle -->
                        <path d="M48 12 L50 16 L54 14 L50 18 L52 22 L48 18 L44 20 L48 16 Z" fill="#FFD700" opacity=".7"/>
                    }
                    <!-- ─── Tier 4: Фіолетовий (10-12) ─── -->
                    @case (10) {
                        <!-- House/Kitchen icon -->
                        <path d="M32 8 L52 24 H12 Z" [attr.fill]="rank().color" opacity=".5"/>
                        <rect x="18" y="24" width="28" height="28" rx="2" [attr.fill]="rank().color" opacity=".35"/>
                        <rect x="26" y="36" width="12" height="16" rx="1" [attr.fill]="rank().color" opacity=".65"/>
                        <!-- Smoke -->
                        <path d="M42 6 Q44 2 46 6" stroke="currentColor" fill="none" stroke-width="1.5" opacity=".35"/>
                    }
                    @case (11) {
                        <!-- Flame -->
                        <path d="M32 8 Q42 20 38 32 Q42 26 44 34 Q46 44 32 52 Q18 44 20 34 Q22 26 26 32 Q22 20 32 8Z" [attr.fill]="rank().color" opacity=".6"/>
                        <path d="M32 20 Q38 28 35 36 Q38 32 39 38 Q40 46 32 50 Q24 46 25 38 Q26 32 29 36 Q26 28 32 20Z" [attr.fill]="rank().color" opacity=".9"/>
                    }
                    @case (12) {
                        <!-- Sunrise plate (breakfast) -->
                        <ellipse cx="32" cy="40" rx="22" ry="8" [attr.fill]="rank().color" opacity=".3"/>
                        <ellipse cx="32" cy="38" rx="18" ry="6" [attr.fill]="rank().color" opacity=".5"/>
                        <!-- Sun rays -->
                        <circle cx="32" cy="24" r="8" [attr.fill]="rank().color" opacity=".7"/>
                        <line x1="32" y1="10" x2="32" y2="14" [attr.stroke]="rank().color" stroke-width="2"/>
                        <line x1="22" y1="14" x2="24" y2="18" [attr.stroke]="rank().color" stroke-width="2"/>
                        <line x1="42" y1="14" x2="40" y2="18" [attr.stroke]="rank().color" stroke-width="2"/>
                        <line x1="18" y1="24" x2="22" y2="24" [attr.stroke]="rank().color" stroke-width="2"/>
                        <line x1="42" y1="24" x2="46" y2="24" [attr.stroke]="rank().color" stroke-width="2"/>
                    }
                    <!-- ─── Tier 5: Рожевий (13-15) ─── -->
                    @case (13) {
                        <!-- Cloche / covered dish -->
                        <ellipse cx="32" cy="44" rx="22" ry="6" [attr.fill]="rank().color" opacity=".35"/>
                        <path d="M10 44 Q10 18 32 12 Q54 18 54 44" [attr.fill]="rank().color" opacity=".5"/>
                        <line x1="10" y1="44" x2="54" y2="44" [attr.stroke]="rank().color" stroke-width="2.5"/>
                        <circle cx="32" cy="10" r="3" [attr.fill]="rank().color"/>
                    }
                    @case (14) {
                        <!-- Moon & stars (evening chef) -->
                        <path d="M24 14 Q24 38 38 44 Q22 44 14 32 Q8 18 24 14Z" [attr.fill]="rank().color" opacity=".7"/>
                        <circle cx="42" cy="16" r="2" [attr.fill]="rank().color"/>
                        <circle cx="48" cy="26" r="1.5" [attr.fill]="rank().color" opacity=".7"/>
                        <circle cx="50" cy="18" r="1" [attr.fill]="rank().color" opacity=".5"/>
                        <!-- Tiny fork -->
                        <rect x="38" y="34" width="2" height="14" rx="1" [attr.fill]="rank().color" opacity=".5"/>
                        <rect x="42" y="34" width="2" height="10" rx="1" [attr.fill]="rank().color" opacity=".5"/>
                        <rect x="46" y="34" width="2" height="14" rx="1" [attr.fill]="rank().color" opacity=".5"/>
                        <rect x="37" y="46" width="12" height="3" rx="1.5" [attr.fill]="rank().color" opacity=".5"/>
                    }
                    @case (15) {
                        <!-- Diploma / certificate -->
                        <rect x="12" y="12" width="40" height="40" rx="3" [attr.fill]="rank().color" opacity=".2"/>
                        <rect x="14" y="14" width="36" height="36" rx="2" [attr.fill]="rank().color" opacity=".35"/>
                        <line x1="20" y1="24" x2="44" y2="24" [attr.stroke]="rank().color" stroke-width="2"/>
                        <line x1="20" y1="30" x2="44" y2="30" [attr.stroke]="rank().color" stroke-width="1.5" opacity=".6"/>
                        <line x1="20" y1="35" x2="38" y2="35" [attr.stroke]="rank().color" stroke-width="1.5" opacity=".6"/>
                        <circle cx="36" cy="44" r="4" [attr.fill]="rank().color" opacity=".8"/>
                        <path d="M33 48 L36 54 L39 48" [attr.fill]="rank().color" opacity=".5"/>
                    }
                    <!-- ─── Tier 6: Помаранчевий (16-18) ─── -->
                    @case (16) {
                        <!-- Cupcake -->
                        <path d="M20 28 Q20 16 32 14 Q44 16 44 28Z" [attr.fill]="rank().color" opacity=".7"/>
                        <path d="M22 28 L24 50 H40 L42 28Z" [attr.fill]="rank().color" opacity=".45"/>
                        <!-- Cherry -->
                        <circle cx="32" cy="12" r="3" fill="#EF5350" opacity=".8"/>
                        <path d="M32 9 Q34 4 38 6" stroke="#4CAF50" fill="none" stroke-width="1.5"/>
                        <!-- Swirl -->
                        <path d="M24 22 Q28 18 32 22 Q36 26 40 22" fill="none" [attr.stroke]="rank().color" stroke-width="1.5"/>
                    }
                    @case (17) {
                        <!-- Sauce drip with droplets -->
                        <path d="M16 18 Q16 8 32 8 Q48 8 48 18 L46 32 Q44 42 32 46 Q20 42 18 32Z" [attr.fill]="rank().color" opacity=".55"/>
                        <ellipse cx="32" cy="28" rx="10" ry="8" [attr.fill]="rank().color" opacity=".75"/>
                        <!-- Drips -->
                        <ellipse cx="20" cy="48" rx="3" ry="4" [attr.fill]="rank().color" opacity=".5"/>
                        <ellipse cx="32" cy="52" rx="3" ry="4" [attr.fill]="rank().color" opacity=".5"/>
                        <ellipse cx="44" cy="48" rx="3" ry="4" [attr.fill]="rank().color" opacity=".5"/>
                    }
                    @case (18) {
                        <!-- Grill with flames -->
                        <rect x="10" y="28" width="44" height="6" rx="2" [attr.fill]="rank().color" opacity=".7"/>
                        <rect x="14" y="34" width="2" height="18" rx="1" [attr.fill]="rank().color" opacity=".5"/>
                        <rect x="48" y="34" width="2" height="18" rx="1" [attr.fill]="rank().color" opacity=".5"/>
                        <rect x="16" y="50" width="32" height="4" rx="2" [attr.fill]="rank().color" opacity=".35"/>
                        <!-- Grill lines -->
                        <line x1="16" y1="30" x2="16" y2="34" [attr.stroke]="rank().color" stroke-width="2" opacity=".8"/>
                        <line x1="24" y1="30" x2="24" y2="34" [attr.stroke]="rank().color" stroke-width="2" opacity=".8"/>
                        <line x1="32" y1="30" x2="32" y2="34" [attr.stroke]="rank().color" stroke-width="2" opacity=".8"/>
                        <line x1="40" y1="30" x2="40" y2="34" [attr.stroke]="rank().color" stroke-width="2" opacity=".8"/>
                        <line x1="48" y1="30" x2="48" y2="34" [attr.stroke]="rank().color" stroke-width="2" opacity=".8"/>
                        <!-- Flames -->
                        <path d="M20 26 Q22 18 24 26" [attr.fill]="'#FF6D00'" opacity=".7"/>
                        <path d="M30 24 Q32 14 34 24" [attr.fill]="'#FF6D00'" opacity=".8"/>
                        <path d="M40 26 Q42 18 44 26" [attr.fill]="'#FF6D00'" opacity=".7"/>
                    }
                    <!-- ─── Tier 7: Золотий (19-21) ─── -->
                    @case (19) {
                        <!-- Toque (chef hat, simple) -->
                        <rect x="22" y="38" width="20" height="10" rx="2" [attr.fill]="rank().color" opacity=".5"/>
                        <path d="M22 38 Q14 36 16 24 Q18 14 32 12 Q46 14 48 24 Q50 36 42 38Z" [attr.fill]="rank().color" opacity=".7"/>
                        <line x1="22" y1="38" x2="42" y2="38" [attr.stroke]="rank().color" stroke-width="2"/>
                    }
                    @case (20) {
                        <!-- Chef hat with star -->
                        <rect x="20" y="38" width="24" height="12" rx="2" [attr.fill]="rank().color" opacity=".5"/>
                        <path d="M20 38 Q10 36 12 22 Q14 10 32 8 Q50 10 52 22 Q54 36 44 38Z" [attr.fill]="rank().color" opacity=".4"/>
                        <line x1="20" y1="38" x2="44" y2="38" [attr.stroke]="rank().color" stroke-width="2.5"/>
                        <!-- Star -->
                        <path d="M32 20 L34 26 L40 26 L35 30 L37 36 L32 32 L27 36 L29 30 L24 26 L30 26Z" [attr.fill]="rank().color"/>
                    }
                    @case (21) {
                        <!-- Restaurant plate with dome hatching -->
                        <ellipse cx="32" cy="44" rx="24" ry="8" [attr.fill]="rank().color" opacity=".3"/>
                        <ellipse cx="32" cy="42" rx="20" ry="6" [attr.fill]="rank().color" opacity=".5"/>
                        <path d="M12 42 Q12 18 32 12 Q52 18 52 42" fill="none" [attr.stroke]="rank().color" stroke-width="2"/>
                        <path d="M18 42 Q18 24 32 18 Q46 24 46 42" fill="none" [attr.stroke]="rank().color" stroke-width="1" opacity=".4"/>
                        <circle cx="32" cy="10" r="3" [attr.fill]="rank().color"/>
                        <!-- Star -->
                        <path d="M32 28 L33.5 32 L38 32 L34.5 35 L36 39 L32 36 L28 39 L29.5 35 L26 32 L30.5 32Z" [attr.fill]="rank().color" opacity=".7"/>
                    }
                    <!-- ─── Tier 8: Срібний (22-24) ─── -->
                    @case (22) {
                        <!-- Michelin star -->
                        <path d="M32 4 L36 20 L52 16 L42 28 L56 36 L40 38 L44 54 L32 44 L20 54 L24 38 L8 36 L22 28 L12 16 L28 20Z"
                              [attr.fill]="rank().color" opacity=".55"/>
                        <circle cx="32" cy="30" r="8" [attr.fill]="rank().color" opacity=".7"/>
                        <path d="M32 24 L33.5 28 L38 28 L34.5 31 L36 35 L32 32 L28 35 L29.5 31 L26 28 L30.5 28Z" [attr.fill]="rank().color"/>
                    }
                    @case (23) {
                        <!-- Palette (art) with food colors -->
                        <path d="M32 8 Q56 8 56 32 Q56 56 32 56 Q8 56 8 32 Q8 8 32 8Z" [attr.fill]="rank().color" opacity=".2"/>
                        <ellipse cx="32" cy="32" rx="22" ry="20" [attr.fill]="rank().color" opacity=".35"/>
                        <circle cx="24" cy="22" r="4" fill="#EF5350" opacity=".7"/>
                        <circle cx="38" cy="20" r="3.5" fill="#FFCA28" opacity=".7"/>
                        <circle cx="44" cy="30" r="3" fill="#66BB6A" opacity=".7"/>
                        <circle cx="40" cy="42" r="3.5" fill="#42A5F5" opacity=".7"/>
                        <circle cx="22" cy="38" r="4" fill="#AB47BC" opacity=".7"/>
                        <!-- Thumb hole -->
                        <circle cx="30" cy="44" r="5" [attr.fill]="rank().color" opacity=".15"/>
                    }
                    @case (24) {
                        <!-- Teaching podium with chef hat -->
                        <rect x="14" y="36" width="36" height="22" rx="3" [attr.fill]="rank().color" opacity=".3"/>
                        <rect x="20" y="32" width="24" height="4" rx="2" [attr.fill]="rank().color" opacity=".5"/>
                        <!-- Mini toque -->
                        <path d="M26 24 Q20 22 22 14 Q24 6 32 4 Q40 6 42 14 Q44 22 38 24Z" [attr.fill]="rank().color" opacity=".7"/>
                        <rect x="26" y="24" width="12" height="6" rx="1" [attr.fill]="rank().color" opacity=".5"/>
                        <!-- Lines on podium -->
                        <line x1="20" y1="42" x2="44" y2="42" [attr.stroke]="rank().color" stroke-width="1.5" opacity=".5"/>
                        <line x1="20" y1="48" x2="44" y2="48" [attr.stroke]="rank().color" stroke-width="1.5" opacity=".5"/>
                    }
                    <!-- ─── Tier 9: Рожево-золотий (25-27) ─── -->
                    @case (25) {
                        <!-- Lotus / zen cook -->
                        <path d="M32 16 Q40 20 42 32 Q40 44 32 48 Q24 44 22 32 Q24 20 32 16Z" [attr.fill]="rank().color" opacity=".5"/>
                        <path d="M18 28 Q24 22 32 28 Q24 34 18 28Z" [attr.fill]="rank().color" opacity=".35"/>
                        <path d="M46 28 Q40 22 32 28 Q40 34 46 28Z" [attr.fill]="rank().color" opacity=".35"/>
                        <path d="M20 38 Q26 32 32 38 Q26 44 20 38Z" [attr.fill]="rank().color" opacity=".25"/>
                        <path d="M44 38 Q38 32 32 38 Q38 44 44 38Z" [attr.fill]="rank().color" opacity=".25"/>
                        <circle cx="32" cy="32" r="5" [attr.fill]="rank().color" opacity=".8"/>
                    }
                    @case (26) {
                        <!-- Diamond with utensils inside -->
                        <path d="M32 4 L56 32 L32 60 L8 32Z" [attr.fill]="rank().color" opacity=".2"/>
                        <path d="M32 10 L50 32 L32 54 L14 32Z" [attr.fill]="rank().color" opacity=".4"/>
                        <path d="M32 16 L44 32 L32 48 L20 32Z" [attr.fill]="rank().color" opacity=".15"/>
                        <!-- Fork + knife cross -->
                        <rect x="26" y="22" width="2" height="20" rx="1" [attr.fill]="rank().color" opacity=".8"/>
                        <rect x="36" y="22" width="2" height="20" rx="1" [attr.fill]="rank().color" opacity=".8"/>
                        <circle cx="32" cy="25" r="2" [attr.fill]="rank().color" opacity=".9"/>
                    }
                    @case (27) {
                        <!-- Grand crown with pot -->
                        <path d="M8 24 L16 36 L24 20 L32 36 L40 20 L48 36 L56 24 L52 48 H12Z" [attr.fill]="rank().color" opacity=".5"/>
                        <rect x="12" y="48" width="40" height="6" rx="2" [attr.fill]="rank().color" opacity=".7"/>
                        <circle cx="16" cy="20" r="3" [attr.fill]="rank().color" opacity=".6"/>
                        <circle cx="32" cy="16" r="3" [attr.fill]="rank().color" opacity=".6"/>
                        <circle cx="48" cy="20" r="3" [attr.fill]="rank().color" opacity=".6"/>
                        <!-- Pot handle hint -->
                        <path d="M24 56 Q24 60 32 60 Q40 60 40 56" fill="none" [attr.stroke]="rank().color" stroke-width="2" opacity=".4"/>
                    }
                    <!-- ─── Tier 10: Легендарний (28-30) ─── -->
                    @case (28) {
                        <!-- Double star with laurel -->
                        <!-- Laurel -->
                        <path d="M10 50 Q6 36 12 24 Q16 18 14 12" fill="none" [attr.stroke]="rank().color" stroke-width="2" opacity=".4"/>
                        <path d="M54 50 Q58 36 52 24 Q48 18 50 12" fill="none" [attr.stroke]="rank().color" stroke-width="2" opacity=".4"/>
                        <path d="M10 44 Q14 40 12 34" fill="none" [attr.stroke]="rank().color" stroke-width="2" opacity=".3"/>
                        <path d="M54 44 Q50 40 52 34" fill="none" [attr.stroke]="rank().color" stroke-width="2" opacity=".3"/>
                        <!-- Stars -->
                        <path d="M24 18 L26 24 L32 24 L27 28 L29 34 L24 30 L19 34 L21 28 L16 24 L22 24Z" [attr.fill]="rank().color" opacity=".7"/>
                        <path d="M40 18 L42 24 L48 24 L43 28 L45 34 L40 30 L35 34 L37 28 L32 24 L38 24Z" [attr.fill]="rank().color" opacity=".7"/>
                        <!-- Big center star -->
                        <path d="M32 32 L34 38 L40 38 L35 42 L37 48 L32 44 L27 48 L29 42 L24 38 L30 38Z" [attr.fill]="rank().color"/>
                    }
                    @case (29) {
                        <!-- Olympus temple with flame -->
                        <!-- Pillars -->
                        <rect x="14" y="26" width="4" height="28" [attr.fill]="rank().color" opacity=".5"/>
                        <rect x="24" y="26" width="4" height="28" [attr.fill]="rank().color" opacity=".5"/>
                        <rect x="36" y="26" width="4" height="28" [attr.fill]="rank().color" opacity=".5"/>
                        <rect x="46" y="26" width="4" height="28" [attr.fill]="rank().color" opacity=".5"/>
                        <!-- Roof -->
                        <path d="M8 26 L32 10 L56 26Z" [attr.fill]="rank().color" opacity=".65"/>
                        <rect x="8" y="24" width="48" height="4" rx="1" [attr.fill]="rank().color" opacity=".75"/>
                        <!-- Base -->
                        <rect x="8" y="52" width="48" height="4" rx="1" [attr.fill]="rank().color" opacity=".75"/>
                        <!-- Eternal flame -->
                        <path d="M32 30 Q36 26 35 34 Q38 30 37 38 Q36 44 32 44 Q28 44 27 38 Q26 30 29 34 Q28 26 32 30Z" fill="#FF6D00" opacity=".7"/>
                        <path d="M32 34 Q34 32 34 38 Q33 42 32 42 Q31 42 30 38 Q30 32 32 34Z" fill="#FFCA28" opacity=".8"/>
                    }
                    @case (30) {
                        <!-- Ultimate: Crown + heart + sparkles -->
                        <!-- Radiating glow -->
                        <circle cx="32" cy="32" r="28" [attr.fill]="rank().color" opacity=".08"/>
                        <circle cx="32" cy="32" r="22" [attr.fill]="rank().color" opacity=".12"/>
                        <!-- Crown -->
                        <path d="M10 28 L18 38 L24 24 L32 40 L40 24 L46 38 L54 28 L50 52 H14Z" [attr.fill]="rank().color" opacity=".45"/>
                        <rect x="14" y="50" width="36" height="6" rx="2" [attr.fill]="rank().color" opacity=".65"/>
                        <!-- Heart -->
                        <path d="M32 30 Q32 22 26 22 Q20 22 20 30 Q20 40 32 48 Q44 40 44 30 Q44 22 38 22 Q32 22 32 30Z" fill="#EF5350" opacity=".7"/>
                        <!-- Sparkles -->
                        <circle cx="10" cy="12" r="2" [attr.fill]="rank().color"/>
                        <circle cx="54" cy="10" r="1.5" [attr.fill]="rank().color" opacity=".7"/>
                        <circle cx="8" cy="46" r="1.5" [attr.fill]="rank().color" opacity=".5"/>
                        <circle cx="56" cy="48" r="2" [attr.fill]="rank().color" opacity=".6"/>
                        <circle cx="52" cy="56" r="1" [attr.fill]="rank().color" opacity=".4"/>
                        <circle cx="12" cy="56" r="1" [attr.fill]="rank().color" opacity=".4"/>
                        <!-- 💛 golden text -->
                        <circle cx="32" cy="38" r="3" fill="#FFD700"/>
                    }
                    @default {
                        <circle cx="32" cy="32" r="16" [attr.fill]="rank().color" opacity=".5"/>
                    }
                }
            </svg>
        </div>
    `,
})
export class RankBadgeComponent {
    readonly rank = input.required<CookRank>();
    readonly size = input<number>(48);
    readonly glowRadius = computed(() => {
        const id = this.rank().id;
        if (id >= 28) return '12px';
        if (id >= 20) return '8px';
        if (id >= 10) return '6px';
        return '4px';
    });
}
