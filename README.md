# TAMITOS Health

Autism info portal — **evidence-rated** therapies, service directory, a Slovak
parent guide, and a prevalence dashboard. Everything carries a **source link as
proof**, and every therapy/method a **dôkazová úroveň** (✅ overené / 🔬 zmiešané
/ ⚠️ nepodložené) — the thing ordinary autism directories don't have.

Cieľ: byť pre TAMITOS verejným zdrojom všetkých dát o autizme na jednom mieste,
po slovensky, živý a denne aktualizovaný.

## Repo obsahuje dve časti

```
tamitos-health/
├── src/                 Angular 20 frontend (sekcia webu)
└── data-pipeline/       Python skript denného zberu dát → data.tamitos.com
```

### 1) Frontend (`src/`)

Angular 20 (standalone komponenty, lazy-loaded routes) + Tailwind + Angular
Material + ngx-translate — **zladené so stackom hlavného webu `tamitos-ssr`**.

```bash
npm install
npm start           # ng serve → http://localhost:4200
npm run build       # produkčný build do dist/
```

Stránky (routes):

| Cesta | Stav | Popis |
|---|---|---|
| `co-funguje` | ✅ hotové | „Čo funguje a čo nie" — flagship, tri úrovne dôkazov |
| `adresar` | 🔜 TODO | adresár centier/terapeutov (číta z data.tamitos.com) |
| `rodic-novacik` | 🔜 TODO | sprievodca pre rodičov (diagnostika, ŤZP, dávky) |
| `terapie` | 🔜 TODO | katalóg terapií + prevalenčný dashboard (CanvasJS) |
| `novinky` | 🔜 TODO | feed noviniek + TAMITOS blog (sk) |

Obsah stránok je **dátovo riadený** (`src/app/data/*.ts`).

### 2) Dátová pipeline (`data-pipeline/`)

Denný job, ktorý ťahá **verejné primárne zdroje** do jednej databázy (základ pre
`data.tamitos.com`). Idempotentné (UPSERT), pripravené na cron.

```bash
cd data-pipeline
pip install -r requirements.txt
python3 tamitos_ingest.py --sample     # offline ukážka
python3 tamitos_ingest.py              # naostro (potrebný internet)
```

| Zdroj | Do tabuľky | Prístup |
|---|---|---|
| ClinicalTrials.gov v2 API | `studies` | verejné API, JSON |
| CVTI adresár CPP/ŠCPP (XLSX) | `providers` | verejný XLSX |

## Dáta prevalencie = verejné agregáty

Dashboard používa **verejné agregáty** — NCZI ročenka „Psychiatrická
starostlivosť v SR" (diagnózy F84). **Žiadne dáta od poisťovní sa nevyžadujú.**
Pri každom grafe sa zobrazuje zdroj a rok.

## Nasadenie (data.tamitos.com)

Pipeline sa nasadí na AWS (Qorpo infra) ako denný job — 3 cesty v
`data-pipeline/README.md`: EventBridge + Lambda + RDS Postgres / ECS Fargate /
S3 + CloudFront. Frontend číta z `data.tamitos.com/api` cez `data.service.ts`.

## Právne

Ťaháme len z **primárnych verejných zdrojov**. Cudzie zozbierané databázy
nepreberáme. Komunitné príspevky budú mať moderáciu a disclaimer.

---
*Informácie na portáli nenahrádzajú konzultáciu s lekárom.*
