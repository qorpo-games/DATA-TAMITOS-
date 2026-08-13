import { Route } from '@angular/router';

/** Cesty sekcie TAMITOS Health. Zladené so štýlom hlavného webu (tamitos-ssr). */
export const ROUTE_PATHS = {
  Home: '',
  CoFunguje: 'co-funguje',
  Adresar: 'adresar',
  RodicNovacik: 'rodic-novacik',
  Terapie: 'terapie',
  Novinky: 'novinky',
} as const;

export type RoutePaths = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];

export const NAV: { name: string; path: RoutePaths }[] = [
  { name: 'Čo funguje', path: ROUTE_PATHS.CoFunguje },
  { name: 'Adresár', path: ROUTE_PATHS.Adresar },
  { name: 'Rodič nováčik', path: ROUTE_PATHS.RodicNovacik },
  { name: 'Terapie & Dáta', path: ROUTE_PATHS.Terapie },
  { name: 'Novinky', path: ROUTE_PATHS.Novinky },
];

export const appRoutes: Route[] = [
  { path: ROUTE_PATHS.Home, redirectTo: ROUTE_PATHS.CoFunguje, pathMatch: 'full' },
  {
    path: ROUTE_PATHS.CoFunguje,
    loadComponent: () =>
      import('./pages/co-funguje/co-funguje.component').then((m) => m.CoFungujeComponent),
  },
  // ďaršie stránky sa doplnia rovnakým lazy-load vzorom:
  // adresar, rodic-novacik, terapie (dashboard cez CanvasJS), novinky (feed z data.tamitos.com)
  { path: '**', redirectTo: ROUTE_PATHS.CoFunguje },
];
