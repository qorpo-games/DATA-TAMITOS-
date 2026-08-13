"""
Konfigurácia zdrojov pre denný update feedu „Novinky".
Pridať nový zdroj = pridať jeden riadok. `lang` riadi, či sa článok prekladá do SK.
"""

# RSS / Atom feedy (svet + SK). `kind` len na kategorizáciu vo feede.
RSS_FEEDS = [
    # --- svetový výskum (prekladá sa do SK) ---
    {"name": "ScienceDaily · Autism", "url": "https://www.sciencedaily.com/rss/mind_brain/autism.xml", "lang": "en", "kind": "research"},
    {"name": "Nature · ASD", "url": "https://www.nature.com/subjects/autism-spectrum-disorders.rss", "lang": "en", "kind": "research"},
    {"name": "The Transmitter (Spectrum)", "url": "https://www.thetransmitter.org/feed/", "lang": "en", "kind": "research"},
    {"name": "Autism Research Institute", "url": "https://autism.org/feed/", "lang": "en", "kind": "news"},
    {"name": "Neuroscience News · Autism", "url": "https://neurosciencenews.com/neuroscience-terms/autism/feed/", "lang": "en", "kind": "research"},
    # --- SK zdroje (bez prekladu) ---
    # TAMITOS blog nemá klasické RSS -> rieši sa scraperom (blog_scrape.py / feeds_ingest).
]

# TAMITOS blog (SK) — scrapuje sa HTML listing, keďže RSS nie je dostupné.
TAMITOS_BLOG = {"name": "TAMITOS Novinky a tipy", "url": "https://tamitos.com/sk/blog", "lang": "sk", "kind": "tamitos"}

# Kandidátske RSS cesty, ktoré sa skúsia pred scrapovaním blogu (ak niektorá existuje, použije sa).
TAMITOS_BLOG_RSS_CANDIDATES = [
    "https://tamitos.com/sk/blog/rss.xml",
    "https://tamitos.com/sk/blog/feed",
    "https://tamitos.com/feed",
    "https://tamitos.com/rss.xml",
]
