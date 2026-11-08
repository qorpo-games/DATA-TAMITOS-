import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, shareReplay, switchMap, tap } from 'rxjs';

interface Entry {
  id: string; orphacode: string; level: string;
  lifecycle: string; non_rare_in_europe: boolean;
  names: { en: string; cs: string }; synonyms: { en: string[]; cs: string[] }; name_sk?: string;
}
interface Detail extends Entry {
  definitions: { en: string; cs: string }; source_url: string; source_date: string;
  associations: { target: string; relation: string }[];
  mappings: { system: string; code: string; relation: string; validation: string }[];
  editorial: { status: string; name_sk: string; explanation_sk: string; reviewed_at: string | null; sources: string[] };
}
interface Manifest {
  release: string; count: number; attribution: string; source_page: string;
  sources: { source_date: string }[]; levels: Record<string, number>;
}
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

@Component({
  selector: 'th-diagnozy', standalone: true, imports: [FormsModule, RouterLink],
  template: `
    <main class="th-wrap page">
      <header><p class="kick">Zrozumiteľné informácie · dohľadateľné zdroje</p>
        <h1>Katalóg diagnóz</h1>
        <p>Vyhľadajte názov, synonymum alebo ORPHA kód. Katalóg zahŕňa choroby, ich podtypy aj skupiny.
          Nie je nástrojom na stanovenie diagnózy.</p>
      </header>
      @if (error()) { <p role="alert">{{ error() }} Skúste stránku obnoviť. <a routerLink="/diagnozy">Späť na katalóg</a></p> }
      @if (!manifest() && !error()) { <p role="status">Načítavame oficiálny katalóg…</p> }
      @if (detailLoading()) { <p role="status">Načítavame detail…</p> }
      @if (detail(); as d) {
        <article class="glass detail">
          <a routerLink="/diagnozy">← Späť na katalóg</a>
          <h2>{{ d.editorial.status === 'reviewed' ? d.editorial.name_sk : (d.names.cs || d.names.en) }}</h2>
          <p>{{ d.id }} · {{ levelLabel(d.level) }} · {{ d.editorial.status === 'reviewed' ? 'slovenský názov' : (d.names.cs ? 'český názov' : 'anglický názov') }}</p>
          @if (d.lifecycle !== 'active') { <p class="notice">Historický alebo neaktívny záznam podľa Orphanet. Nepoužívajte ho ako aktuálne označenie diagnózy.</p> }
          @if (d.non_rare_in_europe) { <p class="notice">Orphanet označuje túto položku ako nezriedkavú v Európe.</p> }
          @for (a of d.associations; track $index) {
            <p>{{ a.relation }}: <a [routerLink]="['/diagnozy', a.target.substring(6)]">{{ a.target }}</a></p>
          }
          @if (d.editorial.status === 'reviewed') {
            <p>{{ d.editorial.explanation_sk }}</p>
            <p>Slovenský obsah odborne skontrolovaný: {{ d.editorial.reviewed_at }}</p>
            @for (url of d.editorial.sources; track url) {
              <a [href]="url" target="_blank" rel="noopener noreferrer">Zdroj slovenského vysvetlenia</a>
            }
          } @else {
            <p class="notice">Slovenské vysvetlenie ešte neprešlo odbornou kontrolou.
              Nižšie je pôvodná definícia Orphanet, nie slovenský preklad.</p>
          }
          <h3>{{ d.definitions.cs ? 'Definícia z Orphanet (čeština)' : 'Definícia z Orphanet (angličtina)' }}</h3>
          <p>{{ d.definitions.cs || d.definitions.en || 'Definícia v tomto vydaní nie je dostupná.' }}</p>
          @if (d.synonyms.cs.length || d.synonyms.en.length) {
            <h3>Ďalšie názvy (čeština / angličtina)</h3>
            <p>{{ d.synonyms.cs.concat(d.synonyms.en).join(' · ') }}</p>
          }
          <h3>Zdroj a aktuálnosť</h3>
          <p>Verzia zdrojových dát: {{ d.source_date }}. Dátum importu nie je dátumom odbornej kontroly.</p>
          <a [href]="d.source_url" target="_blank" rel="noopener noreferrer">Otvoriť pôvodný záznam Orphanet ↗</a>
          <details><summary>Prepojenia na ďalšie klasifikácie</summary>
            <p>Kódy nemusia byť presnými ekvivalentmi. Pri každom zachovávame typ vzťahu zo zdroja.</p>
            @for (m of d.mappings; track $index) {
              <p><b>{{ m.system }}: {{ m.code }}</b> — {{ m.relation }} · {{ m.validation }}</p>
            }
          </details>
        </article>
      } @else if (!selectedCode()) {
        <section aria-label="Vyhľadávanie diagnóz" class="filters glass">
          <label>Hľadať názov alebo kód
            <input type="search" [ngModel]="q()" (ngModelChange)="q.set($event); visible.set(30)"
              placeholder="Napríklad Angelman alebo ORPHA:72" />
          </label>
          <label class="archive"><input type="checkbox" [ngModel]="includeArchive()" (ngModelChange)="includeArchive.set($event); visible.set(30)" />
            Zahrnúť historické a nezriedkavé položky</label>
          <label>Typ záznamu
            <select [ngModel]="level()" (ngModelChange)="level.set($event); visible.set(30)">
              <option value="all">Všetky záznamy</option><option value="disorder">Choroby</option>
              <option value="subtype">Podtypy</option><option value="group">Skupiny chorôb</option>
            </select>
          </label>
        </section>
        @if (listLoading()) { <p role="status">Načítavame zoznam…</p> }
        @if (manifest(); as m) {
          <p>{{ m.count }} záznamov: {{ m.levels['disorder'] }} chorôb,
            {{ m.levels['subtype'] }} podtypov, {{ m.levels['group'] }} skupín.</p>
          <p role="status">{{ filtered().length }} výsledkov. Slovenské názvy pridávame po odbornej kontrole;
            ostatné sú označené ako české alebo anglické.</p>
        }
        <div class="cards">
          @for (d of filtered().slice(0, visible()); track d.id) {
            <a class="glass card" [routerLink]="['/diagnozy', d.orphacode]">
              <span>{{ d.id }} · {{ levelLabel(d.level) }}</span>
              <h2>{{ d.name_sk || d.names.cs || d.names.en }}</h2>
              <span>{{ d.name_sk ? 'slovenčina' : (d.names.cs ? 'čeština' : 'angličtina') }}</span>
            </a>
          }
        </div>
        @if (manifest() && !listLoading() && !error() && !filtered().length) { <p>Žiadna zhoda. Skúste český alebo anglický názov, prípadne ORPHA kód.</p> }
        @if (filtered().length > visible()) { <button type="button" (click)="visible.set(visible()+30)">Zobraziť ďalších 30</button> }
      }
      @if (manifest(); as m) {
        <footer><p>{{ m.attribution }} Verzia: {{ m.sources[0].source_date }}.</p>
          <a [href]="m.source_page" target="_blank" rel="noopener noreferrer">Pôvodné datasety</a> ·
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
          <p>Tamitos spája jazykové verzie a upravuje formát dát. Slovenský obsah vedie oddelene.
            Prepojenia na iné klasifikácie neznamenajú automatickú zhodu.</p>
        </footer>
      }
    </main>
  `,
  styles: [`
    .page{padding:40px 0 64px} header{max-width:820px} h1{font-size:clamp(32px,5vw,52px)}
    .filters{display:flex;gap:20px;padding:20px;flex-wrap:wrap;margin:24px 0}
    label{display:grid;gap:8px;flex:1;min-width:220px} input,select,button{font:inherit;padding:12px;border-radius:10px;border:1px solid var(--stroke);background:var(--glass);color:inherit}
    option{color:#222;background:white} .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
    .archive{display:flex;align-items:center;gap:10px}.archive input{width:20px;height:20px}
    .card{display:block;padding:20px;color:inherit;text-decoration:none} .card h2{font-size:19px}
    .card span,footer{font-size:13px;color:var(--dim)} .detail{padding:26px;margin:24px 0;overflow-wrap:anywhere}
    .notice{padding:16px;border-left:3px solid var(--teal)} details{margin-top:24px}
    footer{margin-top:36px} button{cursor:pointer;margin-top:20px} a:focus-visible,input:focus-visible,select:focus-visible,button:focus-visible{outline:3px solid var(--teal);outline-offset:4px}
  `],
})
export class DiagnozyComponent {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  manifest = signal<Manifest | null>(null);
  records = signal<Entry[]>([]);
  detail = signal<Detail | null>(null);
  detailLoading = signal(false);
  listLoading = signal(false);
  selectedCode = signal('');
  error = signal(''); q = signal(''); level = signal('all'); visible = signal(30);
  includeArchive = signal(false);
  private manifest$ = this.http.get<Manifest>('diagnoses/manifest.json').pipe(shareReplay(1));
  filtered = computed(() => {
    const query = normalize(this.q().trim());
    return this.records().filter(r => (this.includeArchive() || (r.lifecycle==='active' && !r.non_rare_in_europe)) &&
      (this.level() === 'all' || r.level === this.level()) &&
      (!query || normalize([r.id, r.orphacode, r.name_sk, r.names.cs, r.names.en,
        ...r.synonyms.cs, ...r.synonyms.en].join(' ')).includes(query)));
  });
  constructor() {
    this.route.paramMap.pipe(switchMap(params => this.manifest$.pipe(tap(m => this.manifest.set(m)),
      switchMap(m => {
        if (params.get('code') || this.records().length) return of(null);
        this.listLoading.set(true);
        return this.http.get<Entry[]>(`diagnoses/${m.release}/index.json`);
      }))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({next: r => {
      if (r) this.records.set(r.sort((a,b) => (a.name_sk || a.names.cs || a.names.en)
        .localeCompare(b.name_sk || b.names.cs || b.names.en, 'sk')));
      this.listLoading.set(false);},
      error: () => {this.listLoading.set(false); this.error.set('Katalóg sa nepodarilo načítať.');}});
    this.route.paramMap.pipe(switchMap(params => {
      const code = params.get('code') || '';
      this.selectedCode.set(code); this.detail.set(null); this.detailLoading.set(false); this.error.set('');
      if (!code) return of(null);
      if (!/^[1-9][0-9]*$/.test(code)) { this.error.set('Neplatný ORPHA kód.'); return of(null); }
      this.detailLoading.set(true);
      return this.manifest$.pipe(switchMap(m => this.http.get<Record<string, Detail>>(
        `diagnoses/${m.release}/detail-${Number(code) % 100}.json`)),
        map(rows => { if (!rows[code]) throw new Error('Unknown code'); return rows[code]; }),
        catchError(() => { this.error.set('Detail sa nepodarilo nájsť alebo načítať.'); return of(null); }));
    }), takeUntilDestroyed(this.destroyRef)).subscribe(d => {this.detail.set(d); this.detailLoading.set(false);});
  }
  levelLabel(level: string) { return ({disorder: 'choroba', subtype: 'podtyp', group: 'skupina chorôb'} as Record<string,string>)[level] || level; }
}
