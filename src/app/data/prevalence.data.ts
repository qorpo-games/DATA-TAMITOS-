import { PrevalencePoint, Source } from '../models/models';

/**
 * Slovenská štatistická séria zatiaľ nie je overene napojená.
 *
 * Zdroj: NCZI — ročenka „Psychiatrická starostlivosť v Slovenskej republike"
 * (diagnostická skupina F84 — pervazívne vývinové poruchy vrátane autizmu).
 * NCZI starostlivosť nie je automaticky populačná prevalencia.
 * Prázdne polia znamenajú chýbajúce dáta, nie nulový počet.
 * Parser NCZI nie je implementovaný; nevydávať ilustračné čísla za agregát.
 */
export const PREVALENCE_SOURCE: Source = {
  label: 'NCZI — Psychiatrická starostlivosť v SR',
  url: 'https://www.nczisk.sk/aktuality/pages/Psychiatricka-starostlivost-v-Slovenskej-republike-v-roku-2023.aspx',
};

export const PREVALENCE_YEAR = 2023;

// No independently verified Slovak series is loaded. Empty is not zero.
export const byYear: PrevalencePoint[] = [];
export const byAge: PrevalencePoint[] = [];
export const byRegion: PrevalencePoint[] = [];
