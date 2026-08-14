import { GuideItem } from '../models/models';

/**
 * Obsah stránky „Čo funguje a čo nie" — tri úrovne dôkazov.
 * Každá položka má povinný zdroj (proof) a rok kľúčového dôkazu.
 */
export const FUNGUJE: GuideItem[] = [
  {
    title: 'Skorá behaviorálna intervencia (ABA/ESDM)',
    note: 'Intenzívna podpora v ranom veku rozvíja komunikáciu a zručnosti. Dôležitá je kvalita terapeuta a funkčné ciele (nie „normalizácia").',
    forWho: 'deti, hlavne 2–5 r.',
    evidence: 'good',
    year: '2018',
    source: {
      label: 'Cochrane',
      url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD009260.pub3/full',
    },
  },
  {
    title: 'Logopédia a AAC',
    note: 'Rozvoj funkčnej komunikácie. Alternatívna komunikácia (obrázky, tablet) reč nebrzdí — naopak ju podporuje, aj u nehovoriacich detí.',
    forWho: 'každý vek',
    evidence: 'good',
    year: '2024',
    source: { label: 'Meta-analýza', url: 'https://pubmed.ncbi.nlm.nih.gov/38848009/' },
  },
  {
    title: 'Tréning rodiča (napr. PACT)',
    note: 'Terapeut učí rodiča, ako v bežnej hre podporovať dieťa. Jeden z mála prístupov s dokázaným pretrvávaním efektu po rokoch.',
    forWho: 'predškoláci',
    evidence: 'good',
    year: '2016',
    source: {
      label: 'Lancet',
      url: 'https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(16)31229-6/fulltext',
    },
  },
  {
    title: 'Liečba spánku (melatonín)',
    note: 'Pri poruchách spánku po zlyhaní spánkovej hygieny. Vždy najskôr behaviorálne opatrenia a vylúčenie iných príčin.',
    forWho: 'deti so spánkovými ťažkosťami',
    evidence: 'good',
    year: '2022',
    source: {
      label: 'Meta-analýza',
      url: 'https://www.sciencedirect.com/science/article/abs/pii/S0278584622001877',
    },
  },
  {
    title: 'Lieky na iritabilitu (risperidón, aripiprazol)',
    note: 'Pri ťažkej dráždivosti, agresii či sebapoškodzovaní. Jediné schválené na tento účel. Nutný monitoring (priberanie, metabolizmus).',
    forWho: 'ťažké prípady',
    evidence: 'good',
    year: '2025',
    source: {
      label: 'Cochrane',
      url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD014965.pub2/full',
    },
  },
  {
    title: 'Podpora úzkosti (adaptovaná KBT)',
    note: 'Kognitívno-behaviorálna terapia prispôsobená autizmu je prvá voľba pri komorbidnej úzkosti u kognitívne zdatnejších detí.',
    forWho: 'staršie deti/dospelí',
    evidence: 'good',
    year: '2013',
    source: { label: 'Meta-analýza', url: 'https://pubmed.ncbi.nlm.nih.gov/24167175/' },
  },
];

export const SKUMA: GuideItem[] = [
  {
    title: 'Fekálna transplantácia (FMT/MTT)',
    note: 'Cez črevno-mozgovú os. Prvé výsledky nádejné, ale bez kontrolnej skupiny (18 detí). Zatiaľ to nie je preukázaná liečba; väčšia štúdia beží.',
    forWho: 'len v štúdii',
    evidence: 'warn',
    year: '2019',
    source: { label: 'ASU štúdia', url: 'https://pubmed.ncbi.nlm.nih.gov/30967657/' },
  },
  {
    title: 'Senzorická integrácia',
    note: 'Pri senzorických ťažkostiach môže časti detí pomôcť ako doplnok. Dôkazy sú zmiešané — rozumné úpravy prostredia áno, „liečba" nie.',
    forWho: 'doplnok',
    evidence: 'warn',
    year: '2019',
    source: {
      label: 'Autism Research',
      url: 'https://onlinelibrary.wiley.com/doi/full/10.1002/aur.2046',
    },
  },
  {
    title: 'CBD / kanabidiol',
    note: 'Skúma sa na dráždivosť a úzkosť. Bezpečnejší profil, ale účinnosť len čiastočná. Pozor na nekontrolovaný obsah „olejov" a interakcie.',
    forWho: 'len pod dohľadom',
    evidence: 'warn',
    year: '2025',
    source: {
      label: 'RCT',
      url: 'https://link.springer.com/article/10.1007/s10803-025-06884-y',
    },
  },
  {
    title: 'Muzikoterapia / zvieracie terapie',
    note: 'Príjemné a nízkorizikové, deti ich majú rady. Prínos na jadrové symptómy je slabý/nekonzistentný — berte ako podporu, nie liečbu.',
    forWho: 'doplnok',
    evidence: 'warn',
    year: '2022',
    source: {
      label: 'Cochrane',
      url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004381.pub4/full',
    },
  },
  {
    title: 'Probiotiká / mikrobióm',
    note: 'Môžu pomôcť skôr na tráviace ťažkosti a dráždivosť než na samotný autizmus. Žiadny konkrétny prípravok nie je overený.',
    forWho: 'nízke riziko',
    evidence: 'warn',
    year: '2024',
    source: { label: 'Meta-analýza', url: 'https://pubmed.ncbi.nlm.nih.gov/39265200/' },
  },
  {
    title: 'Kyselina folínová (leukovorín)',
    note: 'Cielené na malú podskupinu. Najväčšia štúdia bola v 2026 stiahnutá. FDA ho schválila len pre zriedkavú poruchu — nie na autizmus všeobecne.',
    forWho: 'len podskupina',
    evidence: 'warn',
    year: '2026',
    source: {
      label: 'The Transmitter',
      url: 'https://www.thetransmitter.org/spectrum/largest-leucovorin-autism-trial-retracted/',
    },
  },
];

export const VYHNITE: GuideItem[] = [
  {
    title: '🔴 MMS / oxid chloričitý',
    note: 'V podstate priemyselné bielidlo podávané deťom ústami či klystírom. FDA dôrazne varuje: poškodenie čriev, zlyhanie pečene. Nikdy.',
    evidence: 'crit',
    year: 'FDA varovanie',
    source: {
      label: 'Autism Research Institute',
      url: 'https://autism.org/dangerous-miracle-mineral-solution/',
    },
  },
  {
    title: '🔴 Chelácia „na ťažké kovy"',
    note: 'Autizmus nie je otrava kovmi. Odstraňuje aj vápnik → smrteľná arytmia. Zdokumentované úmrtia detí. FDA varuje.',
    evidence: 'crit',
    year: 'FDA varovanie',
    source: {
      label: 'FDA',
      url: 'https://www.fda.gov/drugs/medication-health-fraud/questions-and-answers-unapproved-chelation-products',
    },
  },
  {
    title: '🔴 Kmeňové bunky (komerčné)',
    note: 'Najlepšia štúdia (Duke) nesplnila cieľ. Kliniky v zahraničí predávajú neschválené infúzie za tisíce eur. Riziká reálne.',
    evidence: 'crit',
    year: '2024',
    source: {
      label: 'The Transmitter',
      url: 'https://www.thetransmitter.org/spectrum/u-s-agency-warns-company-marketing-stem-cells-for-autism/',
    },
  },
  {
    title: 'Facilitovaná komunikácia',
    note: 'Správy v skutočnosti píše „facilitátor", nie dieťa. Viedlo k falšivým obvineniam a rozvráteným rodinám. Odmietané odborníkmi.',
    evidence: 'crit',
    year: 'opakovane vyvrátené',
    source: {
      label: 'ASAT',
      url: 'https://asatonline.org/for-parents/learn-more-about-specific-treatments/facilitated-communication/',
    },
  },
  {
    title: 'Hyperbarická komora (HBOT)',
    note: 'Kvalitné štúdie nepreukázali prínos. Riziká barotraumy a požiaru, vysoké náklady, ktoré odvádzajú od účinnej podpory.',
    evidence: 'crit',
    year: '2025',
    source: {
      label: 'Meta-analýza',
      url: 'https://www.sciencedirect.com/science/article/abs/pii/S0278584625000119',
    },
  },
  {
    title: 'Prísne diéty a megavitamíny',
    note: 'Bezlepková diéta nemá dôkaz na jadrové symptómy a hrozí nutričnými deficitmi. Vysoké dávky B6 → poškodenie nervov.',
    evidence: 'crit',
    year: '2022',
    source: {
      label: 'Nutrition Reviews',
      url: 'https://academic.oup.com/nutritionreviews/article/80/5/1237/6382508',
    },
  },
];

export const RED_FLAGS: string[] = [
  'Sľubuje „vyliečenie" alebo „recovery" z autizmu',
  'Tvrdí, že autizmus je otrava (kovmi, kvasinkami, toxínmi)',
  'Obviňuje vakcíny',
  'Predáva test, ktorý „náhodou" vždy zdôvodní ich liečbu',
  'Spolieha sa na svedectvá namiesto štúdií',
  'Žiada drahé injekcie, klystíry či protokoly bez lekára',
  'Odrádza od overenej terapie a logopédie',
  'Tlačí na rýchle rozhodnutie a platbu vopred',
];
