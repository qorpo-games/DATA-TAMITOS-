import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NewsService, Article } from '../../core/news.service';

/** Detail článku — celý preložený text ako podstránka (/novinky/:slug).
 *  Ak ingest uloží content_sk/body_sk, zobrazí sa celý preložený článok;
 *  inak preložené zhrnutie + výrazný odkaz na originál. */
@Component({
  selector: 'th-clanok',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="th-wrap page">
      <a class="back" routerLink="/novinky">← Späť na novinky</a>

      @if (loading()) {
        <div class="skel glass"></div>
      } @else if (a(); as art) {
        <article class="glass wrap">
          <div class="ch">
            <span class="badge {{ art.kind }}">{{ kindLabel(art.kind) }}</span>
            @if (art.lang && art.lang!=='sk') { <span class="tr">🌐 preložené do slovenčiny</span> }
            <span class="src">{{ art.source }}</span>
            @if (art.published) { <span class="date">· {{ art.published }}</span> }
          </div>

          <h1>{{ art.title_sk || art.title }}</h1>
          @if (art.lang && art.lang!=='sk' && art.title_sk) {
            <p class="orig-title">Originálny názov: <i>{{ art.title }}</i></p>
          }

          @if (art.image) { <img class="hero" [src]="art.image" [alt]="art.title_sk || art.title" loading="lazy" /> }

          <div class="body">
            @if (fullText(art); as body) {
              @for (para of body.split('\n'); track $index) {
                @if (para.trim()) { <p>{{ para }}</p> }
              }
            } @else {
              <p>{{ art.summary_sk || art.summary || 'Zhrnutie tohto článku zatiaľ nie je k dispozícii.' }}</p>
              <div class="note">
                📄 Toto je <b>slovenský preklad zhrnutia</b>. Celé znenie článku (v originálnom jazyku)
                nájdete na stránke zdroja — otvorte ho tlačidlom nižšie.
              </div>
            }
          </div>

          <div class="foot">
            <a class="open" [href]="art.url" target="_blank" rel="noopener">Čítať originál na {{ art.source }} →</a>
          </div>

          <p class="disc">Preklad je automatický (Amazon Translate) a slúži na orientáciu. Rozhodujúce je originálne znenie.</p>
        </article>
      } @else {
        <div class="glass wrap missing">
          <h1>Článok sa nenašiel</h1>
          <p>Tento článok už možno nie je vo feede. Pozrite si aktuálne novinky.</p>
          <a class="open" routerLink="/novinky">← Naspäť na novinky</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .page{padding:44px 0 70px;max-width:760px;margin:0 auto}
    .back{display:inline-block;color:var(--dim);font-size:13.5px;font-weight:600;margin-bottom:18px;text-decoration:none}
    .back:hover{color:var(--teal)}
    .wrap{padding:30px 32px 26px}
    .ch{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:14px}
    .badge{font-size:11px;font-weight:700;padding:4px 10px;border-radius:100px;border:1px solid var(--stroke)}
    .badge.research{color:var(--blue)} .badge.news{color:var(--orange)} .badge.tamitos{color:var(--violet)}
    .tr{font-size:11px;color:var(--teal);font-weight:600}
    .src{font-size:12px;color:var(--mute)} .date{font-size:12px;color:var(--mute)}
    h1{font-weight:800;font-size:clamp(26px,3.6vw,38px);line-height:1.2;letter-spacing:-.5px;margin:2px 0 0}
    .orig-title{font-size:13px;color:var(--mute);margin-top:10px}
    .hero{width:100%;max-height:360px;object-fit:cover;border-radius:16px;margin:20px 0 6px}
    .body{margin-top:18px}
    .body p{font-size:16px;line-height:1.72;color:var(--dim);margin:0 0 15px}
    .note{font-size:13.5px;color:var(--teal);background:rgba(140,251,218,.08);
      border:1px solid rgba(140,251,218,.28);border-radius:14px;padding:14px 16px;margin-top:8px}
    .foot{margin-top:24px;padding-top:18px;border-top:1px solid var(--stroke)}
    .open{display:inline-block;background:#fff;color:#12091c;font-weight:700;font-size:14px;
      padding:12px 22px;border-radius:100px;text-decoration:none}
    .disc{font-size:12px;color:var(--mute);margin-top:20px}
    .skel{height:340px;border-radius:20px;animation:pulse 1.2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:.5}50%{opacity:.8}}
    .missing{text-align:center;padding:50px 32px}
    .missing h1{font-size:26px}.missing p{color:var(--dim);margin:12px 0 20px}
  `],
})
export class ClanokComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(NewsService);
  a = signal<Article | undefined>(undefined);
  loading = signal(true);

  ngOnInit(): void {
    this.route.paramMap.subscribe((pm) => {
      const slug = pm.get('slug') || '';
      this.loading.set(true);
      this.svc.getBySlug(slug).subscribe({
        next: (art) => { this.a.set(art); this.loading.set(false); },
        error: () => { this.loading.set(false); },
      });
    });
  }

  fullText(a: Article): string | null {
    const t = a.content_sk || a.body_sk || (a.lang === 'sk' ? a.content : '');
    return t && t.trim().length > (a.summary_sk || a.summary || '').length ? t : null;
  }

  kindLabel(k: string): string {
    return k === 'research' ? '🔬 Výskum' : k === 'tamitos' ? '💙 TAMITOS' : '🌍 Novinka';
  }
}
