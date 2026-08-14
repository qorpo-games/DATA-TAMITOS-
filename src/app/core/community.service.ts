import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CommunityPost {
  nick: string;
  category: string;
  childAge?: string;
  topic?: string; // téma diskusie (Modrý koník štýl)
  text: string;
  created: string;
}
export interface SubmitPayload {
  nick: string;
  category: string;
  childAge?: string;
  topic?: string; // téma diskusie
  text: string;
  captcha: string; // Cloudflare Turnstile token
  loadedAt: number; // timestamp kedy sa formulár načítal (time-trap)
  website: string; // honeypot — musí ostať prázdne
}

/** Témy diskusie — štýl fór na Modrom koníkovi, ale zamerané na autizmus. */
export interface Topic { id: string; icon: string; name: string; desc: string; }
export const TOPICS: Topic[] = [
  { id: 'zaciatky',    icon: '🌱', name: 'Diagnóza a začiatky',      desc: 'Prvé podozrenia, vyšetrenia, prijatie diagnózy.' },
  { id: 'skola',       icon: '🎒', name: 'Škôlka a škola',           desc: 'Integrácia, asistent, IVP, prechod do školy.' },
  { id: 'terapie',     icon: '🧩', name: 'Terapie a odborníci',      desc: 'ABA, logopédia, ergoterapia — skúsenosti a odkazy.' },
  { id: 'komunikacia', icon: '💬', name: 'Komunikácia a reč',        desc: 'AAC, obrázky, rozvoj reči a porozumenia.' },
  { id: 'spravanie',   icon: '🌈', name: 'Správanie a emócie',       desc: 'Zvládanie záchvatov, rutiny, senzorika.' },
  { id: 'strava',      icon: '🍎', name: 'Strava a spánok',          desc: 'Vyberavosť v jedle, spánkové ťažkosti.' },
  { id: 'rodina',      icon: '👪', name: 'Rodina a súrodenci',       desc: 'Vzťahy, súrodenci, čas pre seba, vyhorenie.' },
  { id: 'dospelost',   icon: '🎓', name: 'Dospelosť a samostatnosť', desc: 'Puberta, samostatnosť, práca, budúcnosť.' },
];

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private http = inject(HttpClient);
  // relatívna cesta -> funguje na akejkoľvek doméne
  private readonly api = '/api/community';

  list(limit = 30): Observable<{ items: CommunityPost[] }> {
    return this.http.get<{ items: CommunityPost[] }>(`${this.api}?limit=${limit}`);
  }

  submit(p: SubmitPayload): Observable<{ ok: boolean; message?: string; error?: string }> {
    return this.http.post<{ ok: boolean; message?: string; error?: string }>(this.api, p);
  }
}
