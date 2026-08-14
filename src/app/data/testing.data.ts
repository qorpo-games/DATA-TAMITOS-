/**
 * Vyšetrenia a testy pri PAS — evidence-based diagnostický postup.
 * Obsah odborne zladený s odporúčaniami AAP/ACMG a ARUP Consult:
 * chromozómový microarray (CMA) + Fragile X (FMR1) ako prvá línia,
 * exómové/genómové sekvenovanie ako 1.–2. línia, metabolika podľa indikácie.
 * NIE je to lekárska rada — o testoch a ich poradí rozhoduje pediater / klinický genetik.
 */

export const TESTING_UPDATED = 'august 2026';

export const TESTING_GOAL =
  'Nehľadáme jeden krvný test, ktorý „vysvetlí autizmus". Autizmus sa nediagnostikuje z krvi. ' +
  'Cieľom komplexného vyšetrenia je odpovedať na 4 otázky:';

export const TESTING_QUESTIONS = [
  'Nemá dieťa liečiteľný deficit? (železo, B12, folát, vitamín D…)',
  'Nie je prítomné pridružené ochorenie? (štítna žľaza, celiakia, anémia, pečeň, obličky…)',
  'Existuje identifikovateľná genetická príčina neurovývinovej poruchy?',
  'Sú príznaky, ktoré odôvodňujú metabolickú, neurologickú, gastro alebo imunologickú diagnostiku?',
];

export type Ev = 'good' | 'warn' | 'info';

export interface TestGroup { label: string; items: string[]; }
export interface TestStep {
  n: number;
  icon: string;
  title: string;
  ev: Ev;         // good = odporúčané/štandard, info = podľa indikácie, warn = pozor
  evLabel: string;
  intro: string;
  groups?: TestGroup[];
  note?: string;
}

export const TESTING_STEPS: TestStep[] = [
  {
    n: 1, icon: '👩‍⚕️', title: 'Pediatrička — vstupné vyšetrenie a plán', ev: 'good', evLabel: 'Prvý krok',
    intro:
      'Objednajte sa a povedzte jasný cieľ: „Dieťa má poruchu autistického spektra a chceme komplexné zdravotné ' +
      'vyšetrenie. Nehľadáme krvný test na autizmus — chceme vylúčiť pridružené ochorenia, nutričné deficity, ' +
      'problémy so štítnou žľazou, celiakiu a podľa potreby metabolické alebo genetické ochorenie."',
    groups: [
      { label: 'Poproste o', items: [
        'komplexné pediatrické vyšetrenie',
        'základné laboratórne vyšetrenia (prvý veľký odber)',
        'výmenný lístok na kliniku lekárskej genetiky',
        'podľa symptómov odporúčanie na neurológiu, gastroenterológiu, imunológiu alebo metabolickú ambulanciu',
      ]},
    ],
    note: 'Väčšina týchto testov je hradená poisťovňou cez pediatra — nie je nutné ísť najprv k drahým samoplatcovským panelom.',
  },
  {
    n: 2, icon: '🩸', title: 'Prvý veľký odber krvi', ev: 'good', evLabel: 'Základ',
    intro: 'Základný screening, ktorý odhalí najčastejšie liečiteľné deficity a pridružené ochorenia.',
    groups: [
      { label: 'A · Krvný obraz a zápal', items: [
        'kompletný + diferenciálny krvný obraz', 'retikulocyty', 'CRP', 'sedimentácia (FW)' ]},
      { label: 'Železo a krvotvorba', items: [
        'ferritín', 'železo', 'transferín', 'TIBC/UIBC', 'saturácia transferínu', 'vitamín B12', 'folát' ]},
      { label: 'B · Pečeň, obličky, metabolizmus', items: [
        'glukóza nalačno', 'HbA1c', 'celkové bielkoviny', 'albumín', 'bilirubín (celkový + priamy)',
        'AST', 'ALT', 'GGT', 'ALP', 'LDH', 'CK', 'kreatinín', 'urea', 'kyselina močová' ]},
      { label: 'C · Minerály a elektrolyty', items: [
        'sodík', 'draslík', 'chloridy', 'vápnik', 'fosfor', 'horčík', 'zinok', 'meď', 'ceruloplazmín' ]},
      { label: 'D · Vitamíny (priorita)', items: [
        '25-OH vitamín D', 'vitamín B12', 'folát', '(A a E len podľa stravy/malabsorpcie)' ]},
      { label: 'E · Štítna žľaza', items: [
        'TSH', 'fT4', '(fT3, anti-TPO, anti-TG len pri náleze/podozrení)' ]},
      { label: 'F · Celiakia', items: [
        'anti-tTG IgA', 'celkové IgA', '⚠️ pred testom svojvoľne nevysádzať lepok!' ]},
    ],
  },
  {
    n: 3, icon: '🧪', title: 'Moč', ev: 'good', evLabel: 'Základ',
    intro: 'Popri krvi jednoduché a lacné vyšetrenie.',
    groups: [{ label: 'Vyšetrenie', items: ['chemické vyšetrenie moču', 'močový sediment', '(ďalšie len podľa nálezu)'] }],
  },
  {
    n: 4, icon: '🧬', title: 'Klinická genetika — najdôležitejšia časť', ev: 'good', evLabel: 'Odporúčané (AAP/ACMG)',
    intro:
      'Odborný konsenzus (AAP/ACMG): pri PAS/neurovývinovej poruche neznámej príčiny je indikované etiologické ' +
      'genetické vyšetrenie. O konkrétnom poradí rozhoduje klinický genetik. Genetikovi povedzte: „Chceme čo ' +
      'najkomplexnejšie etiologické genetické vyšetrenie neurovývinovej poruchy."',
    groups: [
      { label: 'Na genetiku prineste', items: [
        'neurologické nálezy', 'psychologické/vývojové vyšetrenia', 'správu o diagnostike PAS',
        'prepúšťacie správy', 'info o tehotenstve, pôrode a vývoji dieťaťa', 'info o prípadnej regresii',
        'zoznam liekov a suplementov', 'rodinnú anamnézu (genetické/neurologické/vývojové problémy)' ]},
      { label: 'Testy, o ktorých rozhodne genetik', items: [
        'SNP / chromozómový microarray (CMA) — prvá línia',
        'FMR1 (Fragile X) — pri indikácii',
        'cielené testy podľa fenotypu (napr. MECP2, PTEN)',
        'NGS panel neurovývinových porúch',
        'WES — celoexómové sekvenovanie (rastúci štandard, ideálne „trio" s rodičmi)' ]},
    ],
    note: 'Neobjednávajte svojvoľne iba komerčný test „Autizmus" (vyšetruje len 15q11-q13 a 16p11.2) — je to úzky test, nie kompletné genetické vyšetrenie.',
  },
  {
    n: 5, icon: '⚗️', title: 'Metabolická diagnostika — podľa indikácie', ev: 'info', evLabel: 'Len pri príznakoch',
    intro:
      'Nerobí sa automaticky ako samoplatca. Indikuje ju genetik/neurológ/metabolický špecialista — najmä pri ' +
      'vývojovej regresii, epilepsii, svalovej slabosti, poruchách rastu či opakovaných nevysvetliteľných stavoch.',
    groups: [{ label: 'Napríklad', items: [
      'amoniak', 'laktát (príp. pyruvát)', 'aminokyseliny v plazme', 'acylkarnitínový profil',
      'celkový a voľný karnitín', 'organické kyseliny v moči', 'homocysteín' ]}],
  },
  {
    n: 6, icon: '🛡️', title: 'Imunológia — podľa indikácie', ev: 'info', evLabel: 'Len pri príznakoch',
    intro:
      'Veľký imunologický panel sa nerobí automaticky. Pri častých infekciách alebo výrazných alergiách ho cielene ' +
      'indikuje imunológ.',
    groups: [{ label: 'Napríklad', items: ['IgG', 'IgA', 'IgM', 'celkové IgE', 'IgG subclasses', 'C3', 'C4'] }],
  },
];

export const TESTING_AVOID = {
  title: 'Čo NErobiť ako prvú líniu',
  intro: 'Bez konkrétnej medicínskej indikácie tieto testy zvyčajne nemajú preukázaný klinický význam pre PAS ' +
    '(a bývajú drahé — často ich ponúkajú komerčné samoplatcovské laboratóriá):',
  items: [
    'potravinové IgG „intolerancie"',
    'vlasové analýzy minerálov a ťažkých kovov',
    '„leaky gut" panely',
    'rozsiahle mikrobiómové panely bez indikácie',
    'rozsiahle cytokínové panely',
    'komerčné „autism biomarker" panely',
    'náhodné testovanie desiatok hormónov',
    'testy sľubujúce z krvi určiť „príčinu autizmu"',
  ],
};

export const TESTING_SOURCES = [
  { label: 'AAP — Genetic Evaluation (DD/ID) 2025', url: 'https://publications.aap.org/pediatrics/article/156/1/e2025072219/202230/Genetic-Evaluation-of-the-Child-With-Intellectual' },
  { label: 'ARUP Consult — DD/ID/ASD testing', url: 'https://arupconsult.com/content/developmental-delay-dd-or-intellectual-disability-id-testing' },
  { label: 'Exome as first-tier test (konsenzus)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6831729/' },
];
