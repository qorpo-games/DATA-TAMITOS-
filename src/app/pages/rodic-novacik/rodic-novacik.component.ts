import { Component } from '@angular/core';
import { BENEFITS, TIMELINE, STEPS, UPDATED } from '../../data/support.data';

/** Rodič autista nováčik — sprievodca SK podporou, glass štýl, so zdrojmi. */
@Component({
  selector: 'th-rodic-novacik',
  standalone: true,
  template: `
    <div class="th-wrap page">
      <header class="hero reveal d1">
        <span class="kick"><span class="dot"></span> Sprievodca pre začiatok</span>
        <h1>Rodič autista <span class="grad-text">nováčik</span></h1>
        <p class="lead">Práve ste dostali diagnózu a nevyznáte sa v tom? Krok za krokom: kedy diagnostika,
          na aké dávky máte nárok, v akom veku a koľko peňazí to reálne je. Pri každej informácii je zdroj.</p>
        <span class="upd">Dáta aktualizované {{ updated }} · sumy od 1. 7. 2026 · ⚠️ dávky sa valorizujú — pred podaním overte na ÚPSVR</span>
      </header>

      <!-- PENIAZE -->
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

      <!-- CASOVA OS -->
      <section>
        <h2 class="reveal">Časová os podľa veku dieťaťa</h2>
        <div class="glass tl reveal">
          @for (t of timeline; track t.age) {
            <div class="tli"><div class="age grad-text">{{ t.age }}</div><div class="what">{{ t.what }}</div></div>
          }
        </div>
      </section>

      <!-- KROKY -->
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
    </div>
  `,
  styles: [`
    .page{padding:56px 0 40px}
    .hero{max-width:760px}
    h1{font-weight:800;font-size:clamp(34px,5vw,60px);letter-spacing:-1px;margin:18px 0 0}
    .lead{color:var(--dim);font-size:17px;margin:18px 0 0;max-width:640px}
    .upd{display:inline-block;margin-top:18px;font-size:12.5px;color:var(--dim);
      background:var(--glass);border:1px solid var(--stroke);padding:8px 14px;border-radius:100px}
    section{margin-top:48px}
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
    .disc{font-size:12px;color:var(--mute);border-top:1px solid var(--stroke);margin-top:40px;padding-top:16px;line-height:1.7}
    @media(max-width:820px){.cards{grid-template-columns:1fr}}
  `],
})
export class RodicNovacikComponent {
  benefits = BENEFITS;
  timeline = TIMELINE;
  steps = STEPS;
  updated = UPDATED;
}
