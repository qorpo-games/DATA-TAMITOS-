import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Provider, Study } from '../models/models';

/**
 * Dátová vrstva. Číta z data.tamitos.com (výstup dennej pipeline).
 * Zoznamové metódy (list*) vracajú priamo pole položiek (rozbalené z {items}).
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private readonly base = 'https://data.tamitos.com/api';

  /** Klinické štúdie (ClinicalTrials.gov cez pipeline) — surové položky. */
  listStudies(limit = 10): Observable<any[]> {
    return this.http.get<{ items: any[] }>(`${this.base}/studies?limit=${limit}`).pipe(
      map((r) => r.items || []),
      catchError(() => of([])),
    );
  }

  /** Poskytovatelia služieb (adresár) — surové položky. */
  listProviders(limit = 12): Observable<any[]> {
    return this.http.get<{ items: any[] }>(`${this.base}/providers?limit=${limit}`).pipe(
      map((r) => r.items || []),
      catchError(() => of([])),
    );
  }

  /** Poskytovatelia — typovaná verzia (zatiaľ nevyužité v adresári). */
  getProviders(region?: string): Observable<Provider[]> {
    return of([]);
  }

  /** Štúdie — typovaná verzia. */
  getStudies(onlySlovakia = false): Observable<Study[]> {
    return of([]);
  }
}
