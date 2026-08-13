import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV } from '../../app.routes';

/** Obal sekcie: horná navigácia + prepínač témy (deň/noc). */
@Component({
  selector: 'th-main-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="top">
      <div class="topin">
        <a class="logo" routerLink="/">
          <div class="mark">T</div>
          <b>TAMITOS <span class="dim">Health</span></b>
        </a>
        <nav class="nav">
          @for (item of nav; track item.path) {
            <a [routerLink]="'/' + item.path" routerLinkActive="active">{{ item.name }}</a>
          }
        </nav>
        <button class="theme" (click)="toggleTheme()" [attr.aria-label]="'Prepnúť tému'">
          {{ dark() ? '☀' : '🌙' }}
        </button>
      </div>
    </header>
    <main><ng-content></ng-content></main>
  `,
  styles: [
    `
      .top {
        position: sticky;
        top: 0;
        z-index: 30;
        background: color-mix(in srgb, var(--bg) 85%, transparent);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border);
      }
      .topin {
        max-width: 1180px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 22px;
      }
      .logo {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--text);
      }
      .logo .mark {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--brand), var(--brand-2));
        display: grid;
        place-items: center;
        font-weight: 800;
        color: #04201d;
        font-size: 19px;
      }
      .logo b {
        font-size: 19px;
        letter-spacing: -0.4px;
      }
      .dim {
        color: var(--text-dim);
        font-weight: 600;
      }
      .nav {
        display: flex;
        gap: 4px;
        margin-left: 8px;
        flex-wrap: wrap;
      }
      .nav a {
        padding: 8px 13px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-dim);
        cursor: pointer;
      }
      .nav a.active {
        color: var(--text);
        background: var(--brand-soft);
      }
      .theme {
        margin-left: auto;
        cursor: pointer;
        color: var(--text-dim);
        font-size: 20px;
        padding: 6px 10px;
        border-radius: 999px;
        background: none;
        border: none;
      }
      @media (max-width: 720px) {
        .nav {
          display: none;
        }
      }
    `,
  ],
})
export class MainLayoutComponent {
  nav = NAV;
  dark = signal(true);

  toggleTheme(): void {
    this.dark.update((v) => !v);
    document.documentElement.setAttribute('data-theme', this.dark() ? 'dark' : 'light');
  }
}
