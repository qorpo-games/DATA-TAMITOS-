import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { THERAPIES, CAT_LABEL, Therapy } from '../../data/therapies.data';
import { Evidence } from '../../models/models';

const EV_LABEL: Record<Evidence, string> = { good: '✅ OVERENÉ', warn: '🔬 ZMIEŠANÉ', crit: '⚠️ NEPODLOŽENÉ' };

/** Terapie — katalóg terapií s dôkazovou úrovňou. Glass. (Dáta majú vlastnú stránku.) */
@Component({
  selector: 'th-terapie',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="th-wrap page">
      <header class="reveal d1">
        <span class="kick"><span class="dot"></span> Terapie s dôkazovou úrovňou</span>
        <h1>Terapie a metódy — <span class="grad-text">čo naozaj funguje</span></h1>
        <p class="lead">Kompletný zoznam terapií, ktoré sa pri autizme ponúkajú — ale pri každej ukazujeme
          <b>dôkazovú úroveň</b> a odkaz na zdroj. To bežné adresáre nemajú.</p>
      </header>

      <div class="legend glass reveal d2">
        <span><span class="ev good">✅ OVERENÉ</span> silná/stredná evidencia</span>
        <span><span class="ev warn">🔬 ZMIEŠANÉ</span> slabšia/nekonzistentná</span>
        <span><span class="ev crit">⚠️ NEPODLOŽENÉ</span> bez dôkazov / rizikové</span>
      </div>

      <div class="chips reveal d2">
        <input class="inp" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="🔍 Hľadaj terapiu…" />
        <span class="chip" [class.on]="fEv()==='all'" (click)="fEv.set('all')">Všetky</span>
        <span class="chip" [class.on]="fEv()==='good'" (click)="fEv.set('good')">✅</span>
        <span class="chip" [class.on]="fEv()==='warn'" (click)="fEv.set('warn')">🔬</span>
        <span class="chip" [class.on]="fEv()==='crit'" (click)="fEv.set('crit')">⚠️</span>
      </div>
      <div class="cnt reveal">{{ filtered().length }} terapií · ✅ {{ count('good') }} · 🔬 {{ count('warn') }} · ⚠️ {{ count('crit') }}</div>

      <div class="grid">
        @for (t of filtered(); track t.name) {
          <div class="glass tcard reveal">
            <div class="th"><h3>{{ t.name }}</h3><span class="ev {{ t.ev }}">{{ evLabel(t.ev) }}</span></div>
            <div class="catl">{{ catLabel(t.cat) }}</div>
            <p class="note">{{ t.note }}</p>
            <a class="cite" [href]="t.src.url" target="_blank" rel="noopener">{{ t.src.label }}</a>
          </div>
        } @empty { <div class="empty">Žiadna terapia — skús uvoľniť filtre.</div> }
      </div>
    </div>
  `,
  styles: [`
    .page{padding:56px 0 60px}
    h1{font-weight:800;font-size:clamp(32px,4.6vw,52px);letter-spacing:-1px;margin:16px 0 0}
    .lead{color:var(--dim);font-size:16px;margin:16px 0 0;max-width:660px}
    .legend{display:flex;gap:18px;flex-wrap:wrap;padding:13px 18px;margin:22px 0 18px;font-size:13px;color:var(--dim)}
    .legend span{display:flex;align-items:center;gap:8px}
    .chips{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
    .inp{flex:1;min-width:220px;background:var(--glass);border:1px solid var(--stroke);color:#fff;
      border-radius:12px;padding:11px 16px;font:inherit;font-size:14px;outline:none}
    .inp:focus{border-color:var(--teal)}
    .chip{background:var(--glass);border:1px solid var(--stroke);color:var(--dim);font-size:13px;
      padding:8px 14px;border-radius:100px;cursor:pointer;font-weight:600}
    .chip.on{background:rgba(140,251,218,.14);border-color:var(--teal);color:var(--teal)}
    .cnt{color:var(--mute);font-size:13px;margin-bottom:14px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
    .tcard{padding:16px 17px;display:flex;flex-direction:column;transition:.2s}
    .tcard:hover{transform:translateY(-3px);background:var(--glass-2);border-color:var(--stroke-2)}
    .th{display:flex;align-items:flex-start;gap:8px;margin-bottom:6px}
    .th h3{font-weight:700;font-size:15.5px;flex:1}
    .catl{font-size:11px;color:var(--mute);text-transform:uppercase;letter-spacing:.4px;font-weight:600}
    .note{font-size:13px;color:var(--dim);margin:8px 0 12px;flex:1}
    .empty{color:var(--dim);padding:34px}
  `],
})
export class TerapieComponent {
  therapies = THERAPIES;
  q = signal('');
  fEv = signal<'all' | Evidence>('all');

  filtered = computed(() => {
    const q = this.q().toLowerCase().trim();
    const ev = this.fEv();
    return this.therapies.filter((t) => {
      if (ev !== 'all' && t.ev !== ev) return false;
      if (q && !(t.name + ' ' + t.note).toLowerCase().includes(q)) return false;
      return true;
    });
  });

  count(e: Evidence): number { return this.therapies.filter((t) => t.ev === e).length; }
  evLabel(e: Evidence): string { return EV_LABEL[e]; }
  catLabel(c: Therapy['cat']): string { return CAT_LABEL[c]; }
}
