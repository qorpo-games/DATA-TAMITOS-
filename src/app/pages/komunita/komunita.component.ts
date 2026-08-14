import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommunityService, CommunityPost, TOPICS, Topic } from '../../core/community.service';

/**
 * Komunita — moderované zdieľanie skúseností (nie chat), organizované do TÉM
 * (štýl fór na Modrom koníkovi). Klientská anti-spam ochrana: honeypot,
 * time-trap (loadedAt), 10 s cooldown. Server dorába captcha + rate limit + moderáciu.
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

      <!-- TÉMY (fóra) -->
      <div class="topics">
        <button class="topic all" [class.on]="topic()===''" (click)="topic.set('')">
          <span class="ti">📚</span>
          <span class="tn">Všetky témy</span>
          <span class="tc">{{ posts().length }}</span>
        </button>
        @for (t of topics; track t.id) {
          <button class="topic" [class.on]="topic()===t.id" (click)="topic.set(t.id)">
            <span class="ti">{{ t.icon }}</span>
            <span class="tt">
              <span class="tn">{{ t.name }}</span>
              <span class="td">{{ t.desc }}</span>
            </span>
            <span class="tc">{{ countFor(t.id) }}</span>
          </button>
        }
      </div>

      <!-- FORMULÁR -->
      <form class="glass composer" (ngSubmit)="submit()" #f="ngForm" autocomplete="off">
        <div class="ctitle">✍️ Napíšte príspevok @if (topic()) { <span class="into">do témy „{{ topicName() }}"</span> }</div>
        <div class="row">
          <input class="inp" name="nick" [(ngModel)]="nick" placeholder="Prezývka (nepovinné)" maxlength="40" />
          <select class="inp" name="topicSel" [(ngModel)]="topicSel">
            <option value="">Vyberte tému…</option>
            @for (t of topics; track t.id) { <option [value]="t.id">{{ t.icon }} {{ t.name }}</option> }
          </select>
        </div>
        <div class="row">
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
          placeholder="Napíšte, čo vám v praxi zabralo… (aspoň 15 znakov)"></textarea>

        <!-- honeypot: skryté pole, ľudia ho nevyplnia, boti áno -->
        <input class="hp" name="website" [(ngModel)]="website" tabindex="-1" autocomplete="off" aria-hidden="true" />

        <div class="foot">
          <span class="count" [class.warn]="text.length < 15">{{ text.length }}/1200</span>
          <div class="cf-turnstile" data-sitekey="TURNSTILE_SITEKEY"></div>
          <button class="post" type="submit" [disabled]="!canPost() || sending()">
            {{ sending() ? 'Odosielam…' : (cooldown() > 0 ? 'Počkajte ' + cooldown() + ' s' : 'Uverejniť') }}
          </button>
        </div>
        @if (text.length > 0 && text.length < 15) {
          <div class="hint">Napíš aspoň 15 znakov, nech je príspevok zrozumiteľný.</div>
        }
        @if (msg()) {
          <div class="msg" [class.err]="isErr()" [class.ok]="!isErr()">{{ msg() }}</div>
        }
      </form>

      <!-- FEED -->
      <div class="feed">
        @for (p of filtered(); track p.created) {
          <article class="glass card">
            <div class="ch">
              <div class="av">{{ (p.nick || 'R').charAt(0).toUpperCase() }}</div>
              <div><b>{{ p.nick || 'Rodič' }}</b>
                <span class="meta">· {{ p.category }}{{ p.childAge ? ' · dieťa ' + p.childAge : '' }}</span>
              </div>
              @if (p.topic && topicIcon(p.topic)) { <span class="tbadge">{{ topicIcon(p.topic) }} {{ topicNameOf(p.topic) }}</span> }
            </div>
            <p class="txt">{{ p.text }}</p>
          </article>
        } @empty {
          <div class="empty">
            @if (topic()) { V téme „{{ topicName() }}" zatiaľ nie sú príspevky — buďte prvý. 🌱 }
            @else { Zatiaľ žiadne schválené príspevky — buďte prvý. 🌱 }
          </div>
        }
      </div>
      <p class="disc">Príspevky sú osobné skúsenosti, nie lekárske rady. Pri zmenách liečby sa vždy poraďte s lekárom.</p>
    </div>
  `,
  styles: [`
    .wrap{max-width:820px;margin:0 auto;padding:40px 22px 70px}
    .head h1{font-weight:800;font-size:34px;letter-spacing:-.6px}
    .head p{color:var(--dim,#8b98a9);margin-top:8px;font-size:15px;max-width:600px}
    .glass{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);
      backdrop-filter:blur(18px);border-radius:24px}
    /* TÉMY */
    .topics{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin:22px 0 8px}
    .topic{display:flex;align-items:center;gap:11px;text-align:left;cursor:pointer;
      background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:16px;
      padding:12px 14px;color:#fff;font:inherit;transition:.16s}
    .topic:hover{background:rgba(255,255,255,.09);transform:translateY(-2px)}
    .topic.on{border-color:#8cfbda;background:rgba(140,251,218,.12)}
    .topic .ti{font-size:22px;flex:0 0 auto;line-height:1}
    .topic .tt{display:flex;flex-direction:column;min-width:0;flex:1}
    .topic .tn{font-weight:700;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .topic .td{font-size:11.5px;color:var(--dim,#8b98a9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
    .topic .tc{margin-left:auto;flex:0 0 auto;font-size:12px;font-weight:700;color:var(--dim,#8b98a9);
      background:rgba(255,255,255,.08);border-radius:100px;padding:2px 9px;min-width:24px;text-align:center}
    .topic.all{align-items:center}.topic.all .tn{flex:1}
    /* FORMULÁR */
    .composer{padding:16px;margin:22px 0}
    .ctitle{font-weight:700;font-size:14.5px;margin-bottom:12px}
    .ctitle .into{color:#8cfbda;font-weight:600}
    .row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}
    .inp{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);color:#fff;
      border-radius:12px;padding:11px 14px;font:inherit;font-size:14px;outline:none}
    .inp:focus{border-color:#8cfbda}
    .row .inp{flex:1;min-width:150px}
    .ta{width:100%;min-height:96px;resize:vertical}
    .hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
    .foot{display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap}
    .count{font-size:12px;color:var(--dim,#8b98a9)} .count.warn{color:#ffd166}
    .cf-turnstile{margin-left:auto}
    .post{background:#fff;color:#12091c;font-weight:700;border:none;border-radius:100px;
      padding:11px 22px;cursor:pointer;font-size:14px}
    .post:disabled{opacity:.5;cursor:not-allowed}
    .hint{margin-top:10px;font-size:12.5px;color:#ffd166}
    .msg{margin-top:12px;font-size:14px;padding:12px 14px;border-radius:12px;line-height:1.45}
    .msg.ok{color:#bff7e2;background:rgba(63,224,138,.12);border:1px solid rgba(63,224,138,.35)}
    .msg.err{color:#ff9aa6;background:rgba(255,122,138,.1);border:1px solid rgba(255,122,138,.35)}
    .feed{display:flex;flex-direction:column;gap:12px;margin-top:8px}
    .card{padding:16px 18px}
    .ch{display:flex;align-items:center;gap:11px;margin-bottom:9px;flex-wrap:wrap}
    .av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:800;color:#12091c;
      background:linear-gradient(135deg,#cbb8ff,#8ccbfd);flex:0 0 auto}
    .meta{color:var(--dim,#8b98a9);font-weight:400;font-size:13px}
    .tbadge{margin-left:auto;font-size:11px;font-weight:700;color:#8cfbda;
      background:rgba(140,251,218,.12);border:1px solid rgba(140,251,218,.3);padding:4px 10px;border-radius:100px}
    .txt{font-size:14.5px;line-height:1.5;white-space:pre-wrap}
    .empty{text-align:center;color:var(--dim,#8b98a9);padding:40px}
    .disc{font-size:12px;color:var(--mute,#5f6b7a);text-align:center;margin-top:24px}
  `],
})
export class KomunitaComponent implements OnInit {
  private svc = inject(CommunityService);
  topics = TOPICS;
  nick = ''; category = 'tip'; childAge = ''; text = ''; website = '';
  topicSel = '';
  loadedAt = 0;
  posts = signal<CommunityPost[]>([]);
  topic = signal(''); // aktívny filter témy
  msg = signal(''); isErr = signal(false); cooldown = signal(0); sending = signal(false);

  filtered = computed(() => {
    const t = this.topic();
    const list = this.posts();
    return t ? list.filter((p) => p.topic === t) : list;
  });

  ngOnInit(): void {
    this.loadedAt = Date.now();
    this.svc.list().subscribe({ next: (r) => this.posts.set(r.items || []), error: () => {} });
  }

  countFor(id: string): number { return this.posts().filter((p) => p.topic === id).length; }
  topicName(): string { return this.topics.find((t) => t.id === this.topic())?.name || ''; }
  topicNameOf(id: string): string { return this.topics.find((t) => t.id === id)?.name || ''; }
  topicIcon(id: string): string { return this.topics.find((t) => t.id === id)?.icon || ''; }

  onType(): void {}
  canPost(): boolean { return this.text.trim().length >= 15 && this.cooldown() === 0; }

  submit(): void {
    if (!this.canPost() || this.sending()) return;
    this.sending.set(true);
    this.msg.set('');
    const token = (document.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement)?.value || '';
    // ak používateľ nevybral tému v selecte, použije sa práve aktívna téma filtra
    const topic = this.topicSel || this.topic() || '';
    this.svc.submit({
      nick: this.nick, category: this.category, childAge: this.childAge, topic, text: this.text.trim(),
      captcha: token, loadedAt: this.loadedAt, website: this.website,
    }).subscribe({
      next: () => {
        this.sending.set(false);
        this.isErr.set(false);
        this.msg.set('✅ Ďakujeme! Príspevok sme prijali a čaká na schválenie moderátorom. Zobrazí sa hneď po odobrení.');
        this.text = '';
        this.startCooldown();
      },
      error: (e) => {
        this.sending.set(false);
        this.isErr.set(true);
        this.msg.set(e?.error?.error || 'Nepodarilo sa odoslať, skúste o chvíľu znova.');
        this.startCooldown();
      },
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
