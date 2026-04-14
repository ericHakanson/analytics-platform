# Squarespace Integration Patterns

This document defines the approved patterns for connecting Squarespace to the analytics publishing platform and the boundaries that must be respected.

For the authoritative ownership boundary decision, see `docs/architecture/adr-009-hosting-deployment-model.md`. For HubSpot handoff conventions, see `docs/integrations/hubspot-cta-conventions.md`.

---

## 1. Ownership boundary

Squarespace is the brand shell and discovery surface. It does NOT host or render analytics pages.

**Squarespace owns:**
- Brand identity, visual shell, and navigation
- Marketing copy and editorial framing
- Discovery entry points that surface the analytics platform to website visitors

**Evidence analytics platform owns:**
- All analytics page content, data presentation, and signal narratives
- Hosting and serving the static analytics build
- URL stability — `VITE_PUBLIC_SITE_BASE_URL` is the canonical base for all analytics links

Squarespace never receives or processes CTA handoffs from analytics pages. That role belongs to HubSpot.

---

## 2. Approved patterns

### 2a. Link-out pattern

The simplest and most durable pattern. Squarespace pages contain a link or CTA button that sends the visitor to a full analytics page at its canonical URL.

**When to use:**
- Any analytics page that should be discoverable from the website
- When the analytics content needs its full layout and interactivity
- When the Squarespace page provides editorial context (e.g., a blog post or landing page that introduces the data)

**How to compose the URL:**

The destination URL is `{VITE_PUBLIC_SITE_BASE_URL}/{route_group}/{market_slug}/{asset_slug}`.

Examples using `https://analytics.fortisland.com` as the production base:

| Route group | Example URL |
|---|---|
| `proof` | `https://analytics.fortisland.com/proof/essex-county-ma/renovation-candidate-overview` |
| `campaigns` | `https://analytics.fortisland.com/campaigns/middlesex-county-ma/spring-seller-signal-q2-2026` |
| `briefings` | Not linked from Squarespace — briefings are not for public distribution |

**Implementation in Squarespace:**
- Use a standard hyperlink or Squarespace button block
- Set the URL to the full canonical analytics URL
- Open in the same tab for proof and campaign pages (visitors are on the same brand)
- Do not hardcode localhost or staging URLs in Squarespace content — always use the production base URL

---

### 2b. Teaser or summary pattern

Squarespace hosts a brief editorial summary or highlight excerpt that previews the analytics signal, with a link to the full analytics page.

**When to use:**
- Website landing pages or market-specific pages that want to surface one or two headline metrics
- Campaign launch contexts where the editorial team writes a narrative that the analytics page supports

**What Squarespace owns in this pattern:**
- The editorial text and metric callouts that appear on the Squarespace page
- The framing and brand voice

**What Squarespace does NOT own:**
- The metric values themselves — these must come from the analytics page, not be hardcoded in Squarespace
- Data freshness or update cadence — Squarespace editorial copy must not include specific figures that go stale

**Guidance:**
- Use language like "See the latest data" or "View the current market analysis" rather than quoting specific numbers in Squarespace copy
- Link the teaser to the full analytics page using the link-out pattern (2a)
- Avoid duplicating analytics content in Squarespace — the analytics page is the system of record for signal data

---

### 2c. Selective embed pattern

A specific analytics page is embedded inside a Squarespace page using an HTML embed or iframe block.

**When to use:**
- A high-value proof page where embedding the analytics view directly in the brand context improves the visitor experience
- Cases where the editorial team wants a seamless visual experience without navigating away from Squarespace

**Requirements:**
- The embedded analytics page must be hosted at a stable canonical URL (`VITE_PUBLIC_SITE_BASE_URL/...`)
- Use a responsive iframe; do not use fixed pixel heights that clip content on mobile
- The analytics page must be designed for embed legibility — verify that the `PublishingPageShell` layout renders acceptably at iframe widths before embedding

**Example iframe snippet (Squarespace HTML embed block):**

```html
<iframe
  src="https://analytics.fortisland.com/proof/essex-county-ma/renovation-candidate-overview"
  width="100%"
  style="min-height: 800px; border: none;"
  title="Essex County Renovation Candidate Overview"
  loading="lazy"
></iframe>
```

**Limitations:**
- Squarespace does not control how the embedded page looks or behaves — only the analytics platform does
- If the analytics page layout changes, the embed reflects the change automatically
- Briefing pages must never be embedded in Squarespace — they are not for public distribution

---

## 3. CTA placement in Squarespace pages

Analytics pages own their own CTAs (HubSpot handoff buttons via `CtaFooterBlock`). Squarespace pages linking to analytics may also include a Squarespace-native CTA, but only for routing visitors to the analytics page itself — not for routing visitors directly to HubSpot forms.

**Correct:** Squarespace page → link-out to analytics page → analytics page CTA → HubSpot form

**Incorrect:** Squarespace page → link directly to HubSpot form (bypasses analytics page, loses signal context)

This boundary keeps CTA attribution in the correct layer. HubSpot attribution reports should reflect traffic sourced from analytics page CTAs, not from Squarespace buttons that bypass the analytics content.

---

## 4. Anti-patterns

| Anti-pattern | Why it is wrong |
|---|---|
| Host analytics pages inside Squarespace | Squarespace is not a static site host. Analytics output belongs at `VITE_PUBLIC_SITE_BASE_URL`. See ADR-009. |
| Hardcode metric values in Squarespace copy | Squarespace copy will go stale. Specific data belongs in the analytics page. Use editorial framing, not data values. |
| Link Squarespace CTAs directly to HubSpot | Bypasses analytics pages. Attribution breaks. CTA handoff must flow through the analytics platform. |
| Embed briefing pages in Squarespace | Briefings are for active clients and operators only — not for public distribution via the marketing site. |
| Use localhost or staging URLs in Squarespace links | Production Squarespace content must reference the production `VITE_PUBLIC_SITE_BASE_URL`. Staging URLs are not stable. |
| Build analytics logic or queries in Squarespace | Squarespace has no data layer. Any analytics logic must live in the Evidence repo and its contracts. |

---

## 5. Page lifecycle and link maintenance

When an analytics asset is retired or its URL changes, Squarespace links that point to it will break. To prevent this:

- Asset slugs must be durable and reusable per `docs/architecture/asset-conventions.md` — do not include dates or version identifiers in slugs
- Before retiring an asset, identify all Squarespace pages that link to it and update or remove the links
- Squarespace is not automatically notified of analytics platform deployments — link verification is a manual step in the publishing checklist

Route structure is stable by design: `/proof/{market_slug}/{asset_slug}`, `/campaigns/{market_slug}/{asset_slug}`. Market slugs and asset slugs do not change once published.
