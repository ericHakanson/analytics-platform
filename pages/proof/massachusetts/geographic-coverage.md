---
title: Massachusetts Geographic Coverage
---

<script>
  import PublishingPageShell from '$lib/layout/PublishingPageShell.svelte';
  import WhyItMattersBlock from '$lib/blocks/WhyItMattersBlock.svelte';
  import FreshnessBlock from '$lib/blocks/FreshnessBlock.svelte';
  import CaveatsBlock from '$lib/blocks/CaveatsBlock.svelte';
  import CtaFooterBlock from '$lib/blocks/CtaFooterBlock.svelte';
  import CountyCoverageMapBlock from '$lib/blocks/CountyCoverageMapBlock.svelte';
  import assetMetadata from '$content/assets/proof/massachusetts/geographic-coverage.json';

  const hubspotFormUrl = new URL(import.meta.env.VITE_HUBSPOT_FORM_BASE_URL);
  hubspotFormUrl.searchParams.set('utm_source', import.meta.env.VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE);
  hubspotFormUrl.searchParams.set('utm_medium', assetMetadata.cta.utm_medium);
  hubspotFormUrl.searchParams.set('utm_campaign', assetMetadata.cta.utm_campaign);

  const whyItMattersBullets = [
    'County-by-county coverage makes the statewide footprint tangible instead of asking prospects to trust a generic coverage claim.',
    'ZIP counts in-region versus ZIPs with tracked properties show where coverage is broad enough to support signal packaging at market scale.',
    'This page stays on public proof territory only: footprint and tracked properties, not scrape yield, run health, or ops-monitoring data.'
  ];

  const caveats = [
    'ZIP coverage is point-in-time for the reporting window and will move as the canonical property layer refreshes.',
    'The county map reflects tracked properties, not all housing inventory in Massachusetts.',
    'This page uses curated contract outputs only and does not query source-native property tables directly.'
  ];
</script>

<Note status="info">
  Contract: <code>geographic_coverage</code> <code>v1</code>. Massachusetts county coverage summary for public proof use.
</Note>

```sql geographic_coverage_county
select
  county_slug,
  county_name,
  state_code,
  fips_code,
  period_start,
  period_end,
  zip_count_in_region,
  zip_count_with_properties,
  total_properties,
  data_as_of,
  last_updated_at,
  round(zip_count_with_properties * 1.0 / zip_count_in_region, 4) as coverage_rate
from publishing_contracts.geographic_coverage
where state_slug = 'massachusetts'
order by total_properties desc
```

```sql geographic_coverage_summary
select
  count(*) as counties_in_scope,
  sum(zip_count_in_region) as zip_count_in_region,
  sum(zip_count_with_properties) as zip_count_with_properties,
  sum(total_properties) as total_properties,
  min(period_start) as period_start,
  max(period_end) as period_end,
  max(data_as_of) as data_as_of,
  max(last_updated_at) as last_updated_at
from publishing_contracts.geographic_coverage
where state_slug = 'massachusetts'
```

<PublishingPageShell
  assetLabel="Evergreen proof asset"
  title={assetMetadata.title}
  summary={assetMetadata.primary_message}
  market="Massachusetts"
  contractName="geographic_coverage"
  contractVersion="v1"
>
  <div slot="heroMetrics" class="grid gap-3 md:grid-cols-2">
    <BigValue data={geographic_coverage_summary} value="counties_in_scope" title="Counties in scope" />
    <BigValue data={geographic_coverage_summary} value="total_properties" title="Tracked properties" />
  </div>

  <WhyItMattersBlock
    text="This page makes the Massachusetts market footprint explicit by showing county-level property volume alongside ZIP coverage counts."
    bullets={whyItMattersBullets}
  />

  <FreshnessBlock data={geographic_coverage_summary} contractVersion={assetMetadata.contract.version} />

  <CountyCoverageMapBlock
    data={geographic_coverage_county}
    title="Tracked Properties by County"
    description="County-level property counts across Massachusetts for the trailing 30-day window."
    valueCol="total_properties"
  />

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">ZIP Coverage Summary</h2>
    <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
      County-by-county ZIP coverage: target-region ZIPs, ZIPs with tracked properties, coverage rate, and tracked property count.
    </p>
    <div class="mt-4">
      <DataTable data={geographic_coverage_county} title="County ZIP coverage summary" />
    </div>
  </section>

  <CaveatsBlock items={caveats} />

  <CtaFooterBlock
    title="Request a market-specific briefing"
    text="Translate the statewide footprint into a county-specific signal story or prospect briefing."
    buttonLabel={assetMetadata.cta.label}
    buttonUrl={hubspotFormUrl.toString()}
  />
</PublishingPageShell>
