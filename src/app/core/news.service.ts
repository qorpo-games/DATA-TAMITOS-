import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Article {
  title: string;
  title_sk?: string;
  url: string;
  summary?: string;
  summary_sk?: string;
  source: string;
  kind: string; // research | news | tamitos | vuc
  lang: string; // en | sk
  published?: string;
  is_new?: number;
  translated?: number;
  image?: string;
}

@Injectable({ providedIn: 'root' })
export class NewsService {
  private http = inject(HttpClient);
  // relatívna cesta -> funguje na akejkoľvek doméne (data.tamitos.com aj CloudFront)
  private readonly api = '/api/articles';

  list(): Observable<{ items: Article[] }> {
    return this.http.get<{ items: Article[] }>(this.api);
  }
}
