import { Component } from '@angular/core';

/** Source context; administrative counts and population estimates stay separate. */
@Component({
  selector: 'th-data', standalone: true,
  template: `
    <main class="th-wrap page">
      <header><span class="kick">Dáta a zdroje</span><h1>Čísla s jasným pôvodom</h1>
        <p class="lead">Rok, vek, miesto a definícia rozhodujú o význame čísla. Tieto ukazovatele nie sú navzájom zameniteľné.</p></header>
      <section class="facts" aria-label="Medzinárodné zdroje">
        <article class="glass"><h2>WHO: približne 1 zo 127</h2><p>Celosvetová populácia, všetky veky. Odhad za rok 2021; zdroj vydaný 17. 9. 2025.</p>
          <a href="https://www.who.int/news-room/fact-sheets/detail/autism-spectrum-disorders" target="_blank" rel="noopener">Pôvodný zdroj WHO</a></article>
        <article class="glass"><h2>CDC: približne 1 z 31</h2><p>32,2 na 1000 osemročných detí v 16 sledovaných lokalitách ADDM v USA za rok 2022. Správa vyšla 17. 4. 2025.</p>
          <a href="https://www.cdc.gov/mmwr/volumes/74/ss/ss7402a1.htm" target="_blank" rel="noopener">Správa CDC a metodika</a></article>
      </section>
      <section class="glass"><h2>Slovensko: administratívne údaje</h2>
        <p>Kompasio / Modrá hliadka publikuje za rok 2025 súčet 35 029 poistencov s históriou vykázaných diagnóz F84.x z VšZP, Dôvery a Union. Ide o údaj prevzatý zo zverejneného dashboardu; pôvodné poisťovňové súbory sme nezávisle neoverili.</p>
        <p>Deduplikácia platí v rámci poisťovne. Prípadné duplicity pri prestupe medzi poisťovňami nemožno z týchto agregátov odstrániť. Kombinácia veku a kraja v pôvodnom dashboarde je modelový odhad, nie dodaná spoločná tabuľka.</p>
        <p><a href="https://data.kompasio.sk/" target="_blank" rel="noopener">Pôvodný dashboard</a> ·
          <a href="https://github.com/Modra-hliadka/data-o-autizme/blob/498eb38e53a342132005cc5d79fd2f5bb61973c9/README.md" target="_blank" rel="noopener">Metodika a limity</a></p>
        <p>Overený slovenský číselný agregát zatiaľ nie je priamo napojený. Ilustračné grafy ani vymyslený priemerný vek diagnózy nezobrazujeme. NCZI opisuje zdravotnú starostlivosť; školské výkazy používajú iné definície a obdobia. Tieto údaje nepredstavujú spoločnú prevalenčnú sériu.</p>
        <a href="https://www.nczisk.sk/Aktuality/Pages/Psychiatricka-starostlivost-v-Slovenskej-republike-v-roku-2024.aspx" target="_blank" rel="noopener">NCZI: psychiatrická starostlivosť 2024</a>
      </section>
      <section class="glass"><h2>Adresár a štúdie</h2><p>Centrá načítavame z CVTI CPP/ŠCPP. Zaradenie nepreukazuje voľnú kapacitu ani poskytovanie konkrétnej diagnostiky; službu a kontakt treba overiť u poskytovateľa.</p>
        <a href="https://www.cvtisr.sk/informacie-o-skolstve/vyskumy-a-prevencia/zariadenia-poradenstva-a-prevencie/" target="_blank" rel="noopener">Oficiálny zdroj CVTI</a>
        <p>ClinicalTrials.gov obsahuje registračné záznamy štúdií. Dokončenie štúdie samo nepotvrdzuje účinnosť. Počet načítaných záznamov TAMITOS nie je celkový počet výskumov autizmu.</p>
        <a href="https://clinicaltrials.gov/" target="_blank" rel="noopener">ClinicalTrials.gov</a>
        <p>Načítanie, aktualizácia pôvodného zdroja a redakčné overenie sú rozdielne dátumy. Chýbajúcu hodnotu nepovažujeme za nulu.</p></section>
      <p class="disc">Zdroje a odkazy skontrolované 2. 11. 2026. Informácie nenahrádzajú individuálne vyšetrenie.</p>
    </main>`,
  styles: [`.page{padding:40px 22px 70px}.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}.glass{padding:24px;margin:20px 0}.disc{color:var(--dim)}a{color:var(--teal)}`]
})
export class DataComponent {}
