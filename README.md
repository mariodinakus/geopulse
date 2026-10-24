# GEOPULSE 2.0 — The World, Connected

Independent interactive geopolitical world atlas, inspired by the map-first exploration pattern of Inside Geopolitics. This repository uses original UI/source code and public/licensed datasets; it does not duplicate the source code or editorial feed of the reference product.

- **Live site:** https://geopulse-ei6b.onrender.com/
- **Render:** Frankfurt / Node.js web service (production assets served from `dist/`; no Vite development server in production)
- **Keyless:** No proprietary paid API key is required. Several public data providers use REST-style HTTP APIs but do not require a key for these endpoints.

## Functional modules

| View | Delivered functionality |
|---|---|
| Global Atlas | 3D globe; 2D OpenStreetMap/MapLibre; 50m Natural Earth country borders; selection of countries, configurable map layers, group links, partner-flow arcs where data are available, 12-stop historical reference tour |
| Country Profile | Full World Bank country list where upstream responds; current/latest-available GDP, population, inflation, trade/GDP, defense spending/GDP, GDP per capita, defense expenditure time series, curated alliance memberships & assessed nuclear status |
| Conflict Monitor | 47 source-linked historic events; type/region/search filters; optional UCDP GED 26.1 historical sample (2022–2025) ingested from official CSV ZIP, when available |
| Military Atlas | 24 publicly documented equipment-type profiles, side-by-side examples; 14 selected publicly known major installations, approximate points & links, not operational status |
| Global Trade | No-key UN Comtrade preview filtered by reporter, imports/exports and reporting year; bilateral partner list/3D arcs only when returned by source; 10 major publicly known maritime chokepoints |
| World Rewind | Year filter for dated events (not true historical political boundaries), Wikidata search links |
| Intelligence Lab | Cause & Effect, Ripple Effect (Greece), Blind Spots (sample domain concentration), What If (transparent hypothetical index) |
| Sources & Data | Named primary sources, source citations, limitations and provenance per view |
| Global Reporting | GDELT-indexed articles fetched via server every 15 min with cache; status always surfaced; no fabricated fallback headlines |

## Live integrations (no subscription keys)

1. **World Bank**: country listings, GDP, population, inflation, trade openness, military share and military spending series. Annual observations often lag by different years. Military expenditure indicators attribute original data to SIPRI.
2. **GDELT**: articles with publication/seen timestamp and external headline URL. An index is *not* an independently verified event stream.
3. **Natural Earth / world-atlas**: modern administrative 0 boundaries (50m) via TopoJSON. Country identifier mapped from ISO numeric.
4. **UN Comtrade**: limited free *preview* endpoint; data can be absent or rate-limited; empty preview is never represented as zero trade.
5. **UCDP GED v26.1**: official free archive ZIP, ingested **on demand** when the user opens the UCDP tab. The server stores only every third event with geo-coordinates for years 2022–2025, capped at 45,000. The viewport additionally displays up to 800 sampled observations for the chosen year. Because this is sampled, *counts in this app are not worldwide conflict totals*. Download may fail if the archive blocks requests, times out or free Render RAM is exhausted. We surface these states explicitly.
6. **Wikidata**: keyless entity search, not a generated chronological history.
7. **Reference layers**: NATO/EU/G7 public member lists, country nuclear status at a high level, documented examples of platforms/bases and shipping chokepoints. These are *curated* and not auto-updating.

## Modeling and fact safeguards

- **Cause & Effect**: explanatory hypothesis chain, *not* event-specific causal identification.
- **Ripple Effect**: possible transmission channels into Greece, no numerical attributable shock estimate.
- **Blind Spots**: outlet concentrations in retrieved GDELT headlines; absence from the sample is not evidence of censorship.
- **What If?**: exposure index `round(shock_percent * dependence_percent / 100)`, clearly labelled illustrative, not a calibrated forecast.
- **War markers**: past events only, rough geographic coordinates for orientation; no tracking or targeting information.
- **Arsenal**: example weapons types *not* verified current holdings, inventories, unit counts, readiness or force superiority.
- **Foreign bases**: approximate published reference locations, not live aircraft/ship movements.
- **Trade arcs**: reporter-to-partner relationship only when keyless Comtrade preview returns a usable record. They are not shipping routes, real-time flows, or vessel tracks.
- **Historical boundaries**: **not reconstructed**; World Rewind shows modern borders with historically dated event markers.

## Local development

```bash
npm install
npm run dev
```

Production:

```bash
npm run build
npm start
```

Set `PORT` to the desired port (default `10000`). No secrets are needed. The 2D map uses standard OpenStreetMap raster tile service with attribution (please respect OSM tile usage policy and consider a dedicated tile provider if traffic scales).

## Render configuration

- Runtime: Node.js (Node 22+)
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Optional health check: `/api/health`
- Auto deploy: enabled, although it is useful to verify the deployment actually selects the latest commit.

## Server endpoints

| Path | Contents |
|---|---|
| `/api/health` | Server health/version |
| `/api/countries` | World Bank countries & regions |
| `/api/boundaries` | Natural Earth TopoJSON borders |
| `/api/economy?iso=GRC` | Latest available WB indicators |
| `/api/series?iso=GRC&indicator=MS.MIL.XPND.CD` | Dated WB defense spending time series |
| `/api/news` | GDELT article index (upstream status) |
| `/api/trade?reporter=300&year=2024&flow=X` | Limited UN Comtrade preview |
| `/api/wikidata?q=Cold%20War` | Search knowledge graph |
| `/api/ucdp/status` | Dataset import status, sampling caveat |
| `/api/ucdp/events?year=2025&limit=800` | Sampled archived UCDP geocoded events |

## Source list

- https://ucdp.uu.se/downloads/
- https://www.sipri.org/databases/milex
- https://www.sipri.org/databases/armstransfers
- https://data.worldbank.org/
- https://uncomtrade.org/docs/un-comtrade-api/
- https://www.gdeltproject.org/
- https://www.wikidata.org/
- https://github.com/topojson/world-atlas
- https://www.openstreetmap.org/copyright
- https://www.nato.int/
- https://european-union.europa.eu/

## Important limitations

This is a substantial functional **beta**, not a verified all-source real-time geopolitical intelligence service. Exact military inventories, adversary classifications, up-to-the-minute attack coordinates, comprehensive UN roll-call voting, dynamically updated historical borders and rigorously calibrated geopolitical forecasting are **not** delivered. Do not infer missing data from sparse sources.

**No account, payment or API key needed.**
