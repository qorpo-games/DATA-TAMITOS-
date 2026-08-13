import { Route } from '@angular/router';

/** Cesty sekcie TAMITOS Health. Zladené so štýlom hlavného webu (tamitos-ssr). */
export const ROUTE_PATHS = {
  Home: '',
  CoFunguje: 'co-funguje',
  Adresar: 'adresar',
  RodicNovacik: 'rodic-novacik',
  Terapie: 'terapie',
  Novinky: 'novinky',
  Komunita: 'komunita',
} as const;

export type RoutePaths = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];

export const NAV: { name: string; path: RoutePaths }[] = [
  { name: 'Čo funguje', path: ROUTE_PATHS.CoFunguje },
  { name: 'Adresár', path: ROUTE_PATHS.Adresar },
  { name: 'Rodič nováčik', path: ROUTE_PATHS.RodicNovacik },
  { name: 'Terapie & Dáta', path: ROUTE_PATHS.Terapie },
  { name: 'Novinky', path: ROUTE_PATHS.Novinky },
  { name: 'Komunita', path: ROUTE_PATHS.Komunita },
];

export const appRoutes: Route[] = [
  { path: ROUTE_PATHS.Home, redirectTo: ROUTE_PATHS.CoFunguje, pathMatch: 'full' },
  {
    path: ROUTE_PATHS.CoFunguje,
    loadComponent: () =>
      import('./pages/co-funguje/co-funguje.component').then((m) => m.CoFungujeComponent),
  },
  {
    path: ROUTE_PATHS.Adresar,
    loadComponent: () => import('./pages/adresar/adresar.component').then((m) => m.AdresarComponent),
  },
  {
    path: ROUTE_PATHS.RodicNovacik,
    loadComponent: () =>
      import('./pages/rodic-novacik/rodic-novacik.component').then((m) => m.RodicNovacikComponent),
  },
  {
    path: ROUTE_PATHS.Terapie,
    loadComponent: () => import('./pages/terapie/terapie.component').then((m) => m.TerapieComponent),
  },
  {
    path: ROUTE_PATHS.Novinky,
    loadComponent: () => import('./pages/novinky/novinky.component').then((m) => m.NovinkyComponent),
  },
  {
    path: ROUTE_PATHS.Komunita,
    loadComponent: () =>
      import('./pages/komunita/komunita.component').then((m) => m.KomunitaComponent),
  },
  { path: '**', redirectTo: ROUTE_PATHS.CoFunguje },
];
