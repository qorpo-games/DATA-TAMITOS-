import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DataService } from '../../core/data.service';

interface Row {
  id: string;
  name: string;
  kind: string;
  city: string;
  region: string;
  address?: string;
  source: string;
  evidence?: 'good' | 'warn' | 'crit';
  scope: 'sk' | 'world';
  url?: string;             // oficiálny web (ak je)
  webSearch?: string;       // fallback: nájsť web cez Google
  mapUrl?: SafeResourceUrl; // embed URL (len pri SK s adresou)
  mapLink?: string;         // link do Google Máp
}

/** Adresár — živé SK centrá (CVTI register CPP/CŠPP) + svetové zdroje.
 *  Mapa je otvorená v každej karte, ale iframe má loading="lazy" -> načíta sa
 *  až keď sa karta priblíži k viewportu, takže 161 máp web nespomalí.
 *  Hlavička karty má pevnú výšku (názov orezaný na 2 riadky), aby mapy
 *  vždy začínali na rovnakej vertikálnej pozícii. */
@Component({
  selector: 'th-adresar',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="th-wrap page">
      <header class="reveal d1">
        <span class="kick"><span class="dot"></span> Kde čo nájdeš</span>
        <h1>Adresár <span class="grad-text">služieb</span></h1>
        <p class="lead">Centrá poradenstva a prevencie (CPP/CŠPP) na Slovensku z <b>oficiálneho registra CVTI</b>,
          plus svetové zdroje a štúdie. Pri každom centre je mapa a odkaz na web. Telefóny dopĺňame priebežne.</p>
      </header>

      <div class="scope reveal d2">
        <button [class.on]="scope()==='sk'" (click)="scope.set('sk')">🇸🇰 Slovensko ({{ skCount() }})</button>
        <button [class.on]="scope()==='world'" (click)="scope.set('world')">🌍 Vo svete</button>
      </div>

      <div class="filters reveal d2">
        <input class="inp" [ngModel]="q()" (ngModelChange)="q.set($event)"
          placeholder="🔍 Hľadaj názov, mesto, adresu, službu…" />
        @if (scope()==='sk') {
          <select class="inp" [ngModel]="region()" (ngModelChange)="region.set($event)">
            <option value="">Celé Slovensko</option>
            @for (r of regions; track r) { <option [value]="r">{{ r }}</option> }
          </select>
        }
      </div>

      <div class="cnt reveal">{{ filtered().length }} záznamov</div>
      <div class="grid">
        @for (p of filtered(); track p.id) {
          <div class="glass card reveal">
            <div class="ch">
              <div class="lg" [class.world]="p.scope==='world'">
                @if (p.scope==='world') {
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"></path>
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 21h18M5 21V7l7-4 7 4v14"></path><path d="M9 21v-5h6v5"></path><path d="M9 9h.01M15 9h.01M9 12.5h.01M15 12.5h.01"></path>
                  </svg>
                }
              </div>
              <div class="info">
                <h3 [attr.title]="p.name">{{ p.name }}</h3>
                <div class="loc">📍 {{ p.city }}{{ p.region && p.region!=='—' ? ' · ' + p.region : '' }}</div>
                <div class="addr">{{ p.address || ' ' }}</div>
              </div>
              @if (p.evidence) { <span class="ev {{ p.evidence }}">{{ evLabel(p.evidence) }}</span> }
            </div>
            <div class="tags"><span class="tag">{{ p.kind }}</span></div>

            @if (p.mapUrl) {
              <iframe class="map" [src]="p.mapUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                title="Mapa: {{ p.name }}"></iframe>
            }

            <div class="foot">
              <span class="src">zdroj: {{ p.source }}</span>
              @if (p.url) {
                <a class="mbtn primary" [href]="p.url" target="_blank" rel="noopener">🌐 web →</a>
              } @else if (p.webSearch) {
                <a class="mbtn" [href]="p.webSearch" target="_blank" rel="noopener">🌐 nájsť web →</a>
              }
              @if (p.mapLink) { <a class="mbtn" [href]="p.mapLink" target="_blank" rel="noopener">🗺️ mapa →</a> }
            </div>
          </div>
        } @empty { <div class="empty">Žiadny výsledok — skús uvoľniť filtre.</div> }
      </div>
    </div>
  `,
  styles: [`
    .page{padding:56px 0 60px;max-width:1080px;margin:0 auto}
    h1{font-weight:800;font-size:clamp(34px,5vw,56px);letter-spacing:-1px;margin:16px 0 0}
    .lead{color:var(--dim);font-size:16px;margin:16px 0 0;max-width:680px}
    .scope{display:flex;gap:10px;margin-top:24px;flex-wrap:wrap}
    .scope button{background:var(--glass);border:1px solid var(--stroke);color:var(--dim);
      padding:9px 18px;border-radius:100px;font-weight:600;font-size:14px;cursor:pointer}
    .scope button.on{background:#fff;color:#12091c;border-color:transparent}
    .filters{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
    .inp{background:var(--glass);border:1px solid var(--stroke);color:#fff;border-radius:12px;
      padding:12px 16px;font:inherit;font-size:14px;outline:none}
    .filters .inp:first-child{flex:1;min-width:220px}
    .inp:focus{border-color:var(--teal)}
    .cnt{color:var(--mute);font-size:13px;margin:18px 0 12px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
    .card{padding:16px 18px;transition:.2s;display:flex;flex-direction:column}
    .card:hover{border-color:var(--stroke-2)}
    /* pevná výška hlavičky -> mapy začínajú vždy na rovnakej pozícii;
       názov má 3 riadky, aby bolo vidno odlišujúcu časť (napr. „…CENADA") */
    .ch{display:flex;gap:12px;align-items:flex-start;height:98px}
    .lg{width:46px;height:46px;border-radius:13px;flex:0 0 auto;display:grid;place-items:center;
      color:#fff;background:linear-gradient(135deg,var(--violet),var(--blue));
      box-shadow:0 6px 18px -8px rgba(120,110,255,.7)}
    .lg.world{background:linear-gradient(135deg,var(--teal),var(--blue))}
    .info{flex:1;min-width:0;overflow:hidden}
    .info h3{font-weight:700;font-size:15px;line-height:1.26;
      display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
    .loc{font-size:12.5px;color:var(--dim);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .addr{font-size:12px;color:var(--mute);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tags{margin:12px 0;height:26px}
    .tag{font-size:12px;color:var(--dim);background:rgba(255,255,255,.05);border:1px solid var(--stroke);padding:4px 10px;border-radius:100px}
    .map{width:100%;height:180px;border:0;border-radius:12px;margin:0 0 12px;background:#0c0913}
    .foot{border-top:1px solid var(--stroke);padding-top:10px;margin-top:auto;display:flex;flex-wrap:wrap;gap:14px;align-items:center}
    .src{font-size:11.5px;color:var(--mute)}
    .mbtn{background:none;border:none;color:var(--teal);font:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:0;text-decoration:none}
    .mbtn.primary{margin-left:auto}
    .foot .mbtn:not(.primary):first-of-type{margin-left:auto}
    .empty{color:var(--dim);padding:34px}
    @media(max-width:600px){.grid{grid-template-columns:1fr}}
  `],
})
export class AdresarComponent implements OnInit {
  private data = inject(DataService);
  private san = inject(DomSanitizer);

  scope = signal<'sk' | 'world'>('sk');
  q = signal('');
  region = signal('');
  regions = ['Bratislavský', 'Trnavský', 'Trenčiansky', 'Nitriansky', 'Žilinský', 'Banskobystrický', 'Prešovský', 'Košický'];

  private live = signal<Row[]>([]);

  private WORLD: Row[] = [
    { id: 'w1', name: 'ClinicalTrials.gov — FMT & autizmus', kind: 'Klinická štúdia', region: '—', city: 'medzinárodné', source: 'NIH', evidence: 'warn', scope: 'world', url: 'https://clinicaltrials.gov/' },
    { id: 'w2', name: 'SPARK — genetická štúdia', kind: 'Klinická štúdia', region: '—', city: 'USA (online)', source: 'Simons Foundation', evidence: 'good', scope: 'world', url: 'https://sparkforautism.org/' },
    { id: 'w3', name: 'Autism Research Institute', kind: 'Výskum · zdroje', region: '—', city: 'USA', source: 'ARI', evidence: 'good', scope: 'world', url: 'https://autism.org/' },
  ];

  private all = computed<Row[]>(() => [...this.live(), ...this.WORLD]);
  skCount = computed(() => this.live().length);

  /** lowercase + bez diakritiky -> hľadanie „zil" nájde „Žilina". */
  private norm(s: string): string {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  filtered = computed(() => {
    const q = this.norm(this.q().trim());
    const region = this.norm(this.region());
    const scope = this.scope();
    return this.all().filter((p) => {
      if (p.scope !== scope) return false;
      // stored region je napr. „Žilinský kraj", dropdown „Žilinský" -> porovnaj bez „ kraj"
      if (scope === 'sk' && region) {
        const rp = this.norm(p.region).replace(/\s*kraj$/, '').trim();
        if (rp !== region) return false;
      }
      if (q) {
        const hay = this.norm(p.name + ' ' + p.city + ' ' + p.kind + ' ' + (p.address || ''));
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.data.listProviders(500).subscribe({
      next: (items) => {
        const rows: Row[] = (items || []).map((p: any, i: number) => {
          const address = p.address || '';
          const city = p.city || '';
          const name = p.name || 'Neznáme centrum';
          const q = encodeURIComponent([name, address, city, 'Slovensko'].filter(Boolean).join(', '));
          const ws = encodeURIComponent([name, city].filter(Boolean).join(' '));
          return {
            id: p.ext_id || ('p' + i),
            name, kind: p.kind || 'Poradenstvo', city,
            region: p.region || '', address,
            source: p.source || 'register',
            evidence: 'good', scope: 'sk',
            url: p.url || p.web || undefined,
            webSearch: 'https://www.google.com/search?q=' + ws,
            mapUrl: address ? this.san.bypassSecurityTrustResourceUrl(
              'https://www.google.com/maps?q=' + q + '&output=embed') : undefined,
            mapLink: address ? 'https://www.google.com/maps/search/?api=1&query=' + q : undefined,
          } as Row;
        });
        this.live.set(rows);
      },
      error: () => {},
    });
  }

  evLabel(e: string): string {
    return e === 'good' ? '✅' : e === 'warn' ? '🔬' : '⚠️';
  }
}
