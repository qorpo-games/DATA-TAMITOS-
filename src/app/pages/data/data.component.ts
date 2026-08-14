import { Component } from '@angular/core';
import { CanvasJSAngularChartsModule } from '@canvasjs/angular-charts';
import { byYear, byAge, byRegion, PREVALENCE_SOURCE, PREVALENCE_YEAR } from '../../data/prevalence.data';

/** Dáta — prevalenčný dashboard autizmu na Slovensku (CanvasJS). Vlastná stránka. */
@Component({
  selector: 'th-data',
  standalone: true,
  imports: [CanvasJSAngularChartsModule],
  template: `
    <div class="th-wrap page">
      <header class="reveal d1">
        <span class="kick"><span class="dot"></span> Čísla, nie dojmy</span>
        <h1>Autizmus na Slovensku <span class="grad-text">v číslach</span></h1>
        <p class="lead">Evidované diagnózy F84.x. Verejný agregát —
          <a [href]="prevSrc.url" target="_blank" rel="noopener">{{ prevSrc.label }}</a>, rok {{ prevYear }}.
          <b>Ukážkové čísla</b>, pri napojení sa naplnia z NCZI.</p>
      </header>

      <div class="stats reveal d2">
        <div class="glass stat"><div class="v grad-text">9 400</div><div class="k">evidovaných (2023)</div></div>
        <div class="glass stat"><div class="v grad-text">~1:100</div><div class="k">prevalencia</div></div>
        <div class="glass stat"><div class="v grad-text">10–14</div><div class="k">najväčšia veková skupina (r.)</div></div>
        <div class="glass stat"><div class="v" style="color:var(--warn)">4,5</div><div class="k">priemerný vek diagnózy (cieľ &lt;3)</div></div>
      </div>

      <div class="charts">
        <div class="glass panel wide reveal"><h4>Vývoj podľa roku</h4><canvasjs-chart [options]="yearChart" [styles]="{width:'100%',height:'240px'}"></canvasjs-chart></div>
        <div class="glass panel reveal"><h4>Podľa kraja</h4><canvasjs-chart [options]="regionChart" [styles]="{width:'100%',height:'260px'}"></canvasjs-chart></div>
        <div class="glass panel reveal"><h4>Podľa veku</h4><canvasjs-chart [options]="ageChart" [styles]="{width:'100%',height:'260px'}"></canvasjs-chart></div>
      </div>

      <p class="disc">Čísla v grafoch sú <b>ilustračné</b>, kým ich napojíme priamo na tabuľkové výstupy NCZI
        (diagnostická skupina F84 — pervazívne vývinové poruchy). Nižšie sú oficiálne zdroje, z ktorých čerpáme.</p>

      <section class="srcsec reveal">
        <h2>📚 Zdroje a metodika</h2>
        <div class="sgrid">
          <div class="glass sgroup">
            <h4>🇸🇰 Slovensko — NCZI</h4>
            @for (s of skSources; track s.url) {
              <a class="slink" [href]="s.url" target="_blank" rel="noopener">{{ s.label }} <span>→</span></a>
            }
          </div>
          <div class="glass sgroup">
            <h4>🌍 Svet</h4>
            @for (s of worldSources; track s.url) {
              <a class="slink" [href]="s.url" target="_blank" rel="noopener">{{ s.label }} <span>→</span></a>
            }
          </div>
        </div>
        <p class="disc">Metodika: prevalencia = evidované diagnózy F84.x v danom roku podľa NCZI. Medzinárodné čísla (CDC/WHO/NIMH)
          slúžia na porovnanie — definície a spôsob zberu sa medzi krajinami líšia, preto ich neuvádzame ako priamo porovnateľné.</p>
      </section>
    </div>
  `,
  styles: [`
    .page{padding:56px 0 60px}
    h1{font-weight:800;font-size:clamp(32px,4.6vw,52px);letter-spacing:-1px;margin:16px 0 0}
    .lead{color:var(--dim);font-size:16px;margin:16px 0 0;max-width:680px}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:26px 0 16px}
    .stat{padding:18px 20px}
    .stat .v{font-size:32px;font-weight:800;letter-spacing:-.6px}
    .stat .k{font-size:12px;color:var(--dim);margin-top:2px}
    .charts{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .panel{padding:16px 18px}.panel.wide{grid-column:1/-1}
    .panel h4{font-size:14.5px;margin-bottom:10px}
    .disc{font-size:12.5px;color:var(--mute);margin-top:22px}
    .srcsec{margin-top:34px}
    .srcsec h2{font-size:22px;font-weight:800;margin-bottom:14px}
    .sgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .sgroup{padding:16px 18px}
    .sgroup h4{font-size:14px;margin-bottom:10px}
    .slink{display:flex;justify-content:space-between;gap:10px;align-items:center;color:var(--dim);
      font-size:13.5px;padding:9px 0;border-bottom:1px solid var(--stroke);text-decoration:none}
    .sgroup .slink:last-child{border-bottom:none}
    .slink:hover{color:#fff}.slink span{color:var(--teal)}
    @media(max-width:820px){.charts{grid-template-columns:1fr}.sgrid{grid-template-columns:1fr}}
  `],
})
export class DataComponent {
  prevSrc = PREVALENCE_SOURCE;
  prevYear = PREVALENCE_YEAR;

  skSources = [
    { label: 'NCZI — Psychiatrická starostlivosť v SR 2024', url: 'https://www.nczisk.sk/Aktuality/Pages/Psychiatricka-starostlivost-v-Slovenskej-republike-v-roku-2024.aspx' },
    { label: 'NCZI — Psychiatrická starostlivosť v SR 2023', url: 'https://www.nczisk.sk/aktuality/pages/Psychiatricka-starostlivost-v-Slovenskej-republike-v-roku-2023.aspx' },
    { label: 'NCZI — Tematické štatistické výstupy (tabuľky F84)', url: 'https://www.nczisk.sk/Statisticke_vystupy/Tematicke_statisticke_vystupy/Psychiatricka_starostlivost/Pages/default.aspx' },
  ];
  worldSources = [
    { label: 'CDC — Data & Statistics on Autism (ADDM)', url: 'https://www.cdc.gov/autism/data-research/index.html' },
    { label: 'CDC — Autism prevalence data table', url: 'https://www.cdc.gov/autism/data-research/data-table.html' },
    { label: 'NIMH — Autism Spectrum Disorder statistics', url: 'https://www.nimh.nih.gov/health/statistics/autism-spectrum-disorder-asd' },
    { label: 'WHO — Autism (fact sheet)', url: 'https://www.who.int/news-room/fact-sheets/detail/autism-spectrum-disorders' },
  ];

  private base = {
    animationEnabled: true,
    backgroundColor: 'transparent',
    axisX: { labelFontColor: '#8b98a9', lineColor: 'rgba(255,255,255,.16)', tickColor: 'transparent' },
    axisY: { labelFontColor: '#8b98a9', gridColor: 'rgba(255,255,255,.08)', lineColor: 'transparent', tickColor: 'transparent' },
  };
  yearChart = { ...this.base, data: [{ type: 'column', color: '#8cfbda', dataPoints: byYear.map((p) => ({ label: p.label, y: p.value })) }] };
  regionChart = { ...this.base, data: [{ type: 'bar', color: '#cbb8ff', dataPoints: byRegion.map((p) => ({ label: p.label, y: p.value })) }] };
  ageChart = { ...this.base, data: [{ type: 'bar', color: '#8ccbfd', dataPoints: byAge.map((p) => ({ label: p.label, y: p.value })) }] };
}
