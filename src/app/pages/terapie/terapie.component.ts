import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CanvasJSAngularChartsModule } from '@canvasjs/angular-charts';
import { THERAPIES, CAT_LABEL, Therapy } from '../../data/therapies.data';
import { Evidence } from '../../models/models';
import { byYear, byAge, byRegion, PREVALENCE_SOURCE, PREVALENCE_YEAR } from '../../data/prevalence.data';

const EV_LABEL: Record<Evidence, string> = { good: '✅ OVERENÉ', warn: '🔬 ZMIEŠANÉ', crit: '⚠️ NEPODLOŽENÉ' };

/** Terapie & Dáta — katalóg s dôkazom + prevalenčný dashboard (CanvasJS). Glass. */
@Component({
  selector: 'th-terapie',
  standalone: true,
  imports: [FormsModule, CanvasJSAngularChartsModule],
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
        <input class="inp" [(ngModel)]="q" placeholder="🔍 Hľadaj terapiu…" />
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
        }
      </div>

      <!-- DASHBOARD -->
      <section class="dash">
        <h2 class="reveal">📊 Autizmus na Slovensku v číslach</h2>
        <p class="dsub reveal">Evidované diagnózy F84.x. Verejný agregát — <a [href]="prevSrc.url" target="_blank" rel="noopener">{{ prevSrc.label }}</a>, rok {{ prevYear }}. <b>Ukážkové čísla</b>, pri nasadení sa naplnía z NCZI.</p>

        <div class="stats reveal">
          <div class="glass stat"><div class="v grad-text">9 400</div><div class="k">evidovaných (2023)</div></div>
          <div class="glass stat"><div class="v grad-text">~1:100</div><div class="k">prevalencia</div></div>
          <div class="glass stat"><div class="v grad-text">10–14</div><div class="k">najväčšia veková skupina (r.)</div></div>
          <div class="glass stat"><div class="v" style="color:var(--warn)">4,5</div><div class="k">priemerný vek diagnózy (cieľ &lt;3)</div></div>
        </div>

        <div class="charts">
          <div class="glass panel wide reveal"><h4>Vývoj podľa roku</h4><canvasjs-chart [options]="yearChart" [styles]="{width:'100%',height:'240px'}"></canvasjs-chart></div>
          <div class="glass panel reveal"><h4>Podľa kraja</h4><canvasjs-chart [options]="regionChart" [styles]="{width:'100%',height:'260px'}"></canvasjs-chart></div>
          <div class="glass panel reveal"><h4>Podľa veku</h4><canvasjs-chart [options]="ageChart" [styles]="{width:'100%',height:'260px'}"></canvasjs-chart></div>
        </div>
      </section>
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
    .dash{margin-top:56px}
    .dash>h2{font-weight:800;font-size:26px;letter-spacing:-.5px}
    .dsub{color:var(--dim);font-size:14px;margin:8px 0 18px}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
    .stat{padding:16px 18px}
    .stat .v{font-size:30px;font-weight:800;letter-spacing:-.6px}
    .stat .k{font-size:12px;color:var(--dim);margin-top:2px}
    .charts{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .panel{padding:16px 18px}.panel.wide{grid-column:1/-1}
    .panel h4{font-size:14.5px;margin-bottom:10px}
    @media(max-width:820px){.charts{grid-template-columns:1fr}}
  `],
})
export class TerapieComponent {
  therapies = THERAPIES;
  q = '';
  fEv = signal<'all' | Evidence>('all');
  prevSrc = PREVALENCE_SOURCE;
  prevYear = PREVALENCE_YEAR;

  filtered = computed(() => {
    const q = this.q.toLowerCase();
    return this.therapies.filter((t) => {
      if (this.fEv() !== 'all' && t.ev !== this.fEv()) return false;
      if (q && !(t.name + t.note).toLowerCase().includes(q)) return false;
      return true;
    });
  });

  count(e: Evidence): number { return this.therapies.filter((t) => t.ev === e).length; }
  evLabel(e: Evidence): string { return EV_LABEL[e]; }
  catLabel(c: Therapy['cat']): string { return CAT_LABEL[c]; }

  private base = {
    animationEnabled: true,
    backgroundColor: 'transparent',
    axisX: { labelFontColor: '#8b98a9', lineColor: 'rgba(255,255,255,.16)', tickColor: 'transparent' },
    axisY: { labelFontColor: '#8b98a9', gridColor: 'rgba(255,255,255,.08)', lineColor: 'transparent', tickColor: 'transparent' },
  };
  yearChart = { ...this.base, data: [{ type: 'column', color: '#8cfbda', dataPoints: byYear.map((p) => ({ label: p.label, y: p.value })) }] };
  regionChart = { ...this.base, data: [{ type: 'bar', color: '#cbb8ff', dataPoints: byRegion.map((p) => ({ label: p.label, y: p.value })) }] };
  ageChart = { ...this.base, data: [{ type: 'bar', color: '#8ccbfd', dataPoints: byAge.map((p) => ({ label: p.label, y: p.value })) }] };
}
