/**
 * Vitamíny a doplnky — skúsenosť rodičov, NIE lekárska rada.
 * Rámec: najprv otestovať krvou, potom cielene dopĺňať to, čo naozaj chýba.
 * Žiaden doplnok autizmus nelieči ani nenahrádza terapiu.
 * Obsah je v súlade s dostupnými dôkazmi (omega-3 — mierny efekt; vitamín D — bezpečný
 * štandard 400 IU; folinát/leukovorín — jediný doplnok s RCT dôkazom na verbálnu
 * komunikáciu, ale je to LIEK NA PREDPIS). Železo a folinát len cez lekára.
 */

export const VITAMINS_UPDATED = 'august 2026';

/** „Prečítaj si najskôr toto" — rámec a disclaimer. */
export const VITAMINS_INTRO =
  'Nie sme lekári, sme rodičia. Toto nie je lekárska rada ani liečba — je to len to, čo sme sa sami naučili ' +
  'a čo dávame vlastnému dieťaťu. Každé dieťa je iné, preto sa vždy poraď so svojím pediatrom, kým niečo začneš dávať.';

/** Zlaté pravidlo. */
export const VITAMINS_RULE =
  'Najprv otestovať krvou, potom cielene dopĺňať to, čo naozaj chýba — nie dávať všetko naslepo. ' +
  'A hlavne: žiaden doplnok autizmus nelieči a nenahrádza terapiu (AAC, logopédiu, prácu s dieťaťom). ' +
  'Doplnky sú len doplnok, nie motor.';

export type Ev = 'good' | 'warn' | 'info';

/** Doplnky, ktoré rodičia zvyknú zvažovať — kartičky. */
export interface Supplement {
  icon: string;
  name: string;
  ev: Ev;
  evLabel: string;
  why: string;
  quality: string;   // na čo sa pozerať pri kvalite
  dose: string;      // orientačná dávka
  note?: string;
}
export const VITAMINS_SUPPLEMENTS: Supplement[] = [
  {
    icon: '🐟', name: 'Omega-3 (rybí olej)', ev: 'info', evLabel: 'Mierny, ale reálny efekt',
    why: 'Podporuje vývin mozgu a má mierny, ale reálny efekt na pozornosť a sústredenie.',
    quality: 'Triglyceridová (TG) forma, certifikát čistoty IFOS, testovanie na ťažké kovy. Pre deti ideálne ' +
      'tekutá ochutená forma, aby to prijali.',
    dose: 'Orientačne okolo 250–500 mg DHA denne s jedlom pre menšie dieťa; presné množstvo podľa veku potvrdí pediater.',
  },
  {
    icon: '☀️', name: 'Vitamín D3', ev: 'good', evLabel: 'Bezpečný štandard',
    why: 'Nedostatok je u nás, hlavne v zime, skoro pravidlo a ovplyvňuje imunitu aj celkový vývin.',
    quality: 'Čistá forma — len D3 v oleji, bez cukru a farbív, ideálne kvapky, kde presne odmeriaš.',
    dose: 'Bezpečný celoročný štandard pre malé dieťa je 400 IU denne. Vyššiu dávku má zmysel len vtedy, keď ' +
      'lekár z odberu zistí nízku hladinu — a pod jeho vedením.',
    note: 'Vitamín D sa v tele hromadí — preto nekupuj „najsilnejší".',
  },
  {
    icon: '🌙', name: 'Horčík (magnézium bisglycinát)', ev: 'info', evLabel: 'Slabšie dôkazy, bezpečný',
    why: 'Jemná večerná podpora pokoja a spánku. Dôkazy sú slabšie, ale je bezpečný a dobre znášaný.',
    quality: 'Forma bisglycinát (najšetrnejšia k brušku), ideálne prášok alebo otvárateľná kapsula, aby si ' +
      'vedel odmerať malú detskú dávku.',
    dose: 'Dieťa potrebuje len zlomok dospelej dávky, dávaj večer s jedlom. Ak by sa objavila riedka stolica, dávku zníž.',
    note: 'Na spánok navyše: najlepšie podloženou možnosťou je melatonín — ten však rieš cez pediatra alebo ' +
      'lekárnika, dávkovanie aj forma sú u detí špecifické.',
  },
];

/** ⚠️ Toto NIKDY nekupuj sám, len cez lekára. */
export interface VitaminWarn { icon: string; name: string; text: string; }
export const VITAMINS_NEVER = {
  title: 'Toto NIKDY nekupuj sám — len cez lekára',
  items: [
    {
      icon: '🩸', name: 'Železo',
      text: 'Dopĺňať len po teste (feritín) a pod dohľadom lekára. Predávkovanie železom je u detí ' +
        'nebezpečné. Nie je to doplnok do košíka.',
    },
    {
      icon: '💊', name: 'Folinát (leukovorín)',
      text: 'Je to LIEK NA PREDPIS, nie výživový doplnok. Je to jediná vec s dôkazom priamo na verbálnu ' +
        'komunikáciu, ale patrí výhradne do rúk lekára — ideálne po teste protilátok proti folátovému ' +
        'receptoru (FRAA).',
    },
  ] as VitaminWarn[],
};

/** Skôr než siahneš po doplnkoch: testy, ktoré majú zmysel. */
export const VITAMINS_TESTS_INTRO =
  'Doplnky sa ľahko kúpia, ale bez toho, aby si vedel, čo dieťaťu naozaj chýba, väčšinou len tipuješ. ' +
  'Najužitočnejšie, čo môžeš urobiť, je nechať u pediatra spraviť pár cielených krvných testov — potom ' +
  'dopĺňaš presne to, čo je nízke. Aké testy vypýtať posúdi tvoj lekár; toto je zoznam na rozhovor s ním.';

export interface VitaminTest { icon: string; label: string; text: string; }
export const VITAMINS_TESTS: VitaminTest[] = [
  { icon: '☀️', label: 'Vitamín D (25-OH vitamín D)',
    text: 'Najčastejší reálny nedostatok u detí, hlavne v zime. V základných odberoch sa bežne nemeria — treba oň priamo požiadať.' },
  { icon: '🩸', label: 'Feritín a krvný obraz',
    text: 'Feritín ukazuje zásoby železa. Nízke železo sa spája s horším spánkom, nepokojom a horšou pozornosťou. ' +
      'Ideálne feritín spolu s CRP naraz (pri zápale feritín falošne stúpa).' },
  { icon: '🧬', label: 'B12 a folát',
    text: 'Dôležité pre nervový systém a vývin. Ak má dieťa v krvnom obraze väčšie červené krvinky (vyššie MCV), je to signál pozrieť tieto hodnoty.' },
  { icon: '🦋', label: 'Štítna žľaza (TSH, fT4)',
    text: 'Lacné a bežné doplnenie; pri únave, nepokoji či hyperaktivite to lekári často pridávajú.' },
  { icon: '🌾', label: 'Skríning celiakie (anti-tTG + celkové IgA)',
    text: 'Overená cesta, ako vyriešiť otázku lepku. Celkové IgA je dôležité vypýtať naraz — keď je nízke, samotný test na celiakiu môže byť falošne negatívny.' },
  { icon: '🩺', label: 'Pri tráviacich ťažkostiach: kalprotektín',
    text: 'Ak sú zápcha, hnačka či bolesti bruška, oplatí sa spomenúť pediatrovi kalprotektín zo stolice, prípadne detskú gastroenterológiu. Nepohodlie v bruchu sa u detí často prejaví ako „správanie".' },
];

export const VITAMINS_TESTS_SENTENCE =
  '„Chceli by sme dať skontrolovať vitamín D, feritín (s CRP), B12 a folát, štítnu žľazu a skríning celiakie, ' +
  'aby sme vedeli, čo dieťaťu naozaj chýba, skôr než začneme dopĺňať."';

export const VITAMINS_CLOSING =
  'Ber toto ako inšpiráciu, o čom sa porozprávať s pediatrom, nie ako návod na liečbu. Cieľom nie je nakúpiť ' +
  'čo najviac doplnkov, ale dať dieťaťu presne to, čo potrebuje — a nezaťažovať ho tým, čo nepotrebuje. ' +
  'Test najprv, doplnok potom. Najviac dieťaťu pomôže terapia a čas, ktorý mu venuješ.';

export const VITAMINS_SOURCES = [
  { label: 'Lurie Center for Autism (Mass General) — Omega-3 Fatty Acids', url: 'https://www.massgeneral.org/children/autism/lurie-center/omega3-fatty-acids' },
  { label: 'Frye et al. 2016 — Folinic acid improves verbal communication (RCT, Molecular Psychiatry)', url: 'https://www.nature.com/articles/mp2016168' },
  { label: 'Cerebral folate deficiency, FRAA & leucovorin v ASD — systematický prehľad a metaanalýza (2021)', url: 'https://pubmed.ncbi.nlm.nih.gov/34834493/' },
];
