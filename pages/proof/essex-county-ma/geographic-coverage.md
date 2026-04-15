---
title: Essex County Geographic Coverage
---

<script>
  import PublishingPageShell from '$lib/layout/PublishingPageShell.svelte';
  import WhyItMattersBlock from '$lib/blocks/WhyItMattersBlock.svelte';
  import FreshnessBlock from '$lib/blocks/FreshnessBlock.svelte';
  import CaveatsBlock from '$lib/blocks/CaveatsBlock.svelte';
  import CtaFooterBlock from '$lib/blocks/CtaFooterBlock.svelte';
  import assetMetadata from '$content/assets/proof/essex-county-ma/geographic-coverage.json';

  const hubspotFormUrl = new URL(import.meta.env.VITE_HUBSPOT_FORM_BASE_URL);
  hubspotFormUrl.searchParams.set('utm_source', import.meta.env.VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE);
  hubspotFormUrl.searchParams.set('utm_medium', assetMetadata.cta.utm_medium);
  hubspotFormUrl.searchParams.set('utm_campaign', assetMetadata.cta.utm_campaign);

  const whyItMattersBullets = [
    'Prospects need to know coverage is broad enough to make signal intelligence commercially meaningful — ZIP-level data makes that concrete.',
    'High ZIP coverage rates indicate the pipeline captures market activity across towns, not just high-volume clusters.',
    'The same coverage contract can be extended to new markets or used in client briefings without changing the page shape.'
  ];

  const caveats = [
    'Coverage counts are point-in-time: a ZIP code is counted only if at least one property was tracked during the contract period.',
    'A minimum of one property per ZIP is required to count it as covered — low-density ZIPs may appear uncovered even if they have sporadic activity.',
    'This page reads a curated sample contract fixture in local mode; it does not read source-native property tables directly.'
  ];
</script>

<Note status="info">
  Contract: <code>geographic_coverage</code> <code>v1</code>. This page shows ZIP-level coverage for Essex County — how many ZIP codes are tracked vs. defined in the target region.
</Note>

```sql geo_coverage
select *
from publishing_contracts.geographic_coverage
where county_slug = 'essex-county-ma'
```

```sql geo_coverage_ratio
select
  zip_count_with_properties,
  zip_count_in_region,
  round(zip_count_with_properties * 1.0 / zip_count_in_region, 4) as coverage_rate
from publishing_contracts.geographic_coverage
where county_slug = 'essex-county-ma'
```

<PublishingPageShell
  assetLabel="Evergreen proof asset"
  title="Essex County Geographic Coverage"
  summary="This page shows the geographic reach of Fort Island's property coverage in Essex County — ZIP codes tracked vs. defined in the region."
  market="Essex County, MA"
  contractName="geographic_coverage"
  contractVersion="v1"
>
  <div slot="heroMetrics" class="grid gap-3 md:grid-cols-2">
    <BigValue data={geo_coverage} value="zip_count_in_region" title="ZIP codes in region" />
    <BigValue data={geo_coverage} value="zip_count_with_properties" title="ZIP codes with properties" />
  </div>

  <WhyItMattersBlock
    text="Geographic coverage shows prospects that Fort Island's property tracking spans the full market — not just the highest-activity towns — giving signal intelligence that reflects the whole county."
    bullets={whyItMattersBullets}
  />

  <FreshnessBlock data={geo_coverage} contractVersion={assetMetadata.contract.version} />

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Coverage Rate</h2>
    <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
      Share of Essex County ZIP codes with at least one tracked property.
    </p>
    <div class="mt-4">
      <BigValue data={geo_coverage_ratio} value="coverage_rate" title="ZIP coverage rate" fmt="pct1" />
    </div>
  </section>

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <DataTable data={geo_coverage} title="Geographic coverage record" />
  </section>

  <CaveatsBlock items={caveats} />

  <CtaFooterBlock
    title="Request a market-specific briefing"
    text="See how coverage translates to commercial signal depth for your target geography."
    buttonLabel={assetMetadata.cta.label}
    buttonUrl={hubspotFormUrl.toString()}
  />
</PublishingPageShell>
