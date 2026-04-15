---
title: Essex County Market Sale Activity
---

<script>
  import PublishingPageShell from '$lib/layout/PublishingPageShell.svelte';
  import WhyItMattersBlock from '$lib/blocks/WhyItMattersBlock.svelte';
  import FreshnessBlock from '$lib/blocks/FreshnessBlock.svelte';
  import CaveatsBlock from '$lib/blocks/CaveatsBlock.svelte';
  import CtaFooterBlock from '$lib/blocks/CtaFooterBlock.svelte';
  import assetMetadata from '$content/assets/proof/essex-county-ma/market-sale-activity.json';

  const hubspotFormUrl = new URL(import.meta.env.VITE_HUBSPOT_FORM_BASE_URL);
  hubspotFormUrl.searchParams.set('utm_source', import.meta.env.VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE);
  hubspotFormUrl.searchParams.set('utm_medium', assetMetadata.cta.utm_medium);
  hubspotFormUrl.searchParams.set('utm_campaign', assetMetadata.cta.utm_campaign);

  const whyItMattersBullets = [
    'Sale event counts (NEW_SALE and LATE_SALE) are derived from durable event records, not raw listing snapshots, making them stable across data refreshes.',
    'Active inventory depth tells a prospect how competitive the market is right now — a low active_for_sale_count relative to sale velocity signals a supply-constrained market.',
    'Median sale price anchors the commercial context: it shows the price tier Fort Island is operating in and frames the magnitude of the opportunity without scoring model internals.'
  ];

  const caveats = [
    'This page covers sale activity and inventory counts only — scoring, enrichment pipeline data, and mailing operations data are out of scope for this contract.',
    'No internal ops metrics (enrichment queue depth, mailing send rates, scrape yield) appear anywhere on this page; those are published under separate, access-controlled contracts.',
    'Median sale price requires a minimum of 3 sale events in the 30-day window to be reported; it will be null for very low-volume markets or early-period data gaps.'
  ];
</script>

<Note status="info">
  Contract: <code>market_sale_activity</code> <code>v1</code>. This page covers sale event volume and active inventory only — no scoring or enrichment data.
</Note>

```sql sale_summary
  -- instance of queries/proof/market_sale_activity.sql
  -- market_slug: essex-county-ma
  select *
  from publishing_contracts.market_sale_activity
  where market_slug = 'essex-county-ma'
```

```sql sale_weekly
  -- instance of queries/proof/market_sale_activity_weekly.sql
  -- market_slug: essex-county-ma
  select *
  from publishing_contracts.market_sale_activity_weekly
  where market_slug = 'essex-county-ma'
  order by week_start
```

```sql sale_metrics
  -- pivot sale_events_30d and active_for_sale_count into two-row metric shape for BarChart
  select 'Sale events (30d)' as metric, sale_events_30d as value
  from publishing_contracts.market_sale_activity
  where market_slug = 'essex-county-ma'
  union all
  select 'Active listings' as metric, active_for_sale_count as value
  from publishing_contracts.market_sale_activity
  where market_slug = 'essex-county-ma'
```

```sql sale_geography
  -- instance of queries/proof/market_sale_activity_geography.sql
  -- market_slug: essex-county-ma
  select *
  from publishing_contracts.market_sale_activity_geography
  where market_slug = 'essex-county-ma'
  order by active_for_sale_count desc
```

<PublishingPageShell
  assetLabel="Evergreen proof asset"
  title="Essex County Market Sale Activity"
  summary="This page shows the shape of the sale activity signal Fort Island can package for the market: durable sale-event volume and active inventory depth across a rolling 30-day window."
  market="Essex County, MA"
  contractName="market_sale_activity"
  contractVersion="v1"
>
  <div slot="heroMetrics" class="grid gap-3 md:grid-cols-2">
    <BigValue data={sale_summary} value="sale_events_30d" title="Sale events (30d)" />
    <BigValue data={sale_summary} value="active_for_sale_count" title="Active listings" />
  </div>

  <WhyItMattersBlock
    text="The sale activity proof contract combines event-driven market volume with real-time inventory depth so the narrative is commercially meaningful and free of internal ops language."
    bullets={whyItMattersBullets}
  />

  <FreshnessBlock data={sale_summary} contractVersion={assetMetadata.contract.version} />

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Weekly Sale Events</h2>

    <BarChart
      data={sale_weekly}
      title="Weekly Sale Events"
      x=week_start
      y=new_sale_events
    />
  </section>

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Late Sale Events by Week</h2>

    <BarChart
      data={sale_weekly}
      title="Late Sale Events per Week"
      x=week_start
      y=late_sale_events
    />
  </section>

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">New Listings per Week</h2>

    <BarChart
      data={sale_weekly}
      title="New Listings per Week"
      x=week_start
      y=new_listing_events
    />
  </section>

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Median Sale Price (30 days)</h2>

    <BigValue data={sale_summary} value="median_sale_price_30d" title="Median sale price (30d)" fmt="usd0" />
  </section>

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Active Inventory by Geography</h2>

    <BarChart
      data={sale_geography}
      title="Active listings by geography"
      x=geography_name
      y=active_for_sale_count
    />
  </section>

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Median Sale Price by Geography</h2>

    <BarChart
      data={sale_geography}
      title="Median sale price by geography"
      x=geography_name
      y=median_sale_price_30d
      fmt="usd0"
    />
  </section>

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <DataTable data={sale_summary} title="Market sale activity record" />
  </section>

  <CaveatsBlock items={caveats} />

  <CtaFooterBlock
    title="Request a market-specific briefing"
    text="Use the same proof pattern with a tailored market or customer context when you need a sharper sales or briefing asset."
    buttonLabel={assetMetadata.cta.label}
    buttonUrl={hubspotFormUrl.toString()}
  />
</PublishingPageShell>
