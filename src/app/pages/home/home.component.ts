import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewsService, Article } from '../../core/news.service';
import { CommunityService, CommunityPost } from '../../core/community.service';
import { DataService } from '../../core/data.service';

type Feed = 'all' | 'research' | 'news' | 'tamitos' | 'komunita';

interface FeedItem {
  cat: 'research' | 'news' | 'tamitos' | 'komunita';
  who: string;
  title?: string;
  text?: string;
  url?: string;
  isNew?: boolean;
  translated?: boolean;
  meta?: string;
  image?: string;
}

/** Záložný obsah, kým dobehne API (aby dashboard nikdy nevyzeral prázdno). */
const SAMPLE_NEWS: Article[] = [
  { title: 'De novo mutations shape autism risk', title_sk: 'De novo mutácie formujú riziko autizmu', url: 'https://www.thetransmitter.org/spectrum/', summary: '', summary_sk: 'Analýza vyše 40 000 rodín ukazuje silné rizikové gény (SCN2A, SHANK3).', source: 'The Transmitter', kind: 'research', lang: 'en', is_new: 1 },
  { title: 'Early behavioral intervention improves communication', title_sk: 'Skorá intervencia zlepšuje komunikáciu', url: 'https://www.sciencedaily.com/news/mind_brain/autism/', summary: '', summary_sk: 'ESDM potvrdil zlepšenie jazyka pri začatí pred 3. rokom.', source: 'ScienceDaily', kind: 'research', lang: 'en', is_new: 1 },
  { title: 'List rodičom, ktorí len začínajú', title_sk: 'List rodičom, ktorí len začínajú', url: 'https://tamitos.com/sk/blog', summary: '', summary_sk: 'Úprimný text pre rodiny na začiatku cesty s autizmom.', source: 'TAMITOS blog', kind: 'tamitos', lang: 'sk', is_new: 1 },
  { title: 'Ako pomôcť dieťaťu pomenovať pocity', title_sk: 'Ako pomôcť dieťaťu pomenovať pocity', url: 'https://tamitos.com/sk/blog', summary: '', summary_sk: 'Praktický tip z TAMITOS blogu.', source: 'TAMITOS blog', kind: 'tamitos', lang: 'sk' },
];
const SAMPLE_STUDIES = [
  { nct_id: 's1', title: 'Group parent training for ASD (RCT)', status: 'RECRUITING', has_slovakia: 0, url: 'https://clinicaltrials.gov/' },
  { nct_id: 's2', title: 'Melatonin for sleep in autistic children', status: 'COMPLETED', has_slovakia: 0, url: 'https://clinicaltrials.gov/' },
  { nct_id: 's3', title: 'Microbiome & ASD — pilot', status: 'ACTIVE', has_slovakia: 0, url: 'https://clinicaltrials.gov/' },
];

/** Domov — dashboard v štýle Twitter: v strede feed, po bokoch top veci z každej kategórie. */
@Component({
  selector: 'th-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="th-wrap home">
      <!-- ĽAVÝ panel: štúdie + rozcestník -->
      <aside class="rail left">
        <div class="glass box reveal d1">
          <h4>🧩 Najnovšie štúdie</h4>
          @for (s of topStudies(); track s.nct_id) {
            <a class="mini" [href]="s.url" target="_blank" rel="noopener">
              <div class="mt">{{ s.title }}</div>
              <div class="ms">
                <span class="st">{{ s.status }}</span>
                @if (s.has_slovakia) { <span class="skb">🇸🇰 SK</span> }
              </div>
            </a>
          }
          <a class="more" routerLink="/terapie">Všetky štúdie & dáta →</a>
        </div>

        <div class="glass box reveal d2">
          <h4>Kde začať</h4>
          <a class="lnk" routerLink="/rodic-novacik">👶 Rodič nováčik — diagnostika a podpora</a>
          <a class="lnk" routerLink="/adresar">📍 Adresár — centrá a terapeuti</a>
          <a class="lnk" routerLink="/co-funguje">✅ Čo funguje a čo nie</a>
        </div>
      </aside>

      <!-- STRED: feed -->
      <section class="stream">
        <header class="reveal d1 hero">
          <h1>Čo sa deje <span class="grad-text">vo svete autizmu</span></h1>
          <div class="eyebrow">Autizmus · všetko na jednom mieste · aktualizované denne</div>
          <p class="lead">Overené novinky preložené do slovenčiny, tipy a skúsenosti rodičov — jeden živý feed.</p>
        </header>

        <a class="glass composer reveal d2" routerLink="/komunita">
          <div class="ava me">＋</div>
          <div class="cp">Máš skúsenosť alebo otázku? <b>Zdieľaj ju s komunitou →</b></div>
        </a>

        <div class="tabs reveal d2">
          @for (t of TABS; track t.k) {
            <span class="tab" [class.on]="f()===t.k" (click)="f.set(t.k)">{{ t.l }}</span>
          }
        </div>

        <div class="feed">
          @for (it of filtered(); track $index) {
            <article class="glass card reveal">
              <div class="row">
                <div class="ava {{ it.cat }}">{{ it.who.charAt(0) }}</div>
                <div class="hd">
                  <span class="who">{{ it.who }}</span>
                  <span class="badge {{ it.cat }}">{{ label(it.cat) }}</span>
                  @if (it.isNew) { <span class="new">● NOVÉ</span> }
                  @if (it.translated) { <span class="tr">🌐 SK</span> }
                </div>
              </div>
              <div class="main">
                <div class="txtcol">
                  @if (it.title) { <h3>{{ it.title }}</h3> }
                  @if (it.text) { <p class="tx">{{ it.text }}</p> }
                </div>
                <div class="thumb {{ it.cat }}">
                  <span class="ph">{{ emoji(it.cat) }}</span>
                  @if (it.image) { <img class="ph-img" [src]="it.image" loading="lazy" alt="" (error)="hideImg($event)" /> }
                </div>
              </div>
              <div class="ft">
                @if (it.meta) { <span class="meta">{{ it.meta }}</span> }
                @if (it.url) { <a class="open" [href]="it.url" target="_blank" rel="noopener">otvoriť originál →</a> }
              </div>
            </article>
          } @empty { <div class="glass card">Načítavam feed…</div> }
        </div>
      </section>

      <!-- PRAVÝ panel: novinky + tipy + komunita + úrovne -->
      <aside class="rail right">
        <div class="glass box reveal d1">
          <h4>🌍 Top novinky</h4>
          @for (a of topNews(); track a.url) {
            <a class="mini" [href]="a.url" target="_blank" rel="noopener">
              <div class="mt">{{ a.title_sk || a.title }}</div>
              <div class="ms"><span class="src">{{ a.source }}</span>@if (a.lang!=='sk'){ <span class="skb">🌐 SK</span> }</div>
            </a>
          }
          <a class="more" routerLink="/novinky">Celý feed noviniek →</a>
        </div>

        <div class="glass box reveal d2">
          <h4>💙 TAMITOS tipy</h4>
          @for (a of topTips(); track a.url) {
            <a class="mini" [href]="a.url" target="_blank" rel="noopener">
              <div class="mt">{{ a.title_sk || a.title }}</div>
            </a>
          }
        </div>

        <div class="glass box reveal d2">
          <h4>👪 Z komunity</h4>
          @for (p of topCommunity(); track $index) {
            <div class="mini">
              <div class="mt">„{{ p.text }}"</div>
              <div class="ms"><span class="src">{{ p.nick || 'Rodič' }}</span></div>
            </div>
          } @empty {
            <a class="lnk" routerLink="/komunita">Zatiaľ ticho — buď prvý/á a zdieľaj skúsenosť →</a>
          }
        </div>

        <div class="glass box reveal d3">
          <h4>Dôkazové úrovne</h4>
          <a class="ev" routerLink="/co-funguje">✅ Overené — patrí do štandardu</a>
          <a class="ev" routerLink="/co-funguje">🔬 Skúma sa — len v štúdiách</a>
          <a class="ev" routerLink="/co-funguje">⚠️ Nepodložené — pozor</a>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .home{display:grid;grid-template-columns:288px minmax(0,1fr) 320px;gap:22px;padding:36px 0 60px;align-items:start}
    .rail{display:flex;flex-direction:column;gap:14px;position:sticky;top:88px;max-height:calc(100vh - 104px);
      overflow-y:auto;overscroll-behavior:contain;padding-right:6px;
      scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.22) transparent}
    .rail::-webkit-scrollbar{width:6px}
    .rail::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:6px}
    .rail::-webkit-scrollbar-track{background:transparent}
    .stream{min-width:0}
    h1{font-weight:800;font-size:clamp(28px,3.6vw,44px);letter-spacing:-1px;margin:12px 0 0}
    .lead{color:var(--dim);font-size:15px;margin:12px 0 0}
    .composer{display:flex;align-items:center;gap:12px;padding:13px 16px;margin:20px 0 12px;color:inherit}
    .composer:hover{background:var(--glass-2);border-color:var(--stroke-2)}
    .cp{font-size:14.5px;color:var(--dim)}
    .tabs{display:flex;gap:7px;flex-wrap:wrap;margin:4px 0 14px}
    .tab{background:var(--glass);border:1px solid var(--stroke);color:var(--dim);font-size:12.5px;font-weight:600;
      padding:7px 13px;border-radius:100px;cursor:pointer}
    .tab.on{background:#fff;color:#12091c;border-color:transparent}
    .feed{display:flex;flex-direction:column;gap:12px}
    .card{padding:16px 18px}
    .row{display:flex;align-items:center;gap:11px}
    .ava{width:40px;height:40px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;font-weight:800;color:#12091c}
    .ava.research{background:linear-gradient(135deg,#8ccbfd,#cbb8ff)}
    .ava.news{background:linear-gradient(135deg,#ffd166,#ff9d5c)}
    .ava.tamitos{background:linear-gradient(135deg,#cbb8ff,#ff9bc7)}
    .ava.komunita{background:linear-gradient(135deg,#3fe08a,#8ccbfd)}
    .ava.me{background:linear-gradient(135deg,#ff9d5c,#cbb8ff);font-size:20px}
    .hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
    .who{font-weight:700;font-size:14.5px}
    .badge{font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:100px;border:1px solid var(--stroke)}
    .badge.research{color:var(--blue)} .badge.news{color:var(--orange)}
    .badge.tamitos{color:var(--violet)} .badge.komunita{color:var(--good)}
    .new{font-size:10.5px;font-weight:800;color:var(--good)}
    .tr{font-size:10.5px;color:var(--teal);font-weight:700}
    h3{font-weight:700;font-size:16px;line-height:1.32;margin:10px 0 0}
    .tx{font-size:14px;color:var(--dim);margin-top:7px;line-height:1.5}
    .hero h1{font-size:clamp(30px,4vw,48px)}
    .eyebrow{font-size:12.5px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;color:var(--mute);margin-top:10px}
    .main{display:flex;gap:14px;align-items:flex-start;margin-top:10px}
    .txtcol{flex:1;min-width:0}
    .txtcol h3{margin-top:0}
    .thumb{position:relative;width:96px;height:96px;flex:0 0 auto;border-radius:14px;overflow:hidden;
      display:grid;place-items:center;margin-top:2px}
    .thumb.research{background:linear-gradient(135deg,#8ccbfd,#cbb8ff)}
    .thumb.news{background:linear-gradient(135deg,#ffd166,#ff9d5c)}
    .thumb.tamitos{background:linear-gradient(135deg,#cbb8ff,#ff9bc7)}
    .thumb.komunita{background:linear-gradient(135deg,#3fe08a,#8ccbfd)}
    .ph{font-size:32px}
    .ph-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    @media(max-width:520px){.thumb{width:68px;height:68px}.ph{font-size:24px}}
    .ft{display:flex;align-items:center;gap:10px;margin-top:11px;flex-wrap:wrap}
    .meta{font-size:12px;color:var(--mute)}
    .open{font-size:12.5px;color:var(--teal);font-weight:600;margin-left:auto}

    .box{padding:15px 15px 12px}
    .box h4{font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--mute);margin-bottom:11px}
    .mini{display:block;padding:9px 0;border-bottom:1px solid var(--stroke);color:inherit}
    .mini:hover .mt{color:#fff}
    .box .mini:last-of-type{border-bottom:none}
    .mt{font-size:13px;font-weight:600;color:var(--dim);line-height:1.4;
      display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .ms{display:flex;align-items:center;gap:7px;margin-top:5px}
    .st{font-size:10px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.3px}
    .src{font-size:11px;color:var(--mute)}
    .skb{font-size:10px;color:var(--teal);font-weight:700}
    .more{display:block;margin-top:11px;font-size:12px;color:var(--teal);font-weight:600}
    .ev,.lnk{display:block;font-size:12.5px;color:var(--dim);padding:7px 0;border-bottom:1px solid var(--stroke)}
    .ev:last-child,.lnk:last-child{border-bottom:none}
    .ev:hover,.lnk:hover{color:#fff}

    @media(max-width:1180px){
      .home{grid-template-columns:minmax(0,1fr) 300px}
      .rail.left{display:none}
    }
    @media(max-width:900px){
      .home{grid-template-columns:1fr}
      .rail{position:static;max-height:none;overflow:visible;padding-right:0}
      .rail.right{order:2}
    }
  `],
})
export class HomeComponent implements OnInit {
  private news = inject(NewsService);
  private community = inject(CommunityService);
  private data = inject(DataService);

  f = signal<Feed>('all');
  TABS: { k: Feed; l: string }[] = [
    { k: 'all', l: 'Všetko' },
    { k: 'research', l: '🔬 Výskum' },
    { k: 'news', l: '🌍 Novinky' },
    { k: 'tamitos', l: '💙 TAMITOS' },
    { k: 'komunita', l: '👪 Komunita' },
  ];

  private articles = signal<Article[]>(SAMPLE_NEWS);
  private posts = signal<CommunityPost[]>([]);
  private studies = signal<any[]>(SAMPLE_STUDIES);

  topStudies = computed(() => this.studies().slice(0, 6));
  topNews = computed(() =>
    this.articles().filter((a) => a.kind === 'news' || a.kind === 'research').slice(0, 6),
  );
  topTips = computed(() => {
    const t = this.articles().filter((a) => a.kind === 'tamitos');
    return (t.length ? t : this.articles()).slice(0, 4);
  });
  topCommunity = computed(() => this.posts().slice(0, 4));

  private items = computed<FeedItem[]>(() => {
    const news: FeedItem[] = this.articles().map((a) => ({
      cat: (a.kind === 'research' ? 'research' : a.kind === 'tamitos' ? 'tamitos' : 'news') as FeedItem['cat'],
      who: a.source,
      title: a.title_sk || a.title,
      text: a.summary_sk || a.summary,
      url: a.url,
      isNew: !!a.is_new,
      translated: !!(a.lang && a.lang !== 'sk'),
      image: a.image,
    }));
    const komunita: FeedItem[] = this.posts().map((p) => ({
      cat: 'komunita',
      who: p.nick || 'Rodič',
      text: p.text,
      meta: [p.category, p.childAge].filter(Boolean).join(' · '),
    }));
    const merged: FeedItem[] = [];
    const max = Math.max(news.length, komunita.length);
    for (let i = 0; i < max; i++) {
      if (i < komunita.length && i % 2 === 0) merged.push(komunita[i]);
      if (i < news.length) merged.push(news[i]);
      if (i < komunita.length && i % 2 === 1) merged.push(komunita[i]);
    }
    return merged;
  });

  filtered = computed(() => {
    const f = this.f();
    return this.items().filter((it) => f === 'all' || it.cat === f);
  });

  label(c: string): string {
    return c === 'research' ? '🔬 Výskum' : c === 'tamitos' ? '💙 TAMITOS'
      : c === 'komunita' ? '👪 Rodič' : '🌍 Novinka';
  }
  emoji(c: string): string {
    return c === 'research' ? '🔬' : c === 'tamitos' ? '💙' : c === 'komunita' ? '👪' : '🌍';
  }
  hideImg(ev: Event): void { const t = ev.target as HTMLElement; if (t) t.style.display = 'none'; }

  ngOnInit(): void {
    this.news.list().subscribe({ next: (r) => { if (r.items?.length) this.articles.set(r.items); }, error: () => {} });
    this.community.list(30).subscribe({ next: (r) => this.posts.set(r.items || []), error: () => {} });
    this.data.listStudies(10).subscribe({ next: (r) => { if (r.length) this.studies.set(r); }, error: () => {} });
  }
}
