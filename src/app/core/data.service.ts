import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Provider, Study } from '../models/models';

/**
 * Dátová vrstva. V produkcii číta z data.tamitos.com (výstup dennej pipeline).
 * Kým API nebeží, metódy vracajú prázdno / lokálne dáta, takže web funguje aj tak.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private readonly base = 'https://data.tamitos.com/api';

  /** Poskytovatelia služieb (adresár). */
  getProviders(region?: string): Observable<Provider[]> {
    // TODO: zapnúť po nasadení API
    // const params = region ? `?region=${encodeURIComponent(region)}` : '';
    // return this.http.get<Provider[]>(`${this.base}/providers${params}`);
    return of([]);
  }

  /** Klinické štúdie (ClinicalTrials.gov cez pipeline). */
  getStudies(onlySlovakia = false): Observable<Study[]> {
    // return this.http.get<Study[]>(`${this.base}/studies${onlySlovakia ? '?sk=1' : ''}`);
    return of([]);
  }
}
