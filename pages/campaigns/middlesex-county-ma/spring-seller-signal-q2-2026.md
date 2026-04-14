---
title: Spring Seller Signal — Middlesex County, MA
---

<script>
  import PublishingPageShell from '$lib/layout/PublishingPageShell.svelte';
  import WhyItMattersBlock from '$lib/blocks/WhyItMattersBlock.svelte';
  import FreshnessBlock from '$lib/blocks/FreshnessBlock.svelte';
  import CaveatsBlock from '$lib/blocks/CaveatsBlock.svelte';
  import CtaFooterBlock from '$lib/blocks/CtaFooterBlock.svelte';
  import assetMetadata from '$content/assets/campaign/middlesex-county-ma/spring-seller-signal-q2-2026.json';

  const hubspotCtaUrl = new URL(import.meta.env.VITE_HUBSPOT_FORM_BASE_URL);
  hubspotCtaUrl.searchParams.set('utm_source', import.meta.env.VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE);
  hubspotCtaUrl.searchParams.set('utm_medium', assetMetadata.cta.utm_medium);
  hubspotCtaUrl.searchParams.set('utm_campaign', assetMetadata.cta.utm_campaign);

  const whyItMattersBullets = [
    'Sale-event volume over the last 30 days (`sale_events_30d`) reflects durable transaction activity rather than raw listing counts, anchoring the campaign signal to real market movement.',
    'High enrichment completion (`enrichment_completion_rate`) means the underlying records are ready for outreach — low completion would undermine the campaign narrative before it starts.',
    'Source coverage is tracked separately for Zillow and Redfin (`source_coverage_share` in the metric registry) so the audience framing stays honest about which data feeds are driving the signal.'
  ];

  const caveats = [
    'Sale-event counts and enrichment rates are scoped to the campaign window defined in the asset metadata (Q2 2026 campaign window); comparisons outside that window require a separate contract fixture.',
    'The `campaign_readiness_note` field is a curated narrative produced by the publishing contract — it is not generated at query time and should be treated as a human-reviewed editorial signal.',
    'Conversion tracking and lead ownership stay in HubSpot; this page only provides the CTA handoff link and does not record or infer any downstream conversion activity.'
  ];
</script>

<Note status="info">
  Contract: <code>campaign_snapshot</code> <code>v1</code>. Time window: Q2 2026 campaign window. CTA handoff is owned by HubSpot.
</Note>

```sql campaign_snapshot
-- instance of queries/campaign/campaign_snapshot.sql
select *
from publishing_contracts.campaign_snapshot
where market_slug = 'middlesex-county-ma'
```

```sql campaign_metrics
-- instance of queries/campaign/campaign_snapshot.sql
-- counts only — ratios are rendered as BigValues, not on this axis
select 'Sale events (30d)' as metric, sale_events_30d as value
from publishing_contracts.campaign_snapshot
where market_slug = 'middlesex-county-ma'
```

```sql campaign_coverage
select zillow_coverage_share, redfin_coverage_share
from publishing_contracts.campaign_snapshot
where market_slug = 'middlesex-county-ma'
```

<PublishingPageShell
  assetLabel="Campaign asset"
  title={assetMetadata.title}
  summary={assetMetadata.primary_message}
  market="Middlesex County, MA"
  contractName="campaign_snapshot"
  contractVersion="v1"
>
  <div slot="heroMetrics" class="grid gap-3 md:grid-cols-2">
    <BigValue data={campaign_snapshot} value="sale_events_30d" title="Sale events (30d)" />
    <BigValue data={campaign_snapshot} value="enrichment_completion_rate" title="Enrichment completion rate" fmt=pct />
  </div>

  <WhyItMattersBlock
    text="Middlesex County's spring campaign signal is grounded in recent transaction activity and enrichment readiness, giving home-services operators a data-backed story for targeted outreach."
    bullets={whyItMattersBullets}
  />

  <FreshnessBlock data={campaign_snapshot} contractVersion={assetMetadata.contract.version} />

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Sale Activity</h2>
    <p class="mt-1 text-sm text-slate-600">Count metric. Enrichment and coverage rates are shown separately below.</p>

    <BarChart
      data={campaign_metrics}
      title="Sale events (30d)"
      x=metric
      y=value
    />
  </section>

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Readiness Rates</h2>
    <p class="mt-1 mb-4 text-sm text-slate-600">
      Rate metrics. <code>enrichment_completion_rate</code> governs record readiness for outreach.
    </p>
    <div class="grid gap-3 md:grid-cols-1">
      <BigValue data={campaign_snapshot} value="enrichment_completion_rate" title="Enrichment completion rate" fmt=pct />
    </div>
  </section>

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <DataTable data={campaign_snapshot} title="Campaign snapshot record" />
  </section>

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Source Coverage</h2>
    <p class="text-slate-600 mb-4">
      The columns below correspond to <code>source_coverage_share</code> in the metric registry, broken out by data provider.
    </p>
    <div class="grid gap-3 md:grid-cols-2">
      <BigValue data={campaign_coverage} value="zillow_coverage_share" title="Zillow coverage share (source_coverage_share)" fmt=pct />
      <BigValue data={campaign_coverage} value="redfin_coverage_share" title="Redfin coverage share (source_coverage_share)" fmt=pct />
    </div>
  </section>

  <CaveatsBlock items={caveats} />

  <CtaFooterBlock
    title="See if this market fits your spring campaign"
    text="This page hands off to HubSpot for follow-through. Use the link below to explore campaign fit for Middlesex County — conversion tracking and lead ownership are managed there."
    buttonLabel={assetMetadata.cta.label}
    buttonUrl={hubspotCtaUrl.toString()}
  />
</PublishingPageShell>
