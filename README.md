# GEOPULSE — Global Intelligence System

Independent geopolitics explorer inspired by the map-led user experience of Inside Geopolitics, with an original responsive interface.

**Live:** https://geopulse-ei6b.onrender.com  
**Deployment:** Render web service, Frankfurt, Node.js  
**No API keys required:** The server consumes only available public endpoints. Availability, licenses, and limits are governed by each provider.

## Implemented
- 3D interactive globe with selectable country and historical-event points.
- **War Room:** 47 curated historical references covering battles, sieges, historic air/missile strikes, attacks, and naval campaigns. Country/region/type/time filters, search and linked reference articles.
- **Country explorer:** 36 country reference markers, six latest *available* indicators from the World Bank (GDP, population, GDP per capita, inflation, trade, military expenditure share). Indicator dates may differ.
- **Military arsenal:** 24 *illustrative* country equipment profiles (examples of historically/publicly documented systems; no live inventory totals).
- **World Rewind:** year slider filters the historical event sample.
- **Intelligence lab:** Cause & Effect, Ripple Effect, Blind Spots, What If? (clearly labelled qualitative/illustrative tools; not predictive AI or confirmed causal inference).
- **News:** GDELT indexed reporting (may be unavailable or delayed; clearly surfaced).
- Source catalog and visible provenance and data caveats.

## Run locally
```bash
npm install
npm run build
npm start
```
The production server runs on `PORT` (default 10000). Development mode: `npm run dev`.

## Render configuration
- Runtime: Node
- Build: `npm install && npm run build`
- Start: `npm start`
- Optional health check: `/api/health`
- No environment secrets are necessary.

## Read-only endpoints
- `GET /api/health`
- `GET /api/news` (GDELT indexed articles; backend cache 15 minutes)
- `GET /api/economy?iso=GRC` (World Bank public data; cached 24 hours)

## Data integrity and scope
This is **not** a real-time battlefield activity map, weapons-tracking system, strike warning system or military-operational intelligence feed. The curated event points are approximate city/region locations. Not every historical reference is independently fact-checked against multiple original records; cross-check source articles before relying on them. The event sample is not exhaustive.

Equipment platform names indicate publicly documented examples, not verified current national inventories, serviceability or precise unit counts. SIPRI arms transfers refer to transfers and their methodologies, not necessarily current available inventories.

The World Rewind feature filters dated records and **does not** reconstruct border changes. Cause & Effect, Ripple Effect and What If? provide exploratory mechanisms, not calibrated models or causal estimates. Blind Spots quantifies domain concentration in the sampled feed only; it cannot infer media suppression or ideological bias.

**UCDP licensing/access:** Public CSV datasets can be downloaded from https://ucdp.uu.se/downloads/; the UCDP REST API requires an access token, so GEOPULSE does not access it in this no-key deployment. Dataset ingestion will require explicit licensing and a versioned import workflow.

## Core sources
- https://ucdp.uu.se/downloads/
- https://www.sipri.org/databases/armstransfers
- https://www.sipri.org/databases/milex
- https://data.worldbank.org/
- https://www.gdeltproject.org/
- https://www.unhcr.org/refugee-statistics/
- https://reliefweb.int/

All external content remains attributed to its providers. The project does not reproduce Inside Geopolitics's proprietary source code or assets.
