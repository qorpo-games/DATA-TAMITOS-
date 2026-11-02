import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Provider, Study } from '../models/models';

/**
 * Dátová vrstva. Relatívna cesta /api -> funguje na akejkoľvek doméne
 * (data.tamitos.com aj CloudFront náhľad). Zoznamové metódy vracajú pole položiek.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private readonly base = '/api';

  listStudies(limit = 10): Observable<any[]> {
    return this.http.get<{ items: any[] }>(`${this.base}/studies?limit=${limit}`).pipe(
      map((r) => r.items || []),
      catchError(() => of([])),
    );
  }

  listProviders(limit = 12): Observable<any[]> {
    return this.http.get<{ items: any[] }>(`${this.base}/providers?limit=${limit}`).pipe(
      map((r) => r.items || []),
      catchError(() => of([])),
    );
  }

  providerPage(filters: Record<string, string> = {}, cursor?: string): Observable<{items: any[]; next_cursor?: string}> {
    const params: Record<string, string> = {limit: '30', ...filters};
    if (cursor) params['cursor'] = cursor;
    // Failure is distinct from an empty list; consumers retain their last results.
    return this.http.get<{items: any[]; next_cursor?: string}>(`${this.base}/providers`, {params});
  }

  getProviders(region?: string): Observable<Provider[]> {
    return of([]);
  }

  getStudies(onlySlovakia = false): Observable<Study[]> {
    return of([]);
  }
}
