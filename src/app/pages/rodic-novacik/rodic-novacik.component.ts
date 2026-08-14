import { Component, signal } from '@angular/core';
import { BENEFITS, TIMELINE, STEPS, UPDATED } from '../../data/support.data';
import {
  TESTING_GOAL, TESTING_QUESTIONS, TESTING_STEPS, TESTING_AVOID, TESTING_SOURCES, TESTING_UPDATED,
} from '../../data/testing.data';
import {
  ROUTINE_WHY, ROUTINE_CONTAINS, ROUTINE_BUILD, ROUTINE_EXAMPLE, ROUTINE_PRINCIPLES, ROUTINE_SOURCES, ROUTINE_UPDATED,
} from '../../data/routine.data';

/** Rodič autista nováčik — 2 podsekcie: Podpora a dávky + Vyšetrenia a testy. Glass štýl, so zdrojmi. */
@Component({
  selector: 'th-rodic-novacik',
  standalone: true,
  template: `
    <div class="th-wrap page">
      <header class="hero reveal d1">
        <span class="kick"><span class="dot"></span> Sprievodca pre začiatok</span>
        <h1>Rodič autista <span class="grad-text">nováčik</span></h1>
        <p class="lead">Práve ste dostali diagnózu a nevyznáte sa v tom? Vyberte si, čo riešite —
          <b>podporu a dávky</b>, alebo <b>zdravotné vyšetrenia a testy</b>. Pri každej informácii je zdroj.</p>
        <div class="subtabs">
          <button [class.on]="tab()==='podpora'" (click)="tab.set('podpora')">💶 Podpora a dávky</button>
          <button [class.on]="tab()==='testy'" (click)="tab.set('testy')">🩸 Vyšetrenia a testy</button>
          <button [class.on]="tab()==='plan'" (click)="tab.set('plan')">📅 Denný plán a rutina</button>
        </div>
      </header>

      @if (tab()==='podpora') {
        <span class="upd reveal">Dáta aktualizované {{ updated }} · sumy od 1. 7. 2026 · ⚠️ dávky sa valorizujú — pred podaním overte na ÚPSVR</span>

        <section>
          <h2 class="reveal">Peniaze a dávky — koľko reálne dostanete</h2>
          <div class="cards">
            @for (b of benefits; track b.title) {
              <div class="glass card reveal">
                <div class="ch"><span class="ic">{{ b.icon }}</span>
                  <div><h3>{{ b.title }}</h3>@if (b.subtitle){<span class="st">{{ b.subtitle }}</span>}</div>
                </div>
                @if (b.money.length) {
                  <div class="money">
                    @for (m of b.money; track m.label) {
                      <div class="mc"><div class="lbl">{{ m.label }}</div><div class="amt">{{ m.amount }}</div>
                        @if (m.note){<div class="nt">{{ m.note }}</div>}</div>
                    }
                  </div>
                }
                <p class="txt">{{ b.text }}</p>
                @if (b.callout) { <div class="callout">{{ b.callout }}</div> }
                <div class="srcs">@for (s of b.sources; track s.url) {<a class="cite" [href]="s.url" target="_blank" rel="noopener">{{ s.label }}</a>}</div>
              </div>
            }
          </div>
        </section>

        <section>
          <h2 class="reveal">Časová os podľa veku dieťaťa</h2>
          <div class="glass tl reveal">
            @for (t of timeline; track t.age) {
              <div class="tli"><div class="age grad-text">{{ t.age }}</div><div class="what">{{ t.what }}</div></div>
            }
          </div>
        </section>

        <section>
          <h2 class="reveal">Ako požiadať — krok za krokom</h2>
          <div class="steps">
            @for (s of steps; track s.n) {
              <div class="glass step reveal"><div class="num">{{ s.n }}</div>
                <div class="sbody"><span [innerHTML]="s.html"></span>
                  @if (s.source){<a class="cite" [href]="s.source.url" target="_blank" rel="noopener">{{ s.source.label }}</a>}
                </div>
              </div>
            }
          </div>
        </section>

        <p class="disc">Sumy platia od 1. 7. 2026 a valorizujú sa. Konkrétny nárok závisí od individuálneho posudku —
          pred podaním overte na ÚPSVR / MPSVR. Sprievodca je informačný, nenahrádza úradné ani lekárske poradenstvo.</p>
      }

      @else if (tab()==='testy') {
        <div class="med-disc reveal">⚕️ <b>Informačný prehľad, nie lekárska rada.</b> Autizmus sa nediagnostikuje z krvi.
          O testoch a ich poradí rozhoduje pediater / klinický genetik. Väčšina základných testov je hradená
          poisťovňou cez pediatra — netreba začínať drahými samoplatcovskými panelmi.</div>

        <section class="reveal">
          <div class="glass goal">
            <h2>🎯 Hlavný cieľ</h2>
            <p class="glead">{{ goal }}</p>
            <ol class="qs">@for (q of questions; track q) { <li>{{ q }}</li> }</ol>
          </div>
        </section>

        <section>
          <h2 class="reveal">Kompletný postup — krok za krokom</h2>
          <div class="tsteps">
            @for (s of tsteps; track s.n) {
              <div class="glass tstep reveal">
                <div class="tsh">
                  <span class="tnum">{{ s.n }}</span>
                  <span class="tic">{{ s.icon }}</span>
                  <div class="tsttl"><h3>{{ s.title }}</h3><span class="ev {{ s.ev }}">{{ s.evLabel }}</span></div>
                </div>
                <p class="tintro">{{ s.intro }}</p>
                @if (s.groups) {
                  @for (g of s.groups; track g.label) {
                    <div class="tg"><div class="gl">{{ g.label }}</div>
                      <div class="chips">@for (it of g.items; track it) { <span class="chip">{{ it }}</span> }</div>
                    </div>
                  }
                }
                @if (s.note) { <div class="tnote">💡 {{ s.note }}</div> }
              </div>
            }
          </div>
        </section>

        <section class="reveal">
          <div class="glass avoid">
            <h3>⚠️ {{ avoid.title }}</h3>
            <p class="glead">{{ avoid.intro }}</p>
            <div class="chips">@for (it of avoid.items; track it) { <span class="chip bad">{{ it }}</span> }</div>
          </div>
        </section>

        <div class="tsrc">Zdroje: @for (s of tsources; track s.url) { <a class="cite" [href]="s.url" target="_blank" rel="noopener">{{ s.label }}</a> }</div>
        <p class="disc">Aktualizované {{ tupdated }}. Obsah je odborne zladený s odporúčaniami AAP/ACMG, slúži na orientáciu
          a <b>nenahrádza lekárske vyšetrenie</b>. O rozsahu a poradí testov vždy rozhoduje ošetrujúci lekár.</p>
      }

      @else {
        <div class="med-disc reveal">🧩 <b>Prečo rutina?</b> {{ why }}</div>

        <section>
          <h2 class="reveal">Čo by mal denný plán obsahovať</h2>
          <div class="rgrid">
            @for (c of contains; track c.title) {
              <div class="glass rcard reveal">
                <span class="ric">{{ c.icon }}</span>
                <h3>{{ c.title }}</h3>
                <p>{{ c.desc }}</p>
              </div>
            }
          </div>
        </section>

        <section class="reveal">
          <h2 class="reveal">Ukážkový deň — kartičky</h2>
          <p class="rsub">Presne takto to dieťa vidí pred sebou: obrázok = činnosť. Poradie je dôležitejšie než presné minúty.</p>
          <div class="dayflow">
            @for (d of example; track d.time; let last = $last) {
              <div class="dblock reveal">
                <div class="dhead"><span class="dic">{{ d.icon }}</span>
                  <div><div class="dlabel">{{ d.label }}</div><div class="dtime">{{ d.time }}</div></div>
                </div>
                <div class="dcards">
                  @for (it of d.items; track it.text) {
                    <div class="dcard"><span class="dcic">{{ it.icon }}</span><span class="dctx">{{ it.text }}</span></div>
                  }
                </div>
              </div>
              @if (!last) { <div class="darrow">→</div> }
            }
          </div>
        </section>

        <section>
          <h2 class="reveal">Ako postaviť rutinu — krok za krokom</h2>
          <div class="steps">
            @for (b of build; track b.n) {
              <div class="glass step reveal"><div class="num rnum">{{ b.n }}</div>
                <div class="sbody"><b>{{ b.title }}</b><br><span class="rtext">{{ b.text }}</span></div>
              </div>
            }
          </div>
        </section>

        <section class="reveal">
          <div class="glass princ">
            <h3>💡 Zásady, ktoré fungujú</h3>
            <ul class="plist">@for (p of principles; track p) { <li>{{ p }}</li> }</ul>
          </div>
        </section>

        <div class="tsrc">Zdroje: @for (s of rsources; track s.url) { <a class="cite" [href]="s.url" target="_blank" rel="noopener">{{ s.label }}</a> }</div>
        <p class="disc">Aktualizované {{ rupdated }}. Vizuálne podpory a predvídateľná rutina patria medzi overené postupy
          (evidence-based practice, NCAEP/AFIRM). Sprievodca je informačný a orientačný — každé dieťa je iné,
          plán prispôsobte jeho potrebám.</p>
      }
    </div>
  `,
  styles: [`
    .page{padding:56px 0 40px}
    .hero{max-width:820px}
    h1{font-weight:800;font-size:clamp(34px,5vw,60px);letter-spacing:-1px;margin:18px 0 0}
    .lead{color:var(--dim);font-size:17px;margin:18px 0 0;max-width:680px}
    .subtabs{display:flex;gap:10px;margin-top:22px;flex-wrap:wrap}
    .subtabs button{background:var(--glass);border:1px solid var(--stroke);color:var(--dim);font:inherit;
      font-weight:700;font-size:14px;padding:10px 18px;border-radius:100px;cursor:pointer;transition:.2s}
    .subtabs button.on{background:#fff;color:#12091c;border-color:transparent}
    .upd{display:inline-block;margin-top:22px;font-size:12.5px;color:var(--dim);
      background:var(--glass);border:1px solid var(--stroke);padding:8px 14px;border-radius:100px}
    section{margin-top:40px}
    section>h2{font-weight:800;font-size:26px;letter-spacing:-.5px;margin-bottom:18px}
    .cards{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .card{padding:20px}
    .ch{display:flex;gap:12px;align-items:center;margin-bottom:14px}
    .ic{font-size:26px}
    .card h3{font-weight:800;font-size:18px}
    .st{font-size:12.5px;color:var(--dim)}
    .money{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px}
    .mc{flex:1;min-width:150px;background:linear-gradient(135deg,rgba(140,251,218,.1),transparent);
      border:1px solid var(--stroke);border-radius:16px;padding:13px 15px}
    .mc .lbl{font-size:12px;color:var(--dim);font-weight:600}
    .mc .amt{font-size:26px;font-weight:800;letter-spacing:-.5px;margin-top:3px}
    .mc .nt{font-size:11px;color:var(--mute)}
    .txt{font-size:14px;color:var(--dim)}
    .callout{margin-top:12px;font-size:13px;color:var(--dim);border-left:3px solid var(--warn);
      background:var(--warn-soft);padding:11px 14px;border-radius:0 12px 12px 0}
    .srcs{display:flex;gap:6px;flex-wrap:wrap;margin-top:13px}
    .tl{padding:22px 26px}
    .tli{padding:14px 0;border-bottom:1px solid var(--stroke)}
    .tli:last-child{border:none}
    .age{font-weight:800;font-size:16px}
    .what{font-size:14px;color:var(--dim);margin-top:4px}
    .steps{display:flex;flex-direction:column;gap:12px}
    .step{display:flex;gap:14px;padding:16px 18px;align-items:flex-start}
    .num{width:32px;height:32px;border-radius:10px;flex:0 0 auto;display:grid;place-items:center;font-weight:800;
      color:#12091c;background:linear-gradient(135deg,var(--mint),var(--teal))}
    .sbody{font-size:14.5px}

    /* ---- Vyšetrenia a testy ---- */
    .med-disc{margin-top:22px;font-size:13.5px;line-height:1.6;color:var(--dim);
      background:rgba(140,203,253,.08);border:1px solid rgba(140,203,253,.3);border-radius:16px;padding:14px 16px}
    .goal{padding:20px 22px}
    .goal h2{font-weight:800;font-size:20px;margin-bottom:10px}
    .glead{color:var(--dim);font-size:14.5px;line-height:1.6}
    .qs{margin:12px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:8px}
    .qs li{color:#fff;font-size:14px;line-height:1.5}
    .tsteps{display:flex;flex-direction:column;gap:14px}
    .tstep{padding:18px 20px}
    .tsh{display:flex;align-items:center;gap:12px;margin-bottom:10px}
    .tnum{width:30px;height:30px;border-radius:9px;flex:0 0 auto;display:grid;place-items:center;font-weight:800;
      color:#12091c;background:linear-gradient(135deg,var(--teal),var(--blue))}
    .tic{font-size:22px}
    .tsttl{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .tsttl h3{font-weight:800;font-size:17px}
    .ev{font-weight:700;font-size:11px;padding:3px 10px;border-radius:100px;border:1px solid transparent;white-space:nowrap}
    .ev.good{background:var(--good-soft);color:var(--good);border-color:rgba(63,224,138,.3)}
    .ev.info{background:rgba(140,203,253,.12);color:var(--blue);border-color:rgba(140,203,253,.3)}
    .ev.warn{background:var(--warn-soft);color:var(--warn);border-color:rgba(255,209,102,.3)}
    .tintro{font-size:14px;color:var(--dim);line-height:1.6;margin-bottom:12px}
    .tg{margin-top:10px}
    .gl{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--mute);margin-bottom:7px}
    .chips{display:flex;flex-wrap:wrap;gap:7px}
    .chip{font-size:12.5px;color:var(--dim);background:rgba(255,255,255,.05);border:1px solid var(--stroke);
      padding:5px 11px;border-radius:100px}
    .chip.bad{color:#ffb3bd;background:rgba(255,122,138,.08);border-color:rgba(255,122,138,.3)}
    .tnote{margin-top:12px;font-size:13px;color:var(--dim);border-left:3px solid var(--teal);
      background:rgba(140,251,218,.08);padding:11px 14px;border-radius:0 12px 12px 0}
    .avoid{padding:20px 22px;border-color:rgba(255,122,138,.28)}
    .avoid h3{font-weight:800;font-size:18px;margin-bottom:8px;color:#ff9aa6}
    .tsrc{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:26px;font-size:12.5px;color:var(--mute)}

    /* ---- Denný plán a rutina ---- */
    .rsub{color:var(--dim);font-size:14.5px;margin:-8px 0 18px;max-width:640px;line-height:1.6}
    .rgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
    .rcard{padding:18px 16px;text-align:center}
    .ric{font-size:32px;display:block;margin-bottom:10px}
    .rcard h3{font-weight:800;font-size:15px;margin-bottom:6px}
    .rcard p{font-size:12.5px;color:var(--dim);line-height:1.5}
    .dayflow{display:flex;align-items:stretch;gap:10px;overflow-x:auto;padding:4px 2px 12px}
    .dblock{flex:0 0 auto;min-width:190px;background:var(--glass);border:1px solid var(--stroke);
      border-radius:20px;padding:16px 15px}
    .dhead{display:flex;gap:11px;align-items:center;margin-bottom:13px}
    .dic{font-size:26px}
    .dlabel{font-weight:800;font-size:16px;letter-spacing:-.3px}
    .dtime{font-size:12px;color:var(--mute);font-weight:600}
    .dcards{display:flex;flex-direction:column;gap:8px}
    .dcard{display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(140,251,218,.09),rgba(140,203,253,.06));
      border:1px solid var(--stroke);border-radius:14px;padding:10px 12px}
    .dcic{font-size:20px}
    .dctx{font-size:13.5px;font-weight:600}
    .darrow{align-self:center;color:var(--mute);font-size:22px;flex:0 0 auto}
    .rnum{background:linear-gradient(135deg,var(--blue),#b98cfd)}
    .rtext{font-size:14px;color:var(--dim);line-height:1.55}
    .princ{padding:20px 24px}
    .princ h3{font-weight:800;font-size:18px;margin-bottom:12px}
    .plist{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:9px}
    .plist li{font-size:14.5px;color:var(--dim);line-height:1.55}

    .disc{font-size:12px;color:var(--mute);border-top:1px solid var(--stroke);margin-top:40px;padding-top:16px;line-height:1.7}
    @media(max-width:980px){.rgrid{grid-template-columns:1fr 1fr}}
    @media(max-width:820px){.cards{grid-template-columns:1fr}}
    @media(max-width:560px){.rgrid{grid-template-columns:1fr 1fr}}
  `],
})
export class RodicNovacikComponent {
  tab = signal<'podpora' | 'testy' | 'plan'>('podpora');

  benefits = BENEFITS;
  timeline = TIMELINE;
  steps = STEPS;
  updated = UPDATED;

  goal = TESTING_GOAL;
  questions = TESTING_QUESTIONS;
  tsteps = TESTING_STEPS;
  avoid = TESTING_AVOID;
  tsources = TESTING_SOURCES;
  tupdated = TESTING_UPDATED;

  why = ROUTINE_WHY;
  contains = ROUTINE_CONTAINS;
  build = ROUTINE_BUILD;
  example = ROUTINE_EXAMPLE;
  principles = ROUTINE_PRINCIPLES;
  rsources = ROUTINE_SOURCES;
  rupdated = ROUTINE_UPDATED;
}
