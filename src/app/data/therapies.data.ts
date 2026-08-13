import { Evidence, Source } from '../models/models';

export interface Therapy {
  name: string;
  cat: 'behav' | 'komun' | 'senzo' | 'kreat' | 'bio';
  ev: Evidence;
  note: string;
  src: Source;
}

export const CAT_LABEL: Record<Therapy['cat'], string> = {
  behav: 'Behaviorálne',
  komun: 'Komunikácia',
  senzo: 'Senzorika/pohyb',
  kreat: 'Kreatívne/zvieratá',
  bio: 'Biomedicína',
};

/** Katalóg terapií s dôkazovou úrovňou — jadro odlíšenia od bežných adresárov. */
export const THERAPIES: Therapy[] = [
  { name: 'ABA / EIBI', cat: 'behav', ev: 'good', note: 'Intenzívna behaviorálna intervencia. Stredná evidencia; kľúčová certifikácia (BCBA) a funkčné ciele.', src: { label: 'Cochrane', url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD009260.pub3/full' } },
  { name: 'ESDM', cat: 'behav', ev: 'good', note: 'Naturalistická vývinová intervencia pre batoľatá. Zlepšuje najmä kogníciu a jazyk.', src: { label: 'Meta 2020', url: 'https://www.mdpi.com/2076-3425/10/6/368' } },
  { name: 'PRT (Pivotal Response)', cat: 'behav', ev: 'good', note: 'Zameraná na motiváciu a iniciáciu v prirodzenom prostredí.', src: { label: 'Umbrella review', url: 'https://pubmed.ncbi.nlm.nih.gov/35153850/' } },
  { name: 'Parent-mediated (PACT)', cat: 'behav', ev: 'good', note: 'Tréning rodiča. PACT ako jeden z mála má dôkaz pretrvávania efektu (6 rokov).', src: { label: 'Lancet 2016', url: 'https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(16)31229-6/fulltext' } },
  { name: 'TEACCH', cat: 'behav', ev: 'warn', note: 'Štruktúrované učenie. Dobre tolerované, ale evidencia slabšia/zmiešaná.', src: { label: 'ASHA', url: 'https://apps.asha.org/EvidenceMaps/' } },
  { name: 'Logopédia (funkčná)', cat: 'komun', ev: 'good', note: 'Rozvoj funkčnej komunikácie. Kľúčová pre minimálne verbálne deti.', src: { label: 'ASHA', url: 'https://apps.asha.org/EvidenceMaps/' } },
  { name: 'AAC / AAK', cat: 'komun', ev: 'good', note: 'Alternatívna komunikácia. Mýtus, že brzdí reč, je vyvrátený — podporuje ju.', src: { label: 'Meta 2024', url: 'https://pubmed.ncbi.nlm.nih.gov/38848009/' } },
  { name: 'Facilitovaná komunikácia', cat: 'komun', ev: 'crit', note: 'Píše facilitátor, nie dieťa. Viedla k falšivým obvineniam. Odmietané ASHA/AAP.', src: { label: 'ASAT', url: 'https://asatonline.org/for-parents/learn-more-about-specific-treatments/facilitated-communication/' } },
  { name: 'Senzorická integrácia', cat: 'senzo', ev: 'warn', note: 'Manualizovaná ASI má nejaké RCT; voľné senzorické techniky sú bez evidencie.', src: { label: 'Autism Research', url: 'https://onlinelibrary.wiley.com/doi/full/10.1002/aur.2046' } },
  { name: 'Ergoterapia (funkčná)', cat: 'senzo', ev: 'good', note: 'Podpora každodenných zručností pri konkrétnych funkčných cieľoch.', src: { label: 'AJOT', url: 'https://research.aota.org/ajot' } },
  { name: 'Hyperbarická komora (HBOT)', cat: 'senzo', ev: 'crit', note: 'Kvalitné RCT bez prínosu. Riziká barotraumy, požiaru, vysoké náklady.', src: { label: 'Meta 2025', url: 'https://www.sciencedirect.com/science/article/abs/pii/S0278584625000119' } },
  { name: 'Muzikoterapia', cat: 'kreat', ev: 'warn', note: 'Môže podporiť interakciu; novšie RCT efekt zmenšili. Zmiešaná evidencia.', src: { label: 'Cochrane', url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004381.pub4/full' } },
  { name: 'Hipoterapia', cat: 'kreat', ev: 'warn', note: 'Terapia s koňom. Malé štúdie naznačujú prínos; kvalita nízka.', src: { label: 'prehľad', url: 'https://www.ncbi.nlm.nih.gov/' } },
  { name: 'Canisterapia', cat: 'kreat', ev: 'warn', note: 'Terapia so psom. Pozitívne skúsenosti, slabá kontrolovaná evidencia.', src: { label: 'prehľad', url: 'https://www.ncbi.nlm.nih.gov/' } },
  { name: 'Kraniosakrálna terapia', cat: 'kreat', ev: 'crit', note: '„Kraniosakrálny rytmus" fyziologicky neexistuje. Neúčinné.', src: { label: 'SBM', url: 'https://sciencebasedmedicine.org/craniosacral-therapy/' } },
  { name: 'Melatonín (spánok)', cat: 'bio', ev: 'good', note: 'Na poruchy spánku po zlyhaní spánkovej hygieny má dobrú evidenciu.', src: { label: 'Meta 2022', url: 'https://www.sciencedirect.com/science/article/abs/pii/S0278584622001877' } },
  { name: 'Risperidón / aripiprazol', cat: 'bio', ev: 'good', note: 'Jediné FDA-schválené na iritabilitu. Pozor na metabolické účinky.', src: { label: 'Cochrane 2025', url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD014965.pub2/full' } },
  { name: 'Fekálna transplantácia (FMT)', cat: 'bio', ev: 'warn', note: 'Nádejný, ale nekontrolovaný signál (18 detí). Len v rámci štúdie.', src: { label: 'ASU follow-up', url: 'https://pubmed.ncbi.nlm.nih.gov/30967657/' } },
  { name: 'Kmeňové bunky', cat: 'bio', ev: 'crit', note: 'Duke štúdia nesplnila cieľ. Pozor na stem-cell turizmus a vysoké ceny.', src: { label: 'The Transmitter', url: 'https://www.thetransmitter.org/spectrum/u-s-agency-warns-company-marketing-stem-cells-for-autism/' } },
  { name: 'Oxytocín', cat: 'bio', ev: 'crit', note: 'Veľká RCT (SOARS-B, NEJM 2021) — žiadny prínos oproti placebu.', src: { label: 'NEJM 2021', url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa2103583' } },
  { name: 'CBD / kanabidiol', cat: 'bio', ev: 'warn', note: 'Bezpečný, ale len čiastočná účinnosť. Pozor na nekontrolovaný obsah.', src: { label: 'RCT 2025', url: 'https://link.springer.com/article/10.1007/s10803-025-06884-y' } },
  { name: 'Chelácia', cat: 'bio', ev: 'crit', note: 'Autizmus nie je otrava kovmi. Zdokumentované úmrtia detí. FDA varuje.', src: { label: 'FDA', url: 'https://www.fda.gov/drugs/medication-health-fraud/questions-and-answers-unapproved-chelation-products' } },
  { name: 'MMS / oxid chloričitý', cat: 'bio', ev: 'crit', note: 'V podstate priemyselné bielidlo podávané deťom. FDA dôrazne varuje.', src: { label: 'ARI', url: 'https://autism.org/dangerous-miracle-mineral-solution/' } },
  { name: 'GFCF diéta', cat: 'bio', ev: 'crit', note: 'Kontrolované štúdie bez prínosu. Riziko nutričných deficitov.', src: { label: 'Nutrition Reviews', url: 'https://academic.oup.com/nutritionreviews/article/80/5/1237/6382508' } },
  { name: 'Megavitamíny / B6-magnézium', cat: 'bio', ev: 'crit', note: 'Cochrane: nedostatočné dôkazy. Vysoké B6 → neuropatia.', src: { label: 'Cochrane', url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD003497/abstract' } },
];
