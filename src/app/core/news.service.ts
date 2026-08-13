import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Article {
  title: string;
  title_sk?: string;   // slovenský preklad titulku (Amazon Translate)
  url: string;
  summary?: string;
  summary_sk?: string; // slovenský preklad zhrnutia
  source: string;
  kind: string; // research | news | tamitos | vuc
  lang: string; // en | sk
  published?: string;
  is_new?: number;
  translated?: number; // 1 = preložené do SK
}

@Injectable({ providedIn: 'root' })
export class NewsService {
  private http = inject(HttpClient);
  private readonly api = 'https://data.tamitos.com/api/articles';

  list(): Observable<{ items: Article[] }> {
    // živé dáta z dennej pipeline (RSS + TAMITOS blog, preložené do SK)
    return this.http.get<{ items: Article[] }>(this.api);
  }
}
