import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CommunityPost {
  nick: string;
  category: string;
  childAge?: string;
  text: string;
  created: string;
}
export interface SubmitPayload {
  nick: string;
  category: string;
  childAge?: string;
  text: string;
  captcha: string; // Cloudflare Turnstile token
  loadedAt: number; // timestamp kedy sa formulár načítal (time-trap)
  website: string; // honeypot — musí ostať prázdne
}

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private http = inject(HttpClient);
  private readonly api = 'https://data.tamitos.com/api/community';

  list(limit = 30): Observable<{ items: CommunityPost[] }> {
    return this.http.get<{ items: CommunityPost[] }>(`${this.api}?limit=${limit}`);
  }

  submit(p: SubmitPayload): Observable<{ ok: boolean; message?: string; error?: string }> {
    return this.http.post<{ ok: boolean; message?: string; error?: string }>(this.api, p);
  }
}
