---
title: Weekly Pipeline Briefing — Essex and Middlesex Counties
---

<script>
  import PublishingPageShell from '$lib/layout/PublishingPageShell.svelte';
  import WhyItMattersBlock from '$lib/blocks/WhyItMattersBlock.svelte';
  import FreshnessBlock from '$lib/blocks/FreshnessBlock.svelte';
  import CaveatsBlock from '$lib/blocks/CaveatsBlock.svelte';
  import CtaFooterBlock from '$lib/blocks/CtaFooterBlock.svelte';
  import assetMetadata from '$content/assets/briefing/essex-middlesex-ma/weekly-pipeline-briefing.json';

  const buttonUrl = assetMetadata.cta.target_url;

  const whyItMattersBullets = [
    'Town-run pass rate reflects pipeline health across all scheduled shards — a high rate means event data arrived cleanly and enrichment had a full working set.',
    'New and late sale event counts show the actual commercial signal volume ingested this cycle; these figures drive candidate scoring, not raw listing counts.',
    'High-band candidate count translates pipeline activity into a decision-ready output: properties that cleared enrichment thresholds and scored into the actionable tier.'
  ];

  const caveats = [
    'One shard completed partial this cycle with a recoverable warning volume; commercial signal remained usable, but operators should verify shard completion logs before acting on candidate counts.',
    'Enrichment is targeted rather than universal — enrichment_completion_rate reflects coverage of properties that entered the enrichment queue, not total market inventory.',
    'This page is for active client and operator use only and is not intended for public distribution, website publication, or outbound or social channels.'
  ];
</script>

<Note status="info">
  Contract: <code>client_pipeline_briefing</code> <code>v1</code>. Cycle: weekly operations snapshot. Audience: active clients and operators only.
</Note>

```sql pipeline_briefing
-- instance of queries/briefing/client_pipeline_briefing.sql
select *
from publishing_contracts.client_pipeline_briefing
where market_slug = 'essex-middlesex-ma'
```

```sql pipeline_counts
-- instance of queries/briefing/client_pipeline_briefing.sql
-- counts only — rates are rendered as BigValues in a separate section
select 'New sale events' as metric, new_sale_events as value
from publishing_contracts.client_pipeline_briefing
where market_slug = 'essex-middlesex-ma'
union all
select 'Late sale events' as metric, late_sale_events as value
from publishing_contracts.client_pipeline_briefing
where market_slug = 'essex-middlesex-ma'
union all
select 'High-band candidates' as metric, high_band_candidate_count as value
from publishing_contracts.client_pipeline_briefing
where market_slug = 'essex-middlesex-ma'
```

```sql pipeline_rates
-- instance of queries/briefing/client_pipeline_briefing.sql
-- rates only (0–1) — kept off the counts chart axis
select town_runs_pass_rate, enrichment_completion_rate
from publishing_contracts.client_pipeline_briefing
where market_slug = 'essex-middlesex-ma'
```

<PublishingPageShell
  assetLabel="Client briefing"
  title={assetMetadata.title}
  summary={assetMetadata.primary_message}
  market="Essex and Middlesex Counties, MA"
  contractName="client_pipeline_briefing"
  contractVersion="v1"
>
  <div slot="heroMetrics" class="grid gap-3 md:grid-cols-2">
    <BigValue data={pipeline_briefing} value="town_runs_pass_rate" title="Town-run pass rate" fmt="pct" />
    <BigValue data={pipeline_briefing} value="high_band_candidate_count" title="High-band candidates" />
  </div>

  <WhyItMattersBlock
    title="Pipeline Signal This Cycle"
    text="The weekly briefing combines pipeline health indicators, event-driven market activity, and scored-candidate output so operators and active clients can assess cycle quality and act on commercial signal."
    bullets={whyItMattersBullets}
  />

  <FreshnessBlock
    data={pipeline_briefing}
    contractVersion={assetMetadata.contract.version}
    startField="cycle_start"
    endField="cycle_end"
  />

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Cycle Event Counts</h2>
    <p class="mt-1 text-sm text-slate-600">Count metrics. Pipeline health rates are shown separately below.</p>

    <BarChart
      data={pipeline_counts}
      title="Event and candidate counts"
      x=metric
      y=value
    />
  </section>

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Pipeline Health Rates</h2>
    <p class="mt-1 mb-4 text-sm text-slate-600">
      Rate metrics (0–1). <code>town_runs_pass_rate</code> reflects shard completion health;
      <code>enrichment_completion_rate</code> reflects record coverage within the enrichment queue.
    </p>
    <div class="grid gap-3 md:grid-cols-2">
      <BigValue data={pipeline_rates} value="town_runs_pass_rate" title="Town-run pass rate" fmt="pct" />
      <BigValue data={pipeline_rates} value="enrichment_completion_rate" title="Enrichment completion rate" fmt="pct" />
    </div>
  </section>

  <section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
    <DataTable data={pipeline_briefing} title="Full briefing record" />
  </section>

  <CaveatsBlock
    title="Operational Notes And Caveats"
    items={caveats}
  />

  <CtaFooterBlock
    title="Schedule a review"
    text="Use this briefing as the basis for a live review call to discuss pipeline health, candidate output, and next cycle priorities."
    buttonLabel={assetMetadata.cta.label}
    buttonUrl={buttonUrl}
  />
</PublishingPageShell>
