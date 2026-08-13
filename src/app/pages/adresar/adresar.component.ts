import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';
import { Provider } from '../../models/models';

/** Ukážkové dáta — nahradí ich data.tamitos.com (CVTI + VÚC + ClinicalTrials). */
const SAMPLE: (Provider & { evidence?: 'good' | 'warn' | 'crit'; scope: 'sk' | 'world' })[] = [
  { extId: 'a1', name: 'Autistické centrum Andreas n.o.', kind: 'Diagnostika · terapia', region: 'Bratislavský', city: 'Bratislava', source: 'NCZI', evidence: 'good', scope: 'sk' },
  { extId: 'a2', name: 'SPOSA — pomoc osobám s autizmom', kind: 'Komunita · poradenstvo', region: 'Bratislavský', city: 'Bratislava', source: 'register OZ', evidence: 'good', scope: 'sk' },
  { extId: 'a3', name: 'Centrum včasnej intervencie', kind: 'Včasná intervencia', region: 'Žilinský', city: 'Žilina', source: 'register soc. služieb', evidence: 'good', scope: 'sk' },
  { extId: 'a4', name: 'Lekárska genetika (CMA, Fragile X)', kind: 'Genetika', region: 'Žilinský', city: 'Martin', source: 'NCZI', evidence: 'good', scope: 'sk' },
  { extId: 'a5', name: 'ABA terapeut (BCBA)', kind: 'ABA terapia', region: 'Košický', city: 'Košice', source: 'prispievateľ', evidence: 'warn', scope: 'sk' },
  { extId: 'a6', name: 'CŠPP — poradenstvo', kind: 'Škola · diagnostika', region: 'Prešovský', city: 'Prešov', source: 'register škôl', evidence: 'good', scope: 'sk' },
  { extId: 'w1', name: 'ClinicalTrials.gov — FMT & autizmus', kind: 'Klinická štúdia', region: '—', city: 'medzinárodné', source: 'NIH', evidence: 'warn', scope: 'world' },
  { extId: 'w2', name: 'SPARK — genetická štúdia', kind: 'Klinická štúdia', region: '—', city: 'USA (online)', source: 'Simons Foundation', evidence: 'good', scope: 'world' },
  { extId: 'w3', name: 'Komerčná klinika — kmeňové bunky', kind: 'Terapia', region: '—', city: 'zahraničie', source: 'redakcia', evidence: 'crit', scope: 'world' },
];

@Component({
  selector: 'th-adresar',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="th-wrap page">
      <header class="reveal d1">
        <span class="kick"><span class="dot"></span> Kde čo nájdeš</span>
        <h1>Adresár <span class="grad-text">služieb</span></h1>
        <p class="lead">Centrá, terapeuti a klinické štúdie — na Slovensku aj vo svete. Pri klinikách a terapiách
          zobrazujeme dôkazovú úroveň. <b>Ukážkové dáta</b>; ostrá verzia sa napojí na data.tamitos.com.</p>
      </header>

      <div class="scope reveal d2">
        <button [class.on]="scope()==='sk'" (click)="scope.set('sk')">🇸🇰 Slovensko</button>
        <button [class.on]="scope()==='world'" (click)="scope.set('world')">🌍 Vo svete</button>
      </div>

      <div class="filters reveal d2">
        <input class="inp" [(ngModel)]="q" placeholder="🔍 Hľadaj názov, mesto, službu…" />
        @if (scope()==='sk') {
          <select class="inp" [(ngModel)]="region">
            <option value="">Celé Slovensko</option>
            @for (r of regions; track r) { <option>{{ r }}</option> }
          </select>
        }
      </div>

      <div class="cnt reveal">{{ filtered().length }} záznamov</div>
      <div class="grid">
        @for (p of filtered(); track p.extId) {
          <div class="glass card reveal">
            <div class="ch">
              <div class="lg">{{ p.name.charAt(0) }}</div>
              <div class="info"><h3>{{ p.name }}</h3><div class="loc">📍 {{ p.city }}{{ p.region!=='—' ? ' · ' + p.region : '' }}</div></div>
              @if (p.evidence) { <span class="ev {{ p.evidence }}">{{ evLabel(p.evidence) }}</span> }
            </div>
            <div class="tags"><span class="tag">{{ p.kind }}</span></div>
            <div class="foot"><span class="src">zdroj: {{ p.source }}</span></div>
          </div>
        } @empty { <div class="empty">Žiadny výsledok — skús uvoľniť filtre.</div> }
      </div>
    </div>
  `,
  styles: [`
    .page{padding:56px 0 60px;max-width:1080px;margin:0 auto}
    h1{font-weight:800;font-size:clamp(34px,5vw,56px);letter-spacing:-1px;margin:16px 0 0}
    .lead{color:var(--dim);font-size:16px;margin:16px 0 0;max-width:640px}
    .scope{display:flex;gap:10px;margin-top:24px}
    .scope button{background:var(--glass);border:1px solid var(--stroke);color:var(--dim);
      padding:9px 18px;border-radius:100px;font-weight:600;font-size:14px;cursor:pointer}
    .scope button.on{background:#fff;color:#12091c;border-color:transparent}
    .filters{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
    .inp{background:var(--glass);border:1px solid var(--stroke);color:#fff;border-radius:12px;
      padding:12px 16px;font:inherit;font-size:14px;outline:none}
    .filters .inp:first-child{flex:1;min-width:220px}
    .inp:focus{border-color:var(--teal)}
    .cnt{color:var(--mute);font-size:13px;margin:18px 0 12px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
    .card{padding:16px 18px;transition:.2s}
    .card:hover{transform:translateY(-3px);background:var(--glass-2);border-color:var(--stroke-2)}
    .ch{display:flex;gap:12px;align-items:flex-start}
    .lg{width:44px;height:44px;border-radius:12px;flex:0 0 auto;display:grid;place-items:center;font-weight:800;
      color:#12091c;background:linear-gradient(135deg,var(--violet),var(--blue))}
    .info{flex:1;min-width:0} .info h3{font-weight:700;font-size:15.5px}
    .loc{font-size:12.5px;color:var(--dim);margin-top:2px}
    .tags{margin:12px 0}
    .tag{font-size:12px;color:var(--dim);background:rgba(255,255,255,.05);border:1px solid var(--stroke);padding:4px 10px;border-radius:100px}
    .foot{border-top:1px solid var(--stroke);padding-top:10px;margin-top:4px}
    .src{font-size:11.5px;color:var(--mute)}
    .empty{color:var(--dim);padding:34px}
    @media(max-width:600px){.grid{grid-template-columns:1fr}}
  `],
})
export class AdresarComponent implements OnInit {
  private data = inject(DataService);
  scope = signal<'sk' | 'world'>('sk');
  q = ''; region = '';
  regions = ['Bratislavský', 'Trnavský', 'Trenčiansky', 'Nitriansky', 'Žilinský', 'Banskobystrický', 'Prešovský', 'Košický'];
  private all = signal(SAMPLE);

  filtered = computed(() => {
    const q = this.q.toLowerCase();
    return this.all().filter((p) => {
      if (p.scope !== this.scope()) return false;
      if (this.scope() === 'sk' && this.region && p.region !== this.region) return false;
      if (q && !(p.name + p.city + p.kind).toLowerCase().includes(q)) return false;
      return true;
    });
  });

  ngOnInit(): void {
    // po nasadení: napojiť reálne dáta
    this.data.getProviders().subscribe({ next: () => {}, error: () => {} });
  }
  evLabel(e: string): string {
    return e === 'good' ? '✅' : e === 'warn' ? '🔬' : '⚠️';
  }
}
