---
title: Essex County Renovation Candidate Overview
---

<script>
  import PublishingPageShell from '$lib/layout/PublishingPageShell.svelte';
  import WhyItMattersBlock from '$lib/blocks/WhyItMattersBlock.svelte';
  import FreshnessBlock from '$lib/blocks/FreshnessBlock.svelte';
  import CaveatsBlock from '$lib/blocks/CaveatsBlock.svelte';
  import CtaFooterBlock from '$lib/blocks/CtaFooterBlock.svelte';
  import assetMetadata from '$content/assets/proof/essex-county-ma/renovation-candidate-overview.json';

  const hubspotFormUrl = new URL(import.meta.env.VITE_HUBSPOT_FORM_BASE_URL);
  hubspotFormUrl.searchParams.set('utm_source', import.meta.env.VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE);
  hubspotFormUrl.searchParams.set('utm_medium', assetMetadata.cta.utm_medium);
  hubspotFormUrl.searchParams.set('utm_campaign', assetMetadata.cta.utm_campaign);
  const whyItMattersBullets = [
    'The signal is based on durable `NEW_SALE` and `LATE_SALE` events instead of raw scrape-row volume.',
    'High-band candidate counts connect market activity to a commercial use case rather than a vanity metric.',
    'The same contract can later be served from curated exports or a FastAPI boundary without changing the page shape.'
  ];
  const caveats = [
    'This page reads a curated sample contract fixture in local mode; it does not read source-native scrape tables directly.',
    'Renovation scoring is model-versioned, so interpretation should always be tied to the reported model version.',
    'Enrichment is targeted rather than universal, so scored-property counts should not be interpreted as total market inventory.'
  ];
</script>

<Note status="info">
  Contract: <code>market_proof_overview</code> <code>v1</code>. This page is driven by curated publishing data, not raw scrape tables.
</Note>

```sql market_proof_overview
  select *
  from publishing_contracts.market_proof_overview
  where market_slug = 'essex-county-ma'
```

```sql market_proof_metrics
  select 'New sale events' as metric, new_sale_events as value
  from publishing_contracts.market_proof_overview
  where market_slug = 'essex-county-ma'
  union all
  select 'Late sale events' as metric, late_sale_events as value
  from publishing_contracts.market_proof_overview
  where market_slug = 'essex-county-ma'
  union all
  select 'High-band candidates' as metric, high_band_candidate_count as value
  from publishing_contracts.market_proof_overview
  where market_slug = 'essex-county-ma'
```

<PublishingPageShell
  assetLabel="Evergreen proof asset"
  title="Essex County Renovation Candidate Overview"
  summary="This page shows the shape of the commercial signal Fort Island can package for the market: durable sale-event volume plus a non-trivial share of high-band renovation candidates."
  market="Essex County, MA"
  contractName="market_proof_overview"
  contractVersion="v1"
>
  <div slot="heroMetrics" class="grid gap-3 md:grid-cols-2">
    <BigValue data={market_proof_overview} value="new_sale_events" title="New sale events" />
    <BigValue data={market_proof_overview} value="high_band_candidate_count" title="High-band candidates" />
  </div>

  <WhyItMattersBlock
    text="The proof pattern combines event-driven market activity with scored-candidate output so the narrative stays commercially meaningful and reusable across channels."
    bullets={whyItMattersBullets}
  />

  <FreshnessBlock data={market_proof_overview} contractVersion={assetMetadata.contract.version} />

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Supporting Metrics</h2>

    <BarChart
      data={market_proof_metrics}
      title="Supporting proof metrics"
      x=metric
      y=value
    />
  </section>

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <DataTable data={market_proof_overview} title="Market proof overview record" />
  </section>

  <CaveatsBlock items={caveats} />

  <CtaFooterBlock
    title="Request a market-specific briefing"
    text="Use the same proof pattern with a tailored market or customer context when you need a sharper sales or briefing asset."
    buttonLabel={assetMetadata.cta.label}
    buttonUrl={hubspotFormUrl.toString()}
  />
</PublishingPageShell>
