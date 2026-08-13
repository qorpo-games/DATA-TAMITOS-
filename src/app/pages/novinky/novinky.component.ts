import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { NewsService, Article } from '../../core/news.service';

/** Ukážkový feed — nahradí ho data.tamitos.com (denný RSS + TAMITOS blog). */
const SAMPLE: Article[] = [
  { title: 'Veľká genetická štúdia potvrdzuje úlohu de novo mutácií pri ASD', url: 'https://www.thetransmitter.org/spectrum/', summary: 'Analýza vyše 40 000 rodín ukazuje silné rizikové faktory (SCN2A, SHANK3).', source: 'The Transmitter', kind: 'research', lang: 'en', is_new: 1 },
  { title: 'Skorá behaviorálna intervencia zlepšuje komunikáciu u batoliat', url: 'https://www.sciencedaily.com/news/mind_brain/autism/', summary: 'Randomizovaná štúdia (ESDM) potvrdila zlepšenie jazyka pri začatí pred 3. rokom.', source: 'ScienceDaily', kind: 'research', lang: 'en', is_new: 1 },
  { title: 'List rodičom, ktorí len začínajú', url: 'https://tamitos.com/sk/blog', summary: 'Úprimný text pre rodiny na začiatku cesty s autizmom.', source: 'TAMITOS Novinky a tipy', kind: 'tamitos', lang: 'sk', is_new: 1 },
  { title: 'Fekálna transplantácia (FMT): sľubné, ale predbežné výsledky', url: 'https://www.nature.com/subjects/autism-spectrum-disorders', summary: 'Malá otvorená štúdia — bez kontrolnej skupiny. Zatiaľ len hypotéza.', source: 'Nature', kind: 'research', lang: 'en' },
  { title: 'Ako pomôcť dieťaťu pomenovať veľké pocity', url: 'https://tamitos.com/sk/blog', summary: 'Praktický tip z TAMITOS blogu.', source: 'TAMITOS Novinky a tipy', kind: 'tamitos', lang: 'sk' },
  { title: 'Upozornenie: kmeňové bunky ako „liek" na autizmus', url: 'https://autism.org/', summary: 'Komerčné kliniky sľubujú vyliečenie. Dôkazy slabé, riziká reálne.', source: 'Autism Research Institute', kind: 'news', lang: 'en' },
];

@Component({
  selector: 'th-novinky',
  standalone: true,
  template: `
    <div class="th-wrap page">
      <header class="reveal d1">
        <span class="kick"><span class="dot"></span> Svet autizmu · aktualizované denne</span>
        <h1>Novinky <span class="grad-text">a tipy</span></h1>
        <p class="lead">Novinky zo sveta autizmu preložené do slovenčiny, s odkazom na originál, plus tipy z TAMITOS blogu.
          Feed sa aktualizuje automaticky každý deň o 05:00. <b>Ukážkový obsah</b>; napojí sa na data.tamitos.com.</p>
      </header>

      <div class="tabs reveal d2">
        <span class="tab" [class.on]="f()==='all'" (click)="f.set('all')">Všetko</span>
        <span class="tab" [class.on]="f()==='research'" (click)="f.set('research')">🔬 Výskum</span>
        <span class="tab" [class.on]="f()==='news'" (click)="f.set('news')">🌍 Novinky</span>
        <span class="tab" [class.on]="f()==='tamitos'" (click)="f.set('tamitos')">💙 TAMITOS blog</span>
      </div>

      <div class="feed">
        @for (a of filtered(); track a.url + a.title) {
          <a class="glass card reveal" [href]="a.url" target="_blank" rel="noopener">
            <div class="ch">
              <span class="badge {{ a.kind }}">{{ kindLabel(a.kind) }}</span>
              @if (a.is_new) { <span class="new">● NOVÉ</span> }
              @if (a.lang==='en') { <span class="tr">🌐 preložené do SK</span> }
              <span class="src">{{ a.source }}</span>
            </div>
            <h3>{{ a.title }}</h3>
            @if (a.summary) { <p class="sum">{{ a.summary }}</p> }
            <span class="open">otvoriť originál →</span>
          </a>
        }
      </div>
    </div>
  `,
  styles: [`
    .page{padding:56px 0 60px;max-width:820px;margin:0 auto}
    h1{font-weight:800;font-size:clamp(34px,5vw,56px);letter-spacing:-1px;margin:16px 0 0}
    .lead{color:var(--dim);font-size:16px;margin:16px 0 0}
    .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0 18px}
    .tab{background:var(--glass);border:1px solid var(--stroke);color:var(--dim);font-size:13.5px;font-weight:600;
      padding:8px 15px;border-radius:100px;cursor:pointer}
    .tab.on{background:#fff;color:#12091c;border-color:transparent}
    .feed{display:flex;flex-direction:column;gap:12px}
    .card{padding:18px 20px;display:block;color:inherit;transition:.2s}
    .card:hover{transform:translateY(-3px);background:var(--glass-2);border-color:var(--stroke-2)}
    .ch{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
    .badge{font-size:11px;font-weight:700;padding:4px 10px;border-radius:100px;border:1px solid var(--stroke)}
    .badge.research{color:var(--blue)} .badge.news{color:var(--orange)} .badge.tamitos{color:var(--violet)}
    .new{font-size:11px;font-weight:800;color:var(--good)}
    .tr{font-size:11px;color:var(--teal);font-weight:600}
    .src{margin-left:auto;font-size:12px;color:var(--mute)}
    h3{font-weight:700;font-size:17px;line-height:1.3}
    .sum{font-size:14px;color:var(--dim);margin-top:6px}
    .open{display:inline-block;margin-top:10px;font-size:12.5px;color:var(--teal);font-weight:600}
  `],
})
export class NovinkyComponent implements OnInit {
  private svc = inject(NewsService);
  f = signal<'all' | 'research' | 'news' | 'tamitos'>('all');
  private items = signal<Article[]>(SAMPLE);

  filtered = computed(() => {
    const f = this.f();
    return this.items().filter((a) => f === 'all' || a.kind === f);
  });

  kindLabel(k: string): string {
    return k === 'research' ? '🔬 Výskum' : k === 'tamitos' ? '💙 TAMITOS' : '🌍 Novinka';
  }

  ngOnInit(): void {
    this.svc.list().subscribe({ next: (r) => { if (r.items?.length) this.items.set(r.items); }, error: () => {} });
  }
}
