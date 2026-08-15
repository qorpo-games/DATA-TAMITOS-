import { Component } from '@angular/core';
import {
  STRAVA_INTRO, STRAVA_RULE, STRAVA_AGES, STRAVA_SAFETY, STRAVA_PLATE,
  STRAVA_PICKY, STRAVA_CLOSING, STRAVA_SOURCES, STRAVA_UPDATED,
} from '../../data/strava.data';

/** Strava — čo naozaj pomáha a čo je mýtus. Skúsenosť rodičov, nie lekárska rada. */
@Component({
  selector: 'th-strava',
  standalone: true,
  template: `
    <div class="th-wrap page">
      <header class="hero reveal d1">
        <span class="kick"><span class="dot"></span> Skúsenosť rodičov · nie lekárska rada</span>
        <h1>Strava: čo naozaj <span class="grad-text">pomáha</span></h1>
        <p class="lead">Žiadne jedlo autizmus nelieči. Ale pestrý, bezpečný a veku primeraný tanier podporuje
          vývin, trávenie, imunitu a energiu. Tu je, čo sme sa naučili — a čo je mýtus.</p>
      </header>

      <div class="med-disc reveal">🍎 <b>Najprv to hlavné.</b> {{ intro }}
        <span class="rule">{{ rule }}</span></div>

      <section>
        <h2 class="reveal">Podľa veku — toto je kľúčové</h2>
        <div class="ages">
          @for (a of ages; track a.title) {
            <div class="glass agecard reveal">
              <div class="ah"><span class="aic">{{ a.icon }}</span>
                <div><div class="aage">{{ a.age }}</div><h3>{{ a.title }}</h3></div>
              </div>
              @if (a.tag) { <span class="atag">{{ a.tag }}</span> }
              <p>{{ a.text }}</p>
            </div>
          }
        </div>
      </section>

      <section class="reveal">
        <div class="glass safety">
          <h3>⚠️ {{ safety.title }}</h3>
          <ul class="slist">@for (s of safety.items; track s) { <li>{{ s }}</li> }</ul>
        </div>
      </section>

      <section>
        <h2 class="reveal">Čo má na tanieri zmysel</h2>
        <p class="sub reveal">Pre batoľa a väčšie dieťa — ako súčasť normálnej zdravej stravy, nie ako „liek".</p>
        <div class="plate">
          @for (p of plate; track p.title) {
            <div class="glass pcard reveal">
              <span class="pic">{{ p.icon }}</span>
              <h3>{{ p.title }}</h3>
              <p>{{ p.text }}</p>
            </div>
          }
        </div>
      </section>

      <section class="reveal">
        <div class="glass picky">
          <h3>🍽️ {{ picky.title }}</h3>
          <p>{{ picky.text }}</p>
        </div>
      </section>

      <p class="closing reveal">{{ closing }}</p>

      <div class="tsrc">Zdroje: @for (s of sources; track s.url) { <a class="cite" [href]="s.url" target="_blank" rel="noopener">{{ s.label }}</a> }</div>
      <p class="disc">Aktualizované {{ updated }}. Toto je skúsenosť rodičov, <b>nie lekárska rada</b>. Žiadna strava
        autizmus nelieči. Dojčenská výživa má bezpečnostné hranice — pri malých deťoch sa vždy poraď s pediatrom.</p>
    </div>
  `,
  styles: [`
    .page{padding:56px 0 40px}
    .hero{max-width:820px}
    h1{font-weight:800;font-size:clamp(34px,5vw,60px);letter-spacing:-1px;margin:18px 0 0}
    .lead{color:var(--dim);font-size:17px;margin:18px 0 0;max-width:680px}
    .med-disc{margin-top:24px;font-size:13.5px;line-height:1.6;color:var(--dim);
      background:rgba(140,203,253,.08);border:1px solid rgba(140,203,253,.3);border-radius:16px;padding:14px 16px}
    .med-disc .rule{display:block;margin-top:8px;color:var(--mute)}
    section{margin-top:40px}
    section>h2{font-weight:800;font-size:26px;letter-spacing:-.5px;margin-bottom:6px}
    .sub{color:var(--dim);font-size:14.5px;margin-bottom:18px;max-width:640px}
    section>h2+.ages,section>h2+.plate{margin-top:18px}

    .ages{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .agecard{padding:20px 20px}
    .ah{display:flex;gap:12px;align-items:center;margin-bottom:12px}
    .aic{font-size:30px}
    .aage{font-size:12px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.3px}
    .agecard h3{font-weight:800;font-size:18px;margin-top:2px}
    .atag{display:inline-block;font-size:11px;font-weight:700;color:var(--blue);
      background:rgba(140,203,253,.12);border:1px solid rgba(140,203,253,.3);padding:3px 10px;border-radius:100px;margin-bottom:10px}
    .agecard p{font-size:13.5px;color:var(--dim);line-height:1.6}

    .safety{padding:20px 22px;border-color:rgba(255,209,102,.3)}
    .safety h3{font-weight:800;font-size:18px;margin-bottom:10px;color:var(--warn)}
    .slist{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:9px}
    .slist li{font-size:14.5px;color:#fff;line-height:1.55}

    .plate{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .pcard{padding:18px 18px}
    .pic{font-size:30px;display:block;margin-bottom:10px}
    .pcard h3{font-weight:800;font-size:16px;margin-bottom:6px}
    .pcard p{font-size:13px;color:var(--dim);line-height:1.55}

    .picky{padding:20px 24px}
    .picky h3{font-weight:800;font-size:18px;margin-bottom:10px}
    .picky p{font-size:14.5px;color:var(--dim);line-height:1.65}

    .closing{margin-top:34px;font-size:14.5px;color:var(--dim);line-height:1.65;
      border-left:3px solid var(--teal);background:rgba(140,251,218,.06);padding:14px 18px;border-radius:0 14px 14px 0}
    .tsrc{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:26px;font-size:12.5px;color:var(--mute)}
    .disc{font-size:12px;color:var(--mute);border-top:1px solid var(--stroke);margin-top:24px;padding-top:16px;line-height:1.7}

    @media(max-width:900px){.ages{grid-template-columns:1fr}.plate{grid-template-columns:1fr 1fr}}
    @media(max-width:560px){.plate{grid-template-columns:1fr}}
  `],
})
export class StravaComponent {
  intro = STRAVA_INTRO;
  rule = STRAVA_RULE;
  ages = STRAVA_AGES;
  safety = STRAVA_SAFETY;
  plate = STRAVA_PLATE;
  picky = STRAVA_PICKY;
  closing = STRAVA_CLOSING;
  sources = STRAVA_SOURCES;
  updated = STRAVA_UPDATED;
}
