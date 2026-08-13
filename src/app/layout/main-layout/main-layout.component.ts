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
          <a [routerLink]="'/' + item.path" routerLinkActive="active">{{ item.name }}</a>
        }
      </div>
      <button class="pill-btn cta">Začať →</button>
    </nav>

    <main><ng-content></ng-content></main>
    <footer class="th-wrap">TAMITOS Health · informácie nenahrádzajú lekára · © 2026</footer>
  `,
  styles: [`
    .bg{position:fixed;inset:0;z-index:-2;background:
      radial-gradient(60% 50% at 20% 12%, rgba(255,160,90,.26), transparent 60%),
      radial-gradient(55% 45% at 85% 18%, rgba(203,184,255,.20), transparent 60%),
      radial-gradient(60% 60% at 70% 92%, rgba(140,203,253,.16), transparent 60%),
      radial-gradient(50% 50% at 25% 88%, rgba(255,155,199,.16), transparent 60%),
      linear-gradient(160deg,#120a1c 0%,#0a0710 55%,#0c0913 100%);}
    .orb{position:fixed;border-radius:50%;filter:blur(70px);opacity:.45;z-index:-1;animation:drift 20s ease-in-out infinite}
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
    .cta{margin-left:auto}
    footer{color:var(--mute);font-size:13px;text-align:center;padding:60px 24px 50px}
    @media(max-width:900px){.links{display:none}}
  `],
})
export class MainLayoutComponent {
  nav = NAV;
}
