import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV } from '../../app.routes';

/** Obal sekcie: cinematic glass pozadie + pill nav + logo. */
@Component({
  selector: 'th-main-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="bg"></div>
    <div class="orb a"></div><div class="orb b"></div><div class="orb c"></div>

    <nav class="glass">
      <a class="logo" routerLink="/"><span class="grad-text">TAMITOS</span><span class="sub">Health</span></a>
      <div class="links">
        @for (item of nav; track item.path) {
          <a [routerLink]="'/' + item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">{{ item.name }}</a>
        }
      </div>
      <a class="pill-btn cta" routerLink="/komunita">Zdieľať skúsenosť →</a>
    </nav>

    <main><ng-content></ng-content></main>

    <footer class="site-foot">
      <div class="th-wrap fgrid">
        <div class="fbrand">
          <a class="logo" routerLink="/"><span class="grad-text">TAMITOS</span><span class="sub">Health</span></a>
          <p class="ftag">Overené informácie o autizme pre slovenské rodiny — novinky zo sveta preložené do
            slovenčiny, adresár centier, terapie s dôkazovou úrovňou a moderovaná komunita na jednom mieste.</p>
          <div class="socials">
            <a href="https://www.instagram.com/tamitosworld/" target="_blank" rel="noopener" aria-label="Instagram">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="https://www.youtube.com/@TamitosWorld" target="_blank" rel="noopener" aria-label="YouTube">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l5-2.8z" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="https://www.tiktok.com/@tamitosworld" target="_blank" rel="noopener" aria-label="TikTok">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><path d="M16.5 3c.3 2 1.6 3.5 3.5 3.8v2.5c-1.3 0-2.6-.4-3.6-1.1v5.9c0 3-2.4 5.4-5.4 5.4S5.6 17.1 5.6 14.1s2.6-5.5 5.7-5.1v2.7c-.4-.1-.7-.2-1-.2-1.4 0-2.5 1.1-2.5 2.6s1.1 2.6 2.5 2.6 2.6-1.1 2.6-2.6V3z"/></svg>
            </a>
            <a href="https://x.com/TamitosWorld" target="_blank" rel="noopener" aria-label="X">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M18.2 2.5h3.3l-7.2 8.2 8.5 11.3h-6.7l-5.2-6.9-6 6.9H1.6l7.7-8.8L1.1 2.5h6.8l4.7 6.3 5.6-6.3zm-1.2 17.8h1.8L7.1 4.3H5.2z"/></svg>
            </a>
          </div>
        </div>

        <div class="fcol">
          <h5>Portál</h5>
          @for (item of nav; track item.path) {
            <a [routerLink]="'/' + item.path">{{ item.name }}</a>
          }
        </div>

        <div class="fcol">
          <h5>TAMITOS svet</h5>
          <a href="https://tamitos.com/sk/postavy-autizmus-pre-deti" target="_blank" rel="noopener">Postavy</a>
          <a href="https://tamitos.com/sk/serial-o-autizme" target="_blank" rel="noopener">Seriál</a>
          <a href="https://tamitos.com/sk/detska-kniha-o-autizme" target="_blank" rel="noopener">Kniha</a>
          <a href="https://tamitos.com/sk/hry-o-autizme-a-emociach" target="_blank" rel="noopener">Hry</a>
          <a href="https://tamitos.com/sk/blog" target="_blank" rel="noopener">Blog</a>
        </div>

        <div class="fcol">
          <h5>Podpora & kontakt</h5>
          <a href="https://tamitos.com/sk/charita" target="_blank" rel="noopener">💛 Podporte nás</a>
          <a href="mailto:business@tamitos.com">business&#64;tamitos.com</a>
          <a href="https://tamitos.com" target="_blank" rel="noopener">tamitos.com →</a>
        </div>
      </div>

      <div class="fbot">
        <span>© 2026 TAMITOS Health · informácie nenahrádzajú lekára</span>
        <span class="fdis">Automatické preklady slúžia na orientáciu; rozhodujúce je originálne znenie.</span>
      </div>
    </footer>
  `,
  styles: [`
    .bg{position:fixed;inset:0;z-index:-2;
      background:
        linear-gradient(180deg, rgba(10,7,16,.68) 0%, rgba(10,7,16,.80) 45%, rgba(9,6,14,.93) 100%),
        url('/assets/hero-bg.webp') center/cover no-repeat,
        #0a0710;}
    .orb{position:fixed;border-radius:50%;filter:blur(80px);opacity:.24;z-index:-1;animation:drift 20s ease-in-out infinite}
    .orb.a{width:420px;height:420px;background:radial-gradient(circle,#ff9d5c,transparent 70%);top:-90px;left:5%}
    .orb.b{width:360px;height:360px;background:radial-gradient(circle,#cbb8ff,transparent 70%);top:6%;right:3%;animation-delay:-7s}
    .orb.c{width:400px;height:400px;background:radial-gradient(circle,#8ccbfd,transparent 70%);bottom:-130px;left:42%;animation-delay:-13s}
    @keyframes drift{0%,100%{transform:translate(0,0)}33%{transform:translate(28px,-22px)}66%{transform:translate(-18px,16px)}}

    nav{position:sticky;top:16px;z-index:40;margin:16px auto 0;max-width:1180px;
      display:flex;align-items:center;gap:18px;padding:10px 12px 10px 22px;border-radius:100px;
      box-shadow:0 8px 40px rgba(0,0,0,.35)}
    .logo{display:flex;align-items:baseline;gap:8px;font-weight:800;font-size:22px;letter-spacing:-.5px}
    .logo .sub{font-size:13px;font-weight:600;color:var(--dim)}
    .links{display:flex;gap:4px;margin-left:6px;flex-wrap:wrap}
    .links a{color:var(--dim);font-weight:500;font-size:14px;padding:8px 13px;border-radius:100px;transition:.2s;cursor:pointer}
    .links a:hover{color:#fff;background:rgba(255,255,255,.07)}
    .links a.active{color:#fff;background:rgba(255,255,255,.1)}
    .cta{margin-left:auto;white-space:nowrap}

    .site-foot{margin-top:70px;border-top:1px solid var(--stroke);
      background:linear-gradient(180deg, rgba(255,255,255,.02), rgba(0,0,0,.25))}
    .fgrid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1.2fr;gap:34px;padding:48px 24px 30px}
    .fbrand .logo{display:inline-flex;align-items:baseline;gap:8px;font-weight:800;font-size:22px;letter-spacing:-.5px}
    .fbrand .sub{font-size:13px;font-weight:600;color:var(--dim)}
    .ftag{color:var(--dim);font-size:13.5px;line-height:1.6;margin:14px 0 16px;max-width:360px}
    .socials{display:flex;gap:10px}
    .socials a{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;color:var(--dim);
      background:var(--glass);border:1px solid var(--stroke);transition:.2s}
    .socials a:hover{color:#fff;border-color:var(--teal);transform:translateY(-2px);box-shadow:0 0 16px -6px var(--teal)}
    .fcol h5{font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:var(--mute);margin:4px 0 12px;font-weight:700}
    .fcol a{display:block;color:var(--dim);font-size:13.5px;padding:5px 0;transition:.15s}
    .fcol a:hover{color:#fff}
    .fbot{max-width:1180px;margin:0 auto;padding:16px 24px 46px;border-top:1px solid var(--stroke);
      display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;color:var(--mute);font-size:12px}
    .fdis{color:var(--mute)}
    @media(max-width:900px){.links{display:none}.fgrid{grid-template-columns:1fr 1fr;gap:26px}}
    @media(max-width:560px){.fgrid{grid-template-columns:1fr}}
  `],
})
export class MainLayoutComponent {
  nav = NAV;
}
