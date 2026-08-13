import { Source } from '../models/models';

export interface MoneyCard {
  label: string;
  amount: string;
  note?: string;
}
export interface Benefit {
  icon: string;
  title: string;
  subtitle?: string;
  money: MoneyCard[];
  text: string;
  sources: Source[];
  callout?: string;
}
export interface TimelineItem {
  age: string;
  what: string;
}
export interface Step {
  n: number;
  html: string;
  source?: Source;
}

/** Obsah stránky „Rodič autista nováčik" — SK štátna podpora. Zdroje pri každom údaji. */
export const UPDATED = '13. 8. 2026';

export const BENEFITS: Benefit[] = [
  {
    icon: '💶',
    title: 'Príspevok na opatrovanie',
    subtitle: 'hlavný príspevok pre rodiča',
    money: [
      { label: 'Opatrovanie 1 dieťaťa s ŤZP', amount: '~929 €', note: '729 € základ + 200 € príplatok' },
      { label: 'Opatrovanie 2+ osôb s ŤZP', amount: '969 €', note: 'základná sadzba' },
    ],
    text: 'Príjem opatrovanej osoby už príspevok nekráti (zrušené od dec. 2024). Rodič môže popri opatrovaní pracovať, ak príjem neprekročí 2,5-násobok životného minima.',
    sources: [
      { label: 'Belasý motýľ', url: 'https://belasymotyl.sk/2026/06/29/zivotne-minimum-a-penazne-prispevky-od-1-jula-2026/' },
      { label: 'MPSVR', url: 'https://www.employment.gov.sk/sk/rodina-socialna-pomoc/tazke-zdravotne-postihnutie/penazne-prispevky/' },
    ],
    callout: 'Ak dieťa navštevuje školské zariadenie vo väčšom rozsahu, výška sa môže znížiť — overte na ÚPSVR.',
  },
  {
    icon: '🧑‍🤝‍🧑',
    title: 'Príspevok na osobnú asistenciu',
    money: [
      { label: 'Hodinová sadzba', amount: '6,81 €', note: 'od 1. 7. 2026' },
      { label: 'Nárok od veku', amount: '6 r.', note: 'do 6 r. sa rieši opatrovaním' },
      { label: 'Max. rozsah', amount: '7 300 h', note: 'ročne, max 20 h/deň' },
    ],
    text: 'Príjem rodiny tento príspevok nekráti. Rodič nemôže byť osobným asistentom vlastnému dieťaťu vo veku 6–18 rokov (len opatrovateľom). Opatrovanie a asistencia sa za to isté obdobie vylučujú.',
    sources: [
      { label: 'MPSVR', url: 'https://www.employment.gov.sk/sk/rodina-socialna-pomoc/tazke-zdravotne-postihnutie/penazne-prispevky/pp-osobnu-asistenciu/' },
      { label: 'ÚNSS', url: 'https://unss.sk/penazny-prispevok-na-osobnu-asistenciu/' },
    ],
  },
  {
    icon: '📅',
    title: 'Rodičovský príspevok (2026)',
    money: [
      { label: 'Bez materského', amount: '364,80 €' },
      { label: 'S materským', amount: '500,10 €' },
    ],
    text: 'Štandardne do 3 rokov dieťaťa, ale predlžuje sa do 6 rokov, ak má dieťa dlhodobo nepriaznivý zdravotný stav — čo autizmus spĺňa. Výška ostáva rovnaká.',
    sources: [
      { label: 'MPSVR', url: 'https://www.employment.gov.sk/sk/rodina-socialna-pomoc/podpora-rodinam-detmi/penazna-pomoc/rodicovsky-prispevok/' },
    ],
  },
  {
    icon: '➕',
    title: 'Kompenzácia zvýšených výdavkov (mesačne)',
    money: [],
    text: 'Hygiena / opotrebovanie šatstva: 27,40 € · prevádzka vozidla: 49,31 € · individuálna doprava: až 150,63 € · diétne stravovanie (pri pridruženej diagnóze): 16,45–54,80 €. Nárok závisí od typu odkázanosti z komplexného posudku a od príjmu.',
    sources: [
      { label: 'Belasý motýľ', url: 'https://belasymotyl.sk/2026/06/29/zivotne-minimum-a-penazne-prispevky-od-1-jula-2026/' },
    ],
  },
];

export const TIMELINE: TimelineItem[] = [
  { age: '0 – 3 roky', what: 'Rodičovský príspevok (364,80 / 500,10 €). Po diagnóze hneď žiadať preukaz ŤZP a príspevok na opatrovanie (~929 €). Skríning M-CHAT v 16. a 24. mesiaci.' },
  { age: '3 – 6 rokov', what: 'Rodičovský príspevok predlžený do 6 rokov (dlhodobo nepriaznivý stav). Naďalej opatrovanie + ŤZP-S. Riešiť škôlku / predprimárne vzdelávanie.' },
  { age: 'od 6 rokov', what: 'Vzniká nárok na osobnú asistenciu (6,81 €/h). Nástup do školy → nárok na pedagogického asistenta a individuálny vzdelávací program.' },
  { age: '18 rokov', what: 'Dieťa sa stáva dospelou osobou s ŤZP; rodič môže byť aj jeho osobným asistentom; menia sa niektoré podmienky (napr. invalidný dôchodok).' },
];

export const STEPS: Step[] = [
  { n: 1, html: '<b>Diagnóza:</b> získať písomnú správu od detského psychiatra / klinického psychológa.' },
  { n: 2, html: '<b>Na ÚPSVR podať:</b> Žiadosť o preukaz ŤZP + Žiadosť o peňažný príspevok na kompenzáciu + lekársky nález (nie starší ako 6 mes.) + rodný list dieťaťa.', source: { label: 'vzory tlačív ÚPSVR', url: 'https://www.upsvr.gov.sk/vzory-ziadosti-v-slovenskom-jazyku-a-inych-jazykoch/vzory-ziadosti-pre-oblast-socialnych-veci-a-rodiny.html' } },
  { n: 3, html: '<b>Posudok:</b> ÚPSVR vykoná lekársku + sociálnu posudkovú činnosť → komplexný posudok → rozhodnutie (spravidla do 60 dní).' },
  { n: 4, html: '<b>Rodičovský príspevok:</b> Žiadosť na ÚPSVR; pri predlžení do 6 r. doložiť potvrdenie o dlhodobo nepriaznivom stave.' },
  { n: 5, html: '<b>Škola:</b> cez CPP/ŠCPP získať odporúčanie asistenta a IVP; odovzdať riaditeľovi školy/škôlky.' },
];

export const DIAG_SOURCE: Source = { label: 'Solen / Pediatria pre prax', url: 'https://www.solen.sk/storage/file/article/PED_2_2018_final_Hnilicova.pdf' };
export const ACVA_SOURCE: Source = { label: 'ACVA', url: 'https://acva.sk/en/diagnostika-2/' };
