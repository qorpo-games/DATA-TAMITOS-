# TAMITOS Health — denné updaty + komunita

Dve „živé" funkcie webu: (1) automatický denný zber noviniek a dát, (2) moderovaný
komunitný priestor na zdieľanie skúseností — s tvrdou ochranou proti botom.

## 1) Denný update (05:00 Europe/Bratislava)

Jeden denný job spustí tri skripty (v `data-pipeline/`), ktoré napĺňajú DB
za `data.tamitos.com`. Všetko idempotentné (žiadne duplikáty).

| Skript | Napĺňa | Zdroje |
|---|---|---|
| `tamitos_ingest.py` | `studies`, `providers` | ClinicalTrials.gov API, CVTI adresár |
| `feeds_ingest.py` | `articles` (feed Novinky) | RSS: ScienceDaily, Nature, The Transmitter, ARI, Neuroscience News + **TAMITOS blog (sk)** |
| `vuc_registers.py` | `providers` | registre soc. služieb 8 krajov (VÚC) + IS SoS |

**Čo je „nové":** `feeds_ingest` pri každom behu zhodí `is_new` zo starých a označí
`is_new=1` len tie, čo dnes pribudli — web tak vie zobraziť odznak „NOVÉ / update".

**Pridať zdroj** = jeden riadok v `data-pipeline/feeds.py` (RSS) alebo
`vuc_registers.py` (register). Nič iné netreba.

### Schedule na AWS (EventBridge)

```
# 05:00 Europe/Bratislava = 03:00 UTC (v lete CEST). Pozn.: v zime posunúť na 04:00 UTC,
# alebo nechať fixne 03:00 UTC — pre nočný job je posun o hodinu nepodstatný.
EventBridge rule:  cron(0 3 * * ? *)  ->  Lambda / ECS task "tamitos-daily-ingest"
```

Job spustí postupne tri skripty a zapíše do RDS Postgres (alebo vygeneruje
`data.json` do S3). Lokálny cron ekvivalent:

```cron
0 5 * * *  cd /opt/tamitos && python3 tamitos_ingest.py && python3 feeds_ingest.py && python3 vuc_registers.py >> /var/log/tamitos.log 2>&1
```

### Preklad svetových článkov do SK
`articles.lang="en"` položky sa preložia (DeepL / Amazon Translate) do
`translated_sk` v samostatnom kroku — vždy s odkazom na originál a označením
„strojový preklad". SK zdroje (TAMITOS blog) sa neprekladajú.

## 2) Komunita — zdieľanie skúseností (NIE chat)

Moderovaný priestor: rodičia napíšu, čo im pomohlo; príspevok sa zobrazí **až po
schválení**. Zámerne to nie je real-time chat — je to kurátorský feed skúseností.

### Prečo vlastné riešenie (nie Disqus a pod.)
Disqus/tretie strany prinášajú reklamy, sledovanie a slabú moderáciu — pri
zdravotnom obsahu nevhodné. Vlastný endpoint sa napojí na tú istú DB
(`data.tamitos.com`), dá plnú kontrolu nad moderáciou a bránením spamu, a ladí s
brandingom.

### Architektúra
```
[Angular formulár] --POST--> [API Gateway] --> [Lambda community_lambda.py] --> [DynamoDB th_community: pending]
                                                                                      |
[web feed] <---GET--- [API Gateway] <--- [Lambda] <--- approved  <--- [moderácia] <---┘
```

### Anti-spam — 7 vrstiev (v `backend/community_lambda.py`)
1. **API Gateway throttling + AWS WAF** — rate/burst limit, blokovanie zjavných útokov (infra).
2. **Cloudflare Turnstile** (alebo hCaptcha) — neviditeľná výzva, token overený server-side. Súkromnejšie než reCAPTCHA.
3. **Honeypot** — skryté pole `website`; ak ho bot vyplní → tichý drop.
4. **Time-trap** — odoslané < 4 s po načítaní → bot.
5. **Per-IP rate limit** — max **1 / 10 s** a **5 / deň** (DynamoDB, IP len ako hash, TTL 2 dni).
6. **Obsahové filtre** — dĺžka 15–1200 znakov, max 1 odkaz, blokované vzory; príspevky propagujúce nebezpečné „liečby" (MMS, chelácia, GcMAF…) idú na prísnu moderáciu (`flagged`).
7. **Moderácia** — všetko končí `pending`; publikuje sa až po schválení (jednoduchý moderačný dashboard číta `status=pending`).

### Frontendová UX ochrana (v `komunita.component.ts`)
- honeypot pole mimo obrazovky, `loadedAt` timestamp, počítadlo znakov,
- po odoslaní **10 s cooldown** na tlačidle (limit „1× za 10 s" aj vizuálne),
- jasná hláška: „Ďakujeme, príspevok ide na krátku kontrolu a zobrazí sa po schválení."

### Rozšírenia (neskôr)
- e-mailová notifikácia moderátorovi pri `flagged`,
- reakcie (👍) namiesto vlákien (nie je to chat),
- nahlásenie príspevku komunitou.
