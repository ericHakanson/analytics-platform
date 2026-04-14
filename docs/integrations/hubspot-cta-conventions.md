# HubSpot CTA Conventions

This document defines how the analytics platform hands off traffic to HubSpot and the conventions all page authors and operators must follow.

---

## 1. Ownership boundary

HubSpot is the conversion and campaign-distribution layer. Evidence analytics pages hand off traffic to HubSpot; they do not own what happens after.

**HubSpot owns:**
- Forms and form submission handling
- Lead routing and CRM ingestion
- Campaign attribution and UTM reporting
- Follow-up sequences and nurture workflows

**Evidence owns:**
- Data presentation and market signal narrative
- The CTA button or link that points to HubSpot
- UTM parameter composition (sourced from env vars and asset metadata)

Conversion logic never moves into Evidence templates. Evidence pages are a read-only publishing surface. When a user clicks a CTA button, they leave Evidence and enter the HubSpot layer.

---

## 2. CTA destination rules by asset family

Each asset family has a defined `target_type` that governs how the CTA destination is constructed.

| Asset family | `target_type` | CTA destination | UTM composition |
|---|---|---|---|
| `evergreen_proof` | `hubspot_form` | `VITE_HUBSPOT_FORM_BASE_URL` + UTM params | Yes — `utm_source`, `utm_medium`, `utm_campaign` |
| `campaign` | `hubspot_landing_page` | `VITE_HUBSPOT_FORM_BASE_URL` + UTM params | Yes — `utm_source`, `utm_medium`, `utm_campaign` |
| `client_briefing` | `email_link` | `mailto:` address in `cta.target_url` | No UTM composition |

### Why briefings use email link

Client briefings are prepared for active clients and operators — a known, engaged audience, not mass outbound traffic. The appropriate CTA is a direct contact mechanism (`mailto:`) rather than a campaign form. Routing briefing CTAs through HubSpot form UTM flows would conflate outbound lead generation with active-client communication and pollute campaign attribution data.

---

## 3. UTM attribution conventions

For `hubspot_form` and `hubspot_landing_page` target types, three UTM parameters are composed and appended to the base URL.

### `utm_source`

Always set from `VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE`. This env var is configured once per environment and identifies the analytics platform as the traffic origin in HubSpot campaign reports.

Example value: `fortisland-signals`

### `utm_medium`

Defined per asset in `assetMetadata.cta.utm_medium`. Identifies the page type within the analytics platform.

Conventions:
- Proof assets: `"proof-page"`
- Campaign assets: `"campaign-page"`

### `utm_campaign`

Defined per asset in `assetMetadata.cta.utm_campaign`. Should match the asset slug or campaign name to enable per-asset attribution in HubSpot.

### Anti-pattern

Do not hardcode UTM values in page templates. All UTM params must originate from env vars (`VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE`) or asset metadata (`assetMetadata.cta.utm_medium`, `assetMetadata.cta.utm_campaign`). Hardcoded strings in templates cannot be updated without a code change and break per-environment isolation.

---

## 4. How CTA URLs are composed in pages

For `hubspot_form` and `hubspot_landing_page` assets, the CTA button URL is composed at page render time using the canonical pattern:

```javascript
const hubspotCtaUrl = new URL(import.meta.env.VITE_HUBSPOT_FORM_BASE_URL);
hubspotCtaUrl.searchParams.set('utm_source', import.meta.env.VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE);
hubspotCtaUrl.searchParams.set('utm_medium', assetMetadata.cta.utm_medium);
hubspotCtaUrl.searchParams.set('utm_campaign', assetMetadata.cta.utm_campaign);
```

The composed URL string is then passed to `CtaFooterBlock`:

```svelte
<CtaFooterBlock buttonUrl={hubspotCtaUrl.toString()} ... />
```

### The `cta.target_url` field in asset metadata

The `cta.target_url` field in asset metadata contains a placeholder URL for documentation and schema validation purposes. It indicates the intended destination type (e.g., a HubSpot form path), but it is **not** used as the live `buttonUrl` in pages.

For `hubspot_form` and `hubspot_landing_page` target types, always compose the actual button URL from `VITE_HUBSPOT_FORM_BASE_URL` + UTM params as shown above. Do not pass `assetMetadata.cta.target_url` directly as the `buttonUrl`.

For `email_link` target types (`client_briefing`), use `assetMetadata.cta.target_url` directly — it contains the `mailto:` address and no UTM composition is needed.

---

## 5. What HubSpot does NOT own

- Evidence page content or data presentation
- The analytics build and publish pipeline
- Metric definitions (those belong to `contracts/publishing/metric-registry.json`)
- The analytics hosting environment or static output
- UTM source configuration (that belongs to `VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE` in the Evidence env)

---

## 6. Anti-patterns

The following patterns are prohibited:

- **Hardcoding HubSpot form URLs in page templates.** All HubSpot base URLs must come from `VITE_HUBSPOT_FORM_BASE_URL`. This allows the form target to change per environment without touching templates.

- **Using HubSpot as a rendering or hosting layer for analytics content.** Analytics pages are served from the Evidence static output at `VITE_PUBLIC_SITE_BASE_URL`. HubSpot is a terminal destination, not a hosting layer.

- **Putting metric definitions or scoring logic inside HubSpot workflows.** Market signal definitions and proof scores belong in `contracts/publishing/metric-registry.json` and the upstream data pipeline. HubSpot workflows must not replicate or reinterpret those definitions.

- **Using `assetMetadata.cta.target_url` directly as the live button URL for hubspot-type CTAs.** The `target_url` field in asset metadata is a documentation placeholder. For `hubspot_form` and `hubspot_landing_page` target types, compose the live URL from `VITE_HUBSPOT_FORM_BASE_URL` + UTM params.
