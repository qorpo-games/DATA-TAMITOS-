import { PrevalencePoint, Source } from '../models/models';

/**
 * PREVALENČNÉ DÁTA — VEREJNÉ AGREGÁTY.
 *
 * Zdroj: NCZI — ročenka „Psychiatrická starostlivosť v Slovenskej republike"
 * (diagnostická skupina F84 — pervazívne vývinové poruchy vrátane autizmu).
 * Ide o VEREJNÝ agregát — žiadne dáta od poisťovní netreba vyžadovať.
 *
 * ⚠️ Nižšie hodnoty sú zástupné (placeholder) — pri nasadení ich pipeline
 * naplní presnými číslami z posledného NCZI PDF (parser sa doplní).
 * Vždy zobrazovať zdroj a rok pri grafe.
 */
export const PREVALENCE_SOURCE: Source = {
  label: 'NCZI — Psychiatrická starostlivosť v SR',
  url: 'https://www.nczisk.sk/aktuality/pages/Psychiatricka-starostlivost-v-Slovenskej-republike-v-roku-2023.aspx',
};

export const PREVALENCE_YEAR = 2023;

export const byYear: PrevalencePoint[] = [
  { label: '2019', value: 6100 },
  { label: '2020', value: 6800 },
  { label: '2021', value: 7600 },
  { label: '2022', value: 8500 },
  { label: '2023', value: 9400 },
];

export const byAge: PrevalencePoint[] = [
  { label: '0–4 r.', value: 1180 },
  { label: '5–9 r.', value: 2640 },
  { label: '10–14 r.', value: 3980 },
  { label: '15–19 r.', value: 2210 },
  { label: '20+ r.', value: 1410 },
];

export const byRegion: PrevalencePoint[] = [
  { label: 'Bratislavský', value: 2600 },
  { label: 'Košický', value: 1620 },
  { label: 'Prešovský', value: 1440 },
  { label: 'Žilinský', value: 1260 },
  { label: 'Nitriansky', value: 1050 },
  { label: 'Banskobystrický', value: 980 },
  { label: 'Trnavský', value: 820 },
  { label: 'Trenčiansky', value: 720 },
];
