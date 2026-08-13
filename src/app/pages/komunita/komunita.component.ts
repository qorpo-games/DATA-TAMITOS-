import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommunityService, CommunityPost } from '../../core/community.service';

/**
 * Komunita — moderované zdieľanie skúseností (nie chat). Glass štýl.
 * Klientská anti-spam ochrana: honeypot, time-trap (loadedAt), 10 s cooldown.
 * Server dorába captcha overenie + rate limit + moderáciu (community_lambda.py).
 */
@Component({
  selector: 'th-komunita',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <header class="head">
        <h1>Komunita</h1>
        <p>Podeľte sa, čo vám pomohlo. Tipy, skúsenosti, postupy — od rodiča k rodičovi.
          Príspevky prechádzajú krátkou kontrolou, aby tu nešírili nebezpečné „zázraky".</p>
      </header>

      <!-- FORMULÁR -->
      <form class="glass composer" (ngSubmit)="submit()" #f="ngForm" autocomplete="off">
        <div class="row">
          <input class="inp" name="nick" [(ngModel)]="nick" placeholder="Prezývka (nepovinné)" maxlength="40" />
          <select class="inp" name="category" [(ngModel)]="category">
            <option value="tip">💡 Tip / čo pomohlo</option>
            <option value="skúsenosť">📖 Skúsenosť</option>
            <option value="otázka">❓ Otázka</option>
          </select>
          <select class="inp" name="childAge" [(ngModel)]="childAge">
            <option value="">Vek dieťaťa…</option>
            <option>0–3</option><option>3–6</option><option>6–12</option><option>12+</option>
          </select>
        </div>
        <textarea class="inp ta" name="text" [(ngModel)]="text" (ngModelChange)="onType()"
          placeholder="Napíšte, čo vám v praxi zabralo…" maxlength="1200"></textarea>

        <!-- honeypot: skryté pole, ľudia ho nevyplnia, boti áno -->
        <input class="hp" name="website" [(ngModel)]="website" tabindex="-1" autocomplete="off" aria-hidden="true" />

        <div class="foot">
          <span class="count" [class.warn]="text.length < 15">{{ text.length }}/1200</span>
          <!-- Cloudflare Turnstile widget sa vloží sem (data-sitekey) -->
          <div class="cf-turnstile" data-sitekey="TURNSTILE_SITEKEY"></div>
          <button class="post" type="submit" [disabled]="!canPost()">
            {{ cooldown() > 0 ? 'Počkajte ' + cooldown() + ' s' : 'Uverejniť' }}
          </button>
        </div>
        @if (msg()) { <div class="msg" [class.err]="isErr()">{{ msg() }}</div> }
      </form>

      <!-- FEED -->
      <div class="feed">
        @for (p of posts(); track p.created) {
          <article class="glass card">
            <div class="ch">
              <div class="av">{{ p.nick.charAt(0).toUpperCase() }}</div>
              <div><b>{{ p.nick }}</b>
                <span class="meta">· {{ p.category }}{{ p.childAge ? ' · dieťa ' + p.childAge : '' }}</span>
              </div>
              <span class="badge">💬 komunita</span>
            </div>
            <p class="txt">{{ p.text }}</p>
          </article>
        } @empty {
          <div class="empty">Zatiaľ žiadne schválené príspevky — buďte prvý. 🌱</div>
        }
      </div>
      <p class="disc">Príspevky sú osobné skúsenosti, nie lekárske rady. Pri zmenách liečby sa vždy poraďte s lekárom.</p>
    </div>
  `,
  styles: [`
    .wrap{max-width:760px;margin:0 auto;padding:40px 22px 70px}
    .head h1{font-weight:800;font-size:34px;letter-spacing:-.6px}
    .head p{color:var(--dim,#8b98a9);margin-top:8px;font-size:15px;max-width:600px}
    .glass{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);
      backdrop-filter:blur(18px);border-radius:24px}
    .composer{padding:16px;margin:24px 0}
    .row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}
    .inp{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);color:#fff;
      border-radius:12px;padding:11px 14px;font:inherit;font-size:14px;outline:none}
    .inp:focus{border-color:#8cfbda}
    .row .inp{flex:1;min-width:130px}
    .ta{width:100%;min-height:96px;resize:vertical}
    .hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
    .foot{display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap}
    .count{font-size:12px;color:var(--dim,#8b98a9)} .count.warn{color:#ffd166}
    .cf-turnstile{margin-left:auto}
    .post{background:#fff;color:#12091c;font-weight:700;border:none;border-radius:100px;
      padding:11px 22px;cursor:pointer;font-size:14px}
    .post:disabled{opacity:.5;cursor:not-allowed}
    .msg{margin-top:12px;font-size:13.5px;color:#8cfbda}
    .msg.err{color:#ff7a8a}
    .feed{display:flex;flex-direction:column;gap:12px;margin-top:8px}
    .card{padding:16px 18px}
    .ch{display:flex;align-items:center;gap:11px;margin-bottom:9px}
    .av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:800;color:#12091c;
      background:linear-gradient(135deg,#cbb8ff,#8ccbfd)}
    .meta{color:var(--dim,#8b98a9);font-weight:400;font-size:13px}
    .badge{margin-left:auto;font-size:11px;font-weight:700;color:#8cfbda;
      background:rgba(140,251,218,.12);border:1px solid rgba(140,251,218,.3);padding:4px 10px;border-radius:100px}
    .txt{font-size:14.5px;line-height:1.5}
    .empty{text-align:center;color:var(--dim,#8b98a9);padding:40px}
    .disc{font-size:12px;color:var(--mute,#5f6b7a);text-align:center;margin-top:24px}
  `],
})
export class KomunitaComponent implements OnInit {
  private svc = inject(CommunityService);
  nick = ''; category = 'tip'; childAge = ''; text = ''; website = '';
  loadedAt = 0;
  posts = signal<CommunityPost[]>([]);
  msg = signal(''); isErr = signal(false); cooldown = signal(0);

  ngOnInit(): void {
    this.loadedAt = Date.now();
    this.svc.list().subscribe({ next: (r) => this.posts.set(r.items || []), error: () => {} });
  }

  onType(): void {}
  canPost(): boolean { return this.text.trim().length >= 15 && this.cooldown() === 0; }

  submit(): void {
    if (!this.canPost()) return;
    const token = (document.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement)?.value || '';
    this.svc.submit({
      nick: this.nick, category: this.category, childAge: this.childAge, text: this.text.trim(),
      captcha: token, loadedAt: this.loadedAt, website: this.website,
    }).subscribe({
      next: (r) => { this.isErr.set(false); this.msg.set(r.message || 'Ďakujeme!'); this.text = ''; this.startCooldown(); },
      error: (e) => { this.isErr.set(true); this.msg.set(e?.error?.error || 'Nepodarilo sa odoslať, skúste znova.'); this.startCooldown(); },
    });
  }

  private startCooldown(): void {
    this.cooldown.set(10);
    const t = setInterval(() => {
      this.cooldown.update((v) => v - 1);
      if (this.cooldown() <= 0) clearInterval(t);
    }, 1000);
  }
}
