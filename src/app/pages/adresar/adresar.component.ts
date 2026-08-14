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
  url?: string;
}

/** Adresár — živé SK centrá (CVTI register CPP/CŠPP) + svetové zdroje. Mapa cez Google (bez API kľúča). */
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
          plus svetové zdroje a štúdie. Pri každom centre je mapa. Telefóny a ďalšie kategórie dopĺňame priebežne.</p>
      </header>

      <div class="scope reveal d2">
        <button [class.on]="scope()==='sk'" (click)="scope.set('sk')">🇸🇰 Slovensko ({{ skCount() }})</button>
        <button [class.on]="scope()==='world'" (click)="scope.set('world')">🌍 Vo svete</button>
      </div>

      <div class="filters reveal d2">
        <input class="inp" [(ngModel)]="q" placeholder="🔍 Hľadaj názov, mesto, adresu, službu…" />
        @if (scope()==='sk') {
          <select class="inp" [(ngModel)]="region">
            <option value="">Celé Slovensko</option>
            @for (r of regions; track r) { <option>{{ r }}</option> }
          </select>
        }
      </div>

      <div class="cnt reveal">{{ filtered().length }} záznamov</div>
      <div class="grid">
        @for (p of filtered(); track p.id) {
          <div class="glass card reveal">
            <div class="ch">
              <div class="lg">{{ p.name.charAt(0) }}</div>
              <div class="info">
                <h3>{{ p.name }}</h3>
                <div class="loc">📍 {{ p.city }}{{ p.region && p.region!=='—' ? ' · ' + p.region : '' }}</div>
                @if (p.address) { <div class="addr">{{ p.address }}</div> }
              </div>
              @if (p.evidence) { <span class="ev {{ p.evidence }}">{{ evLabel(p.evidence) }}</span> }
            </div>
            <div class="tags"><span class="tag">{{ p.kind }}</span></div>

            @if (openId()===p.id && mapUrl()) {
              <iframe class="map" [src]="mapUrl()" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            }

            <div class="foot">
              <span class="src">zdroj: {{ p.source }}</span>
              @if (p.scope==='sk' && p.address) {
                <span class="acts">
                  <button class="mbtn" (click)="toggleMap(p)">{{ openId()===p.id ? '▲ skryť mapu' : '📍 mapa' }}</button>
                  <a class="mbtn" [href]="gmaps(p)" target="_blank" rel="noopener">otvoriť v Google Mapách →</a>
                </span>
              }
              @if (p.url) { <a class="mbtn" [href]="p.url" target="_blank" rel="noopener">web →</a> }
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
    .card{padding:16px 18px;transition:.2s}
    .card:hover{border-color:var(--stroke-2)}
    .ch{display:flex;gap:12px;align-items:flex-start}
    .lg{width:44px;height:44px;border-radius:12px;flex:0 0 auto;display:grid;place-items:center;font-weight:800;
      color:#12091c;background:linear-gradient(135deg,var(--violet),var(--blue))}
    .info{flex:1;min-width:0} .info h3{font-weight:700;font-size:15.5px;line-height:1.3}
    .loc{font-size:12.5px;color:var(--dim);margin-top:3px}
    .addr{font-size:12px;color:var(--mute);margin-top:2px}
    .tags{margin:12px 0}
    .tag{font-size:12px;color:var(--dim);background:rgba(255,255,255,.05);border:1px solid var(--stroke);padding:4px 10px;border-radius:100px}
    .map{width:100%;height:200px;border:0;border-radius:12px;margin:6px 0 12px;background:#0c0913}
    .foot{border-top:1px solid var(--stroke);padding-top:10px;margin-top:4px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .src{font-size:11.5px;color:var(--mute)}
    .acts{display:flex;gap:10px;margin-left:auto;flex-wrap:wrap}
    .mbtn{background:none;border:none;color:var(--teal);font:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:0}
    .empty{color:var(--dim);padding:34px}
    @media(max-width:600px){.grid{grid-template-columns:1fr}}
  `],
})
export class AdresarComponent implements OnInit {
  private data = inject(DataService);
  private san = inject(DomSanitizer);

  scope = signal<'sk' | 'world'>('sk');
  q = ''; region = '';
  regions = ['Bratislavský', 'Trnavský', 'Trenčiansky', 'Nitriansky', 'Žilinský', 'Banskobystrický', 'Prešovský', 'Košický'];

  private live = signal<Row[]>([]);
  openId = signal<string | null>(null);
  mapUrl = signal<SafeResourceUrl | null>(null);

  private WORLD: Row[] = [
    { id: 'w1', name: 'ClinicalTrials.gov — FMT & autizmus', kind: 'Klinická štúdia', region: '—', city: 'medzinárodné', source: 'NIH', evidence: 'warn', scope: 'world', url: 'https://clinicaltrials.gov/' },
    { id: 'w2', name: 'SPARK — genetická štúdia', kind: 'Klinická štúdia', region: '—', city: 'USA (online)', source: 'Simons Foundation', evidence: 'good', scope: 'world', url: 'https://sparkforautism.org/' },
    { id: 'w3', name: 'Autism Research Institute', kind: 'Výskum · zdroje', region: '—', city: 'USA', source: 'ARI', evidence: 'good', scope: 'world', url: 'https://autism.org/' },
  ];

  private all = computed<Row[]>(() => [...this.live(), ...this.WORLD]);
  skCount = computed(() => this.live().length);

  filtered = computed(() => {
    const q = this.q.toLowerCase().trim();
    return this.all().filter((p) => {
      if (p.scope !== this.scope()) return false;
      if (this.scope() === 'sk' && this.region && p.region !== this.region) return false;
      if (q && !((p.name + ' ' + p.city + ' ' + p.kind + ' ' + (p.address || '')).toLowerCase().includes(q))) return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.data.listProviders(500).subscribe({
      next: (items) => {
        const rows: Row[] = (items || []).map((p: any, i: number) => ({
          id: p.ext_id || ('p' + i),
          name: p.name || 'Neznáme centrum',
          kind: p.kind || 'Poradenstvo',
          city: p.city || '',
          region: p.region || '',
          address: p.address || '',
          source: p.source || 'register',
          evidence: 'good',
          scope: 'sk',
        }));
        this.live.set(rows);
      },
      error: () => {},
    });
  }

  private query(p: Row): string {
    return encodeURIComponent([p.name, p.address, p.city, 'Slovensko'].filter(Boolean).join(', '));
  }
  gmaps(p: Row): string {
    return 'https://www.google.com/maps/search/?api=1&query=' + this.query(p);
  }
  toggleMap(p: Row): void {
    if (this.openId() === p.id) { this.openId.set(null); this.mapUrl.set(null); return; }
    this.openId.set(p.id);
    this.mapUrl.set(this.san.bypassSecurityTrustResourceUrl(
      'https://www.google.com/maps?q=' + this.query(p) + '&output=embed'));
  }
  evLabel(e: string): string {
    return e === 'good' ? '✅' : e === 'warn' ? '🔬' : '⚠️';
  }
}
