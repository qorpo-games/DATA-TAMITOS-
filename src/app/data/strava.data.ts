/**
 * Strava: čo naozaj pomáha (a čo je mýtus) — skúsenosť rodičov, NIE lekárska rada.
 * Rámec: žiadne jedlo autizmus nelieči; dobrá strava podporuje vývin, trávenie, imunitu a energiu.
 * Obsah v súlade s bežnými pediatrickými odporúčaniami (dojčenská výživa, skoré zavádzanie
 * alergénov, bezpečnostné hranice — med po 1. roku, celé orechy riziko udusenia do ~5 r.).
 */

export const STRAVA_UPDATED = 'august 2026';

export const STRAVA_INTRO =
  'Žiadne jedlo ani „superpotravina" autizmus nelieči ani neruší jeho príznaky. Kto to sľubuje, predáva. ' +
  'Čo dobrá strava naozaj vie — a pri tom platí pre každé dieťa rovnako — je podporiť vývin mozgu, trávenie, ' +
  'imunitu a energiu. Nie sme lekári, sme rodičia; toto je len to, čo sme sa naučili.';

export const STRAVA_RULE =
  'Pri malých deťoch sa vždy najprv poraď s pediatrom — dojčenská výživa má svoje pravidlá a bezpečnostné hranice.';

/** Podľa veku — toto je kľúčové. Kartičky. */
export interface AgeStage { icon: string; age: string; title: string; text: string; tag?: string; }
export const STRAVA_AGES: AgeStage[] = [
  {
    icon: '🍼', age: 'Novorodenec a dojča do ~6 mes.', title: 'Len mlieko',
    text: 'Len materské mlieko alebo dojčenská formula. Nič iné — žiadna brokolica, orechy ani „ochutnávky". ' +
      'Mlieko v tomto veku pokrýva všetko. Jediný bežný doplnok je vitamín D (kvapky), ideálne po dohode s pediatrom.',
    tag: 'Bez tuhej stravy',
  },
  {
    icon: '🥄', age: 'Od ~6 mesiacov', title: 'Zavádzanie tuhej stravy',
    text: 'Začína sa, keď dieťa vie držať hlavičku, sedieť s oporou a zaujíma sa o jedlo. Začni jednoduchými ' +
      'varenými pyré (zelenina, ovocie) a detskými kašami. Novinka oproti minulosti: alergény (vajce, arašidy, ' +
      'oriešky, mliečne, ryby) sa dnes zavádzajú SKÔR, nie neskôr — znižuje to riziko alergie. Ale výhradne v ' +
      'bezpečnej forme: tenko roztretý orieškový/arašidový krém zriedený mliekom či pyré, nikdy celý oriešok.',
    tag: 'Alergény skôr, bezpečne',
  },
  {
    icon: '🧒', age: 'Batoľa a väčšie dieťa', title: 'Pestrý tanier',
    text: 'Ryby, mäso, strukoviny, vajcia, zelenina, plnohodnotné obilniny, zdravé tuky. Cieľom je pestrosť ' +
      'a bezpečná forma podania — nie „liečebná diéta". Detaily nižšie v sekcii „Čo má na tanieri zmysel".',
    tag: 'Pestrosť a trpezlivosť',
  },
];

/** ⚠️ Bezpečnosť, na ktorú sa nezabúda. */
export const STRAVA_SAFETY = {
  title: 'Bezpečnosť, na ktorú sa nezabúda',
  items: [
    'Celé orechy a arašidy = riziko udusenia až do ~5 rokov — malému dieťaťu nikdy nedávaj vcelku.',
    'Med až po 1. roku (riziko botulizmu).',
    'Kravské mlieko ako hlavný nápoj až po 1. roku.',
  ],
};

/** Čo má na tanieri zmysel (batoľa a väčšie dieťa) — kartičky. */
export interface PlateItem { icon: string; title: string; text: string; }
export const STRAVA_PLATE: PlateItem[] = [
  { icon: '🐟', title: 'Omega-3 (ryby)',
    text: 'Tučné ryby ako losos či sardinky prispievajú k vývinu mozgu. Ak dieťa ryby neje, prichádza na rad rybí olej ako doplnok.' },
  { icon: '🥩', title: 'Železo',
    text: 'Červené mäso, strukoviny, vaječný žĺtok, listová zelenina. Dôležité pre pozornosť aj spánok. (Tabletami dopĺňať len po teste a cez lekára.)' },
  { icon: '🥦', title: 'Zelenina a vláknina',
    text: 'Áno, aj brokolica a pestrá zelenina — ako súčasť normálnej zdravej stravy, nie ako „liek na autizmus". Podávaj mäkko uvarenú, nech sa ľahko zje.' },
  { icon: '🥜', title: 'Orechy a semienka',
    text: 'Zdravý zdroj tukov, ale pre malé deti len ako jemný krém alebo pomleté — nikdy vcelku (viď bezpečnosť).' },
  { icon: '🍳', title: 'Pestrosť a bielkoviny',
    text: 'Vajcia, mäso, strukoviny, plnohodnotné obilniny. Pri autizme býva výberové jedenie časté — radšej malé kroky a trpezlivosť než boj pri stole.' },
];

/** O výberovom jedení. */
export const STRAVA_PICKY = {
  title: 'O výberovom jedení',
  text: 'Veľa autistických detí je vyberavých — a to nie je rozmar. Často je za tým citlivosť na textúru, chuť ' +
    'či vôňu. Nefunguje tlak. Funguje opakované, nenásilné ponúkanie, spoločné jedenie a malé porcie. Ak je ' +
    'jedálniček naozaj úzky, poraď sa s pediatrom alebo nutričným terapeutom, či netreba doplniť konkrétne živiny.',
};

export const STRAVA_CLOSING =
  'Cieľom nie je „zázračná diéta", ale pestrý, bezpečný a veku primeraný tanier. Zdravé jedlo je základ pre ' +
  'každé dieťa. Autizmus sa ním nelieči, ale dobre živené dieťa to má vo všetkom ľahšie.';

export const STRAVA_SOURCES = [
  { label: 'HealthyChildren.org (AAP) — Starting Solid Foods', url: 'https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/Switching-To-Solid-Foods.aspx' },
  { label: 'AAP — Early introduction of allergens (peanut)', url: 'https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/Introducing-Peanut-Containing-Foods-to-Prevent-Peanut-Allergy.aspx' },
  { label: 'HealthyChildren.org (AAP) — Choking prevention / foods to avoid', url: 'https://www.healthychildren.org/English/health-issues/injuries-emergencies/Pages/Choking-Prevention.aspx' },
];
