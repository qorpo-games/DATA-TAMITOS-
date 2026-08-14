import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewsService, Article } from '../../core/news.service';
import { CommunityService, CommunityPost } from '../../core/community.service';

type Feed = 'all' | 'research' | 'news' | 'tamitos' | 'komunita';

interface FeedItem {
  cat: 'research' | 'news' | 'tamitos' | 'komunita';
  who: string;          // zdroj alebo prezývka
  title?: string;       // pri novinke
  text?: string;        // zhrnutie / text príspevku
  url?: string;         // odkaz na originál (novinka)
  isNew?: boolean;
  translated?: boolean;
  meta?: string;        // kategória / vek dieťaťa
}

/** Domov — živý „twitter" feed: novinky (preložené do SK), tipy a skúsenosti rodičov na jednom mieste. */
@Component({
  selector: 'th-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="th-wrap home">
      <!-- stred: feed -->
      <section class="stream">
        <header class="reveal d1">
          <span class="kick"><span class="dot"></span> Autizmus · všetko na jednom mieste · aktualizované denne</span>
          <h1>Čo sa deje <span class="grad-text">vo svete autizmu</span></h1>
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
              @if (it.title) { <h3>{{ it.title }}</h3> }
              @if (it.text) { <p class="tx">{{ it.text }}</p> }
              <div class="ft">
                @if (it.meta) { <span class="meta">{{ it.meta }}</span> }
                @if (it.url) { <a class="open" [href]="it.url" target="_blank" rel="noopener">otvoriť originál →</a> }
              </div>
            </article>
          } @empty {
            <div class="glass card">Načítavam feed…</div>
          }
        </div>
      </section>

      <!-- vpravo: rozcestník -->
      <aside class="side">
        <div class="glass box reveal d2">
          <h4>Dôkazové úrovne</h4>
          <a class="ev good" routerLink="/co-funguje">✅ Overené — patrí do štandardu</a>
          <a class="ev warn" routerLink="/co-funguje">🔬 Skúma sa — len v štúdiách</a>
          <a class="ev crit" routerLink="/co-funguje">⚠️ Nepodložené — pozor</a>
        </div>

        <div class="glass box reveal d3">
          <h4>Kde začať</h4>
          <a class="lnk" routerLink="/rodic-novacik">👶 Rodič nováčik — diagnostika a štátna podpora</a>
          <a class="lnk" routerLink="/adresar">📍 Adresár — centrá a terapeuti na Slovensku</a>
          <a class="lnk" routerLink="/terapie">🧩 Terapie & Dáta — čo funguje a prevalencia</a>
          <a class="lnk" routerLink="/novinky">📰 Novinky — celý feed zo sveta</a>
          <a class="lnk" routerLink="/komunita">💬 Komunita — skúsenosti rodičov</a>
        </div>

        <div class="glass box reveal d3">
          <h4>Sledované zdroje</h4>
          <p class="src">ScienceDaily · Nature · The Transmitter · Neuroscience News · Autism Research Institute · TAMITOS blog</p>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .home{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:26px;padding:44px 0 60px;align-items:start}
    .stream{min-width:0}
    h1{font-weight:800;font-size:clamp(30px,4.4vw,50px);letter-spacing:-1px;margin:14px 0 0}
    .lead{color:var(--dim);font-size:15.5px;margin:14px 0 0}
    .composer{display:flex;align-items:center;gap:12px;padding:14px 18px;margin:22px 0 14px;color:inherit}
    .composer:hover{background:var(--glass-2);border-color:var(--stroke-2)}
    .cp{font-size:15px;color:var(--dim)}
    .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 16px}
    .tab{background:var(--glass);border:1px solid var(--stroke);color:var(--dim);font-size:13px;font-weight:600;
      padding:7px 14px;border-radius:100px;cursor:pointer}
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
    h3{font-weight:700;font-size:16.5px;line-height:1.32;margin:10px 0 0}
    .tx{font-size:14px;color:var(--dim);margin-top:7px;line-height:1.5}
    .ft{display:flex;align-items:center;gap:10px;margin-top:11px;flex-wrap:wrap}
    .meta{font-size:12px;color:var(--mute)}
    .open{font-size:12.5px;color:var(--teal);font-weight:600;margin-left:auto}
    .side{display:flex;flex-direction:column;gap:14px;position:sticky;top:96px}
    .box{padding:16px 16px 14px}
    .box h4{font-size:12.5px;text-transform:uppercase;letter-spacing:.6px;color:var(--mute);margin-bottom:12px}
    .ev,.lnk{display:block;font-size:13.5px;color:var(--dim);padding:7px 0;border-bottom:1px solid var(--stroke);transition:.15s}
    .ev:last-child,.lnk:last-child{border-bottom:none}
    .ev:hover,.lnk:hover{color:#fff}
    .src{font-size:13px;color:var(--dim);line-height:1.6}
    @media(max-width:980px){.home{grid-template-columns:1fr}.side{position:static;order:-1}}
  `],
})
export class HomeComponent implements OnInit {
  private news = inject(NewsService);
  private community = inject(CommunityService);

  f = signal<Feed>('all');
  TABS: { k: Feed; l: string }[] = [
    { k: 'all', l: 'Všetko' },
    { k: 'research', l: '🔬 Výskum' },
    { k: 'news', l: '🌍 Novinky' },
    { k: 'tamitos', l: '💙 TAMITOS' },
    { k: 'komunita', l: '👪 Komunita' },
  ];

  private articles = signal<Article[]>([]);
  private posts = signal<CommunityPost[]>([]);

  private items = computed<FeedItem[]>(() => {
    const news: FeedItem[] = this.articles().map((a) => ({
      cat: (a.kind === 'research' ? 'research' : a.kind === 'tamitos' ? 'tamitos' : 'news') as FeedItem['cat'],
      who: a.source,
      title: a.title_sk || a.title,
      text: a.summary_sk || a.summary,
      url: a.url,
      isNew: !!a.is_new,
      translated: !!(a.lang && a.lang !== 'sk'),
    }));
    const komunita: FeedItem[] = this.posts().map((p) => ({
      cat: 'komunita',
      who: p.nick || 'Rodič',
      text: p.text,
      meta: [p.category, p.childAge].filter(Boolean).join(' · '),
    }));
    // prelíname: skúsenosti rodičov navrch, potom novinky
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

  ngOnInit(): void {
    this.news.list().subscribe({ next: (r) => this.articles.set(r.items || []), error: () => {} });
    this.community.list(30).subscribe({ next: (r) => this.posts.set(r.items || []), error: () => {} });
  }
}
