# MAXAGIST — Google Ads build (PAUSED)

Prepared: 2026-08-19
Account: `Mxgst` / customer `5011738364`

## Important safety state

**Do not enable campaigns yet.** All campaign rows in this package are `Paused`.

Known account state before the Adspirer quota was exhausted:

- `Массажист в Piņķi и Saliena` — Performance Max — **PAUSED** — ID `24136051627`.
- `SEARCH | Studio | Piņķi + Babīte | 2026-08` — Search draft made via Adspirer — **PAUSED** — ID `24154497722`.

The second draft was created by a connector that defaults new keywords to Broad. It should **not** be enabled as-is. The files in this folder represent the controlled replacement build.

## Campaign architecture

### 1) SEARCH | Studio | Local | 2026-08

- Status: **Paused**
- Daily budget: **$10**
- Network: **Google Search only**; Search Partners off; Display off
- Initial bid strategy: **Maximize clicks**, max CPC **$0.80**
- Geo: **10 km radius** around Jaunā iela 12, Piņķi
- Location option: **Presence — people in or regularly in targeted locations**
- Languages: LV / RU / EN
- Ad groups: Studio LV / Studio RU / Studio EN
- Keywords: Exact + Phrase only for initial controlled test
- Landing: `/massage-pinki-saliena.html?lang=...`

### 2) SEARCH | Mobile | West Riga + Jurmala | 2026-08

- Status: **Paused**
- Daily budget: **$5**
- Network: **Google Search only**
- Initial bid strategy: **Maximize clicks**, max CPC **$0.80**
- Geo: **20 km radius** around Jaunā iela 12, Piņķi
- Location option: **Presence**
- Languages: LV / RU / EN
- Ad groups: Mobile LV / Mobile RU / Mobile EN
- Keywords: Exact + Phrase
- Landing: `/vyezd.html?lang=...`

The broad radius on Mobile is intentional because the service travels; query intent and negatives provide the second control layer.

## Why Maximize clicks first

The account had only one recorded form conversion in the reviewed data. The initial build therefore prioritizes controlled Search-query discovery instead of giving Broad Match + conversion bidding maximum freedom immediately. Once form/qualified-lead measurement is stable, change bidding to **Maximize conversions** and evaluate expansion separately.

Do not change several major variables at the same time after launch.

## Conversion configuration

Current known primary action:

- `Отправка формы для потенциальных клиентов` — SUBMIT_LEAD_FORM — Primary — ONE_PER_CLICK — Data-driven attribution.

Target conversion model:

1. `WhatsApp click` — **Secondary / observation only**. A click is not a lead.
2. `Lead — Form success` — **Primary initially**. Fire only after backend confirms the lead.
3. `Qualified lead — Booked` — CRM/Data Manager conversion. Collect first; later make the main bidding signal when data is reliable.
4. `Converted lead — Paid` — CRM/Data Manager conversion with real EUR value when known.

The website source already preserves click IDs/UTMs and lead statuses. Do not upload offline leads from the browser. Use server-side Google Ads Data Manager / Data Manager API.

## Import order in Google Ads Editor

1. `01_campaigns.csv`
2. `02_keywords.csv`
3. `03_responsive_search_ads.csv`
4. `04_locations.csv`
5. `05_negative_keywords.csv`
6. `06_sitelinks.csv`
7. `07_callouts.csv`
8. `08_call_assets.csv`

Then run **Check changes** in Google Ads Editor.

Before posting, explicitly verify:

- Both campaigns say **Paused**.
- Networks contains **Google Search** only.
- Search Partners is not enabled.
- Location targeting is the correct 10 km / 20 km radius.
- Location option is **Presence**, not Presence or Interest.
- Ad-group language and ad copy match.
- All Final URLs resolve after the updated website is deployed.
- Existing PMax and old Broad Search draft remain paused.

Posting a **paused** campaign adds the configuration to the account but does not start ad delivery. Enabling it is a separate future action.

## Assets

There are 15 unique headlines and 4 descriptions per language ad group. Six sitelinks are provided per ad group to keep assets language-consistent. Campaign-level mixed-language sitelinks should not be used.

`08_call_assets.csv` adds the public phone number but does not invent a Google call-conversion action. Configure call conversion only after verifying Google forwarding/call reporting availability for this account.

## After launch (not now)

- Review actual search terms frequently during the first weeks.
- Add real irrelevant queries as negatives; do not over-block by guessing.
- Compare Studio vs Mobile using booked/paid lead quality, not clicks alone.
- Move from Maximize clicks to Maximize conversions only after conversion measurement is stable.
- Keep PMax paused until Search has produced useful query and conversion evidence.
