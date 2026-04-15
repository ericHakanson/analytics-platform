---
title: Massachusetts Signals Overview
---

<script>
  import PublishingPageShell from '$lib/layout/PublishingPageShell.svelte';
  import WhyItMattersBlock from '$lib/blocks/WhyItMattersBlock.svelte';
  import FreshnessBlock from '$lib/blocks/FreshnessBlock.svelte';
  import CaveatsBlock from '$lib/blocks/CaveatsBlock.svelte';
  import CtaFooterBlock from '$lib/blocks/CtaFooterBlock.svelte';
  import CountyCoverageMapBlock from '$lib/blocks/CountyCoverageMapBlock.svelte';
  import assetMetadata from '$content/assets/proof/massachusetts/signals-overview.json';

  const hubspotFormUrl = new URL(import.meta.env.VITE_HUBSPOT_FORM_BASE_URL);
  hubspotFormUrl.searchParams.set('utm_source', import.meta.env.VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE);
  hubspotFormUrl.searchParams.set('utm_medium', assetMetadata.cta.utm_medium);
  hubspotFormUrl.searchParams.set('utm_campaign', assetMetadata.cta.utm_campaign);

  const whyItMattersBullets = [
    'Portfolio-scale signal aggregates `NEW_SALE` and `LATE_SALE` events across all Massachusetts counties, giving prospects a credible top-of-funnel proof point rather than a single-market anecdote.',
    'High-band candidate counts connect raw market activity to a concrete commercial use case, demonstrating that the pipeline yields actionable renovation intelligence at scale.',
    'A versioned, portfolio-grain contract means the same narrative can be updated weekly and delivered across website, outbound, and social channels without re-authoring the page.'
  ];

  const caveats = [
    'This page reads a curated contract fixture; figures reflect the trailing 30-day window ending on the reported data-as-of date and may not reflect real-time market conditions.',
    'Scored-property counts represent properties with an active scoring record for the reported model version and should not be interpreted as total Massachusetts housing inventory.',
    'High-band candidate rate is based on properties that have been through the scoring pipeline; unscored properties are not counted in the denominator.'
  ];
</script>

<Note status="info">
  Contract: <code>signals_overview</code> <code>v1</code>. Trailing 30-day portfolio summary for Massachusetts. For public use.
</Note>

```sql signals_overview
select *
from publishing_contracts.signals_overview
where portfolio_slug = 'massachusetts'
```

```sql signals_overview_county
select *
from publishing_contracts.signals_overview_county
where portfolio_slug = 'massachusetts'
order by total_properties desc
```

```sql signals_overview_metrics
select 'Scored properties' as metric, scored_properties_count as value
from publishing_contracts.signals_overview
where portfolio_slug = 'massachusetts'
union all
select 'High-band candidates' as metric, high_band_candidate_count as value
from publishing_contracts.signals_overview
where portfolio_slug = 'massachusetts'
```

<PublishingPageShell
  assetLabel="Evergreen proof asset"
  title={assetMetadata.title}
  summary={assetMetadata.primary_message}
  market="Massachusetts"
  contractName="signals_overview"
  contractVersion="v1"
>
  <div slot="heroMetrics" class="grid gap-3 md:grid-cols-2">
    <BigValue data={signals_overview} value="sale_events_30d" title="Sale events (30d)" />
    <BigValue data={signals_overview} value="high_band_candidate_count" title="High-band candidates" />
  </div>

  <WhyItMattersBlock
    text="Massachusetts portfolio-scale signal shows that Fort Island's pipeline produces repeatable commercial intelligence across counties, not just in isolated pockets."
    bullets={whyItMattersBullets}
  />

  <FreshnessBlock data={signals_overview} contractVersion={assetMetadata.contract.version} />

  <CountyCoverageMapBlock
    data={signals_overview_county}
    title="Properties by County"
    description="Tracked properties across Massachusetts counties, trailing 30 days."
    valueCol="total_properties"
  />

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Portfolio Metrics</h2>

    <BarChart
      data={signals_overview_metrics}
      title="Portfolio signal metrics"
      x=metric
      y=value
    />
  </section>

  <CaveatsBlock items={caveats} />

  <CtaFooterBlock
    title="Explore a market-specific briefing"
    text="Request a tailored briefing that maps this portfolio-scale signal to your specific county or investment thesis."
    buttonLabel={assetMetadata.cta.label}
    buttonUrl={hubspotFormUrl.toString()}
  />
</PublishingPageShell>
