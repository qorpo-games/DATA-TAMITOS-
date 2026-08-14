/** Dôkazová úroveň — jadro celého portálu. */
export type Evidence = 'good' | 'warn' | 'crit';

export interface Source {
  label: string;
  url: string;
}

export interface Therapy {
  name: string;
  category: string; // behav | komun | senzo | kreat | bio
  evidence: Evidence;
  note: string;
  forWho?: string;
  source: Source;
}

/** Karta na stránke „Čo funguje a čo nie" (tri úrovne). */
export interface GuideItem {
  title: string;
  note: string;
  forWho?: string;
  evidence: Evidence;
  source: Source;
  year?: string; // rok kľúčového dôkazu / odporúčania
}

/** Poskytovateľ v adresári (z data.tamitos.com). */
export interface Provider {
  extId: string;
  name: string;
  kind: string;
  region: string;
  city: string;
  address?: string;
  contact?: string;
  source: string;
}

/** Klinická štúdia (z ClinicalTrials.gov cez pipeline). */
export interface Study {
  nctId: string;
  title: string;
  status: string;
  phase?: string;
  hasSlovakia: boolean;
  url: string;
}

/** Jeden bod prevalenčného dashboardu. */
export interface PrevalencePoint {
  label: string;
  value: number;
}
