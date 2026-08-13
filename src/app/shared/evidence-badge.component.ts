import { Component, Input } from '@angular/core';
import { Evidence } from '../models/models';

const LABELS: Record<Evidence, string> = {
  good: '✅ OVERENÉ',
  warn: '🔬 ZMIEŠANÉ',
  crit: '⚠️ NEPODLOŽENÉ',
};

/** Znak dôkazovej úrovne — jadro celého portálu (to, čo konkurencia nemá). */
@Component({
  selector: 'th-evidence-badge',
  standalone: true,
  template: `<span class="ev" [class.g]="level === 'good'" [class.w]="level === 'warn'" [class.c]="level === 'crit'">{{ text }}</span>`,
  styles: [
    `
      .ev {
        font-size: 11px;
        font-weight: 800;
        padding: 3px 9px;
        border-radius: 6px;
        white-space: nowrap;
      }
      .g {
        background: var(--good-soft);
        color: var(--good);
      }
      .w {
        background: var(--warn-soft);
        color: var(--warn);
      }
      .c {
        background: var(--crit-soft);
        color: var(--crit);
      }
    `,
  ],
})
export class EvidenceBadgeComponent {
  @Input({ required: true }) level!: Evidence;
  get text(): string {
    return LABELS[this.level];
  }
}
