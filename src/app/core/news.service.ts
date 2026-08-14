import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';

export interface Article {
  title: string;
  title_sk?: string;
  url: string;
  summary?: string;
  summary_sk?: string;
  content?: string;      // celý originálny text (ak ho ingest uloží)
  content_sk?: string;   // celý preložený text (ak ho ingest uloží)
  body_sk?: string;      // alias pre content_sk (kompatibilita)
  source: string;
  kind: string; // research | news | tamitos | vuc
  lang: string; // en | sk
  published?: string;
  is_new?: number;
  translated?: number;
  image?: string;
}

/** Deterministický slug z názvu — používa sa v URL /novinky/:slug. */
export function articleSlug(a: Article): string {
  const base = (a.title_sk || a.title || 'clanok')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // odstráň diakritiku
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'clanok';
}

@Injectable({ providedIn: 'root' })
export class NewsService {
  private http = inject(HttpClient);
  // relatívna cesta -> funguje na akejkoľvek doméne (data.tamitos.com aj CloudFront)
  private readonly api = '/api/articles';

  /** cache posledného načítania — aby detail nemusel znova sťahovať. */
  readonly cache = signal<Article[]>([]);

  list(): Observable<{ items: Article[] }> {
    return this.http.get<{ items: Article[] }>(this.api).pipe(
      tap((r) => { if (r?.items?.length) this.cache.set(r.items); }),
    );
  }

  /** Nájdi článok podľa slugu — najprv z cache, inak dotiahni zoznam. */
  getBySlug(slug: string): Observable<Article | undefined> {
    const inCache = this.cache().find((a) => articleSlug(a) === slug);
    if (inCache) return new Observable((s) => { s.next(inCache); s.complete(); });
    return this.list().pipe(map((r) => (r.items || []).find((a) => articleSlug(a) === slug)));
  }
}
