/**
 * Denný plán a rutina — vizuálny sprievodca pre rodiča.
 * Vizuálne podpory (visual supports) a predvídateľná rutina sú evidence-based
 * postup (NCAEP/AFIRM). Cieľ: znížiť úzkosť, uľahčiť prechody, podporiť samostatnosť.
 */

export const ROUTINE_UPDATED = 'august 2026';

export const ROUTINE_WHY =
  'Deti na spektre zvládajú deň lepšie, keď vedia, čo príde. Predvídateľná rutina a vizuálny denný plán ' +
  '(obrázky/kartičky) znižujú úzkosť, uľahčujú prechody medzi činnosťami a budujú samostatnosť. ' +
  'Vizuálne podpory patria medzi overené postupy (evidence-based practice).';

/** Čo by mal denný plán obsahovať — kartičky. */
export interface RoutineCard { icon: string; title: string; desc: string; }
export const ROUTINE_CONTAINS: RoutineCard[] = [
  { icon: '🌅', title: 'Ranná rutina', desc: 'Vstávanie, obliekanie, hygiena, raňajky — vždy v rovnakom poradí.' },
  { icon: '🍎', title: 'Jedlá a pitie', desc: 'Pevné časy jedál. Pri vyberavosti malé kroky, žiadny tlak.' },
  { icon: '🎒', title: 'Škôlka / škola / terapie', desc: 'Čo, kedy a s kým. Označ, keď je deň voľna alebo zmena.' },
  { icon: '🧩', title: 'Hra a učenie', desc: 'Blok riadenej aj voľnej hry. Striedaj náročné a obľúbené aktivity.' },
  { icon: '🔄', title: 'Prechody', desc: 'Medzi činnosťami — upozornenie „o 5 minút končíme" + vizuálny signál.' },
  { icon: '🧘', title: 'Senzorické prestávky', desc: 'Naplánované chvíle na upokojenie (tichý kút, hojdanie, sluchátka).' },
  { icon: '🛁', title: 'Večerná rutina', desc: 'Kúpeľ, zuby, kniha, svetlo tlmiť — rovnaký sled = ľahšie zaspávanie.' },
  { icon: '⭐', title: 'Odmena / „first–then"', desc: 'Najprv úloha, potom obľúbená vec. Jasné a hneď viditeľné.' },
];

/** Ako postaviť rutinu — krok za krokom. */
export interface RoutineStep { n: number; title: string; text: string; }
export const ROUTINE_BUILD: RoutineStep[] = [
  { n: 1, title: 'Zmapuj bežný deň', text: 'Napíš, čo sa reálne deje od rána do večera. Nevymýšľaj ideál — vychádzaj z reality.' },
  { n: 2, title: 'Vyber formu vizuálu', text: 'Podľa veku: reálne fotky, piktogramy alebo napísané slová. Menej je viac — začni s 4–6 kartami na deň.' },
  { n: 3, title: 'Zostav plán zľava doprava / zhora nadol', text: 'Karty v poradí činností. Používaj „hotovo" — kartu odober alebo otoč, keď je aktivita za nami.' },
  { n: 4, title: 'Pridaj prechody a „first–then"', text: 'Pred zmenou upozorni (časovač, odpočet). Tabuľka „najprv → potom" pomáha pri neobľúbených úlohách.' },
  { n: 5, title: 'Buď konzistentný/á', text: 'Rovnaký sled každý deň. Zmenu (návšteva, výlet) vopred ukáž na pláne, nech nie je prekvapenie.' },
  { n: 6, title: 'Uprav podľa dieťaťa', text: 'Sleduj, kde vznikajú ťažkosti, a plán zjednoduš alebo doplň. Plán slúži dieťaťu, nie naopak.' },
];

/** Ukážkový deň — bloky s aktivitami (vizualizácia „kartičiek"). */
export interface DayBlock { time: string; label: string; icon: string; items: { icon: string; text: string }[]; }
export const ROUTINE_EXAMPLE: DayBlock[] = [
  { time: '7:00', label: 'Ráno', icon: '🌅', items: [
    { icon: '⏰', text: 'Vstávanie' }, { icon: '👕', text: 'Obliekanie' }, { icon: '🪥', text: 'Hygiena' }, { icon: '🥣', text: 'Raňajky' } ]},
  { time: '9:00', label: 'Doobeda', icon: '🎒', items: [
    { icon: '🚌', text: 'Škôlka / terapia' }, { icon: '🧩', text: 'Riadená hra' }, { icon: '🧘', text: 'Senzorická prestávka' } ]},
  { time: '12:00', label: 'Obed', icon: '🍎', items: [
    { icon: '🍽️', text: 'Obed' }, { icon: '😴', text: 'Oddych / pokoj' } ]},
  { time: '14:00', label: 'Poobede', icon: '🧸', items: [
    { icon: '🎨', text: 'Voľná hra' }, { icon: '🚶', text: 'Von / prechádzka' }, { icon: '⭐', text: 'First–then úloha' } ]},
  { time: '18:00', label: 'Večer', icon: '🌙', items: [
    { icon: '🍲', text: 'Večera' }, { icon: '🛁', text: 'Kúpeľ' }, { icon: '📖', text: 'Kniha' }, { icon: '🛏️', text: 'Spánok' } ]},
];

export const ROUTINE_PRINCIPLES = [
  'Predvídateľnosť pred dokonalosťou — rovnaký sled je dôležitejší než presné minúty.',
  'Vizuál vždy na očiach (chladnička, dvere, nástenka), v úrovni očí dieťaťa.',
  'Jeden krok naraz — pri neúspechu skráť, nie predĺž.',
  'Prechody ohlasuj vopred (odpočet, časovač, „ešte raz a potom…").',
  'Zmeny v pláne ukáž skôr, než nastanú — prekvapenie = úzkosť.',
  'Chváľ konkrétne za spolupráci, nie všeobecne.',
];

export const ROUTINE_SOURCES = [
  { label: 'AFIRM (UNC) — Visual Supports (EBP)', url: 'https://afirm.fpg.unc.edu/visual-supports' },
  { label: 'National Autistic Society — Visual supports', url: 'https://www.autism.org.uk/advice-and-guidance/topics/communication/communication-tools/visual-supports' },
];
