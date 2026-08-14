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

      <p class="disc">Zdroj: NCZI (Národné centrum zdravotníckych informácií), verejné agregáty. Čísla sú informatívne.</p>
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
    @media(max-width:820px){.charts{grid-template-columns:1fr}}
  `],
})
export class DataComponent {
  prevSrc = PREVALENCE_SOURCE;
  prevYear = PREVALENCE_YEAR;

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
