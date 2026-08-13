import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface Article {
  title: string;
  url: string;
  summary?: string;
  source: string;
  kind: string; // research | news | tamitos | vuc
  lang: string; // en | sk
  published?: string;
  is_new?: number;
  translated_sk?: string;
}

@Injectable({ providedIn: 'root' })
export class NewsService {
  private http = inject(HttpClient);
  private readonly api = 'https://data.tamitos.com/api/articles';

  list(): Observable<{ items: Article[] }> {
    // po nasadení: return this.http.get<{ items: Article[] }>(this.api);
    return of({ items: [] });
  }
}
