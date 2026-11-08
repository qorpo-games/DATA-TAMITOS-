# Orphadata catalogue — 8 November 2026

The Health application now has `/diagnozy` and `/diagnozy/:code`: an official,
searchable Orphanet catalogue with English/Czech names, synonyms, definitions,
source dates, attribution, lifecycle and precise mapping relations. This is code
in the DATA-TAMITOS- application, **not confirmation of deployment to tamitos.com**.
The production website has a separate deployment repository and routing; its
maintainer must mount this application or port the component before announcing it.

## Build and refresh

Requirements: Python 3.11+ (standard library only), the existing Node/Angular tools.

```sh
npm run catalogue:refresh
npm run build
```

The first command downloads only two fixed official Science URLs, around 5 MB
compressed combined. It generates `public/diagnoses/manifest.json` and immutable
release folders with an index and 100 detail shards. `npm run build` runs the
importer with `--if-present`: a complete local release is reused; otherwise it is
downloaded. Refresh is explicit, not a request on every visit or every warm build.
There is no API key, login, paid API or production database mutation.

Offline build:

```sh
python data-pipeline/orphadata_catalogue.py --input-dir /path/to/raw-json --output public/diagnoses
```

The input folder contains `en_product1.json` and `cs_product1.json`. The public
files are generated, Git-ignored and copied by Angular into the build artifact;
**do not add datasets or research HTML to Git/LFS**. A deployment must upload the
generated `diagnoses/` directory alongside the application. Keep old immutable
release folders when rolling updates serve old open pages. Use short cache TTL
for manifest; immutable caching is suitable for content-addressed release files.
Use the existing deployment process; this task adds no AWS/OIDC/IAM workflow.

## Source contract

- Source page: https://sciences.orphadata.com/alignments/
- English: https://www.orphadata.com/data/json/en_product1.json.tar.gz
- Czech: https://www.orphadata.com/data/json/cs_product1.json.tar.gz
- Licence: CC-BY-4.0, checked in **each** dataset before generation.
- Citation and AI-use notice: https://www.orphadata.com/faq/

Observed release: source timestamp **2026-06-23**, described on the website as the
July 2026 knowledge base release. The software format version is not a release
date. All 11,645 identifiers occur in both files: 7,515 disorders, 1,457 subtypes,
2,673 groups, **including inactive/historical and non-rare entries**. These counts
must not be advertised as 11,645 active rare diseases. The Czech file has 563 names
still tagged English: the importer leaves Czech blank rather than relabeling them.

Each source records its exact uncompressed JSON SHA256, URL, language, format
version and date. No database-host metadata from the upstream envelope is copied
to public output. Manifest also includes attribution, transformations and licence.
There is no assumption that an external citation reveals a site's ingestion method.

The importer validates licence, declared row count, positive unique ORPHAcodes,
classification level, matched language release/date and identical ID sets. Production
builds stop below 10,000 records or on a >5% drop against the local previous manifest.
Archive members are read by exact name and size, never extracted to arbitrary paths.
Manifest is published last, after all immutable detail shards and the index.

Every ORPHA identity remains separate from ICD-10/ICD-11/MONDO/GARD mappings:
the mapping's relation (exact/broader/narrower/etc.) and validation status are kept.
Other terminology systems are not exported automatically. Definitions render as
escaped text, not executable source HTML. No symptom checker or treatment advice
is generated. Source flags and replacement relations are retained; default search
hides inactive/historical and explicitly non-rare-in-Europe records. Archived
details remain accessible with clear notices and links to related ORPHAcodes.

## Slovak editorial workflow

`data-pipeline/diagnosis-editorial.json` contains **six AI-assisted drafts**, not
medically approved translations. They cite the specific ORPHA source and date.
No professional review has been performed or invented. Public UI uses the Czech
or English original until Slovak status is `reviewed`.

To approve an item, a qualified editor must inspect the original record and the
Slovak wording, then commit:

```json
{
  "72": {
    "status": "reviewed",
    "name_sk": "Angelmanov syndróm",
    "explanation_sk": "Clinically reviewed original Slovak explanation goes here.",
    "reviewed_by": "internal reviewer identifier",
    "reviewed_at": "YYYY-MM-DD",
    "source_date_reviewed": "2026-06-23",
    "source_sha256_reviewed": "480e79e666defee1fae5e50b5836f4b3841642e29aafb2f291870f19bc3364ae",
    "sources": ["https://www.orpha.net/en/disease/detail/72"]
  }
}
```

The reviewer ID is not exported into public records. A missing reviewer, source
list, explanation, SHA256 or date fails validation. A refresh to different source bytes or date changes the
effective status to `needs_recheck`; the old Slovak text is no longer shown as
currently approved. Dataset import/build timestamps never become review dates.
This is a Git editorial workflow, not a finished review-admin interface. Official
Slovak nomenclature and professional review for the entire catalogue remain work.

## Prior reference research / REA

Earlier local research enumerated all 218 diagnosis links on Socialeasator's
public index and fetched 218/218 details. There were 622 external-link occurrences;
some are support organisations, not provenance for medical text. No patient data,
accounts or private content were collected. That reference is **not** imported as
Tamitos medical authority and its article text is not redistributed.

REA static JavaScript evidence:
`ev_d63e2e85e92edc1ef11c06901acbc718a35a5c10202f91984d60d16ee304aee4`.
It analyzed the shipped public JavaScript without execution. Semantic limits were
reached; it is not server source recovery or proof of internal imports/updates.
Use REA for further shipped-artifact or runtime questions; ordinary Python/Angular
source changes and parsing published JSON do not need decompilation.

Optional local matching queue, outside web assets:

```sh
python data-pipeline/orphadata_catalogue.py --input-dir /raw --output public/diagnoses --candidates /research/index.json --review-output /research/review-queue.private.json
```

This produces lexical **candidates**, never approved equivalence, synonyms or
translations. Current 218 reference names yield 51 candidates needing review and
167 unmatched entries. Lack of a lexical match does not establish absence from
Orphanet; English/Czech versus Slovak spelling and non-rare diagnoses can differ.
Do not publish the matching queue or competitor text as our dataset.

## Verification and deployment handoff

Verified locally on 8 November 2026: **107 unit tests pass**, Angular production
build passes, and the index/detail join covers all 11,645 IDs. Default search
exposes 9,757 active entries, still including groups/subtypes. Six Slovak entries
remain drafts. The search index is approximately 641 KiB gzip; the largest raw
detail shard is approximately 168 KiB. A direct detail visit does not fetch the
entire search index. Browser interaction and production deployment were not
verified by these compile/data checks.

```sh
python -X utf8 -m unittest discover -s tests -v
npm run build
```

The new tests cover licence/schema/count errors, duplicate IDs, cross-language
release mismatch, Czech language fallback, mapping specificity, inactive/non-rare
flags, replacement links, draft/review state and immutable detail releases.

After deploying, verify list search, ORPHA direct detail, archive toggle, language
labels, source/version/licence, missing-code errors, and a non-exact ICD mapping.
Test a direct refresh of `/diagnozy/72` under the actual host prefix. A new browser
loads only the index; details are fetched one shard at a time. Production IAM,
network controls, professional review and host routing are not established by
unit tests or by a successful Angular build.
