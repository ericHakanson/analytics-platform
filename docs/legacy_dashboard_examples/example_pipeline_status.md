# Pipeline Status

How properties flow from discovery through enrichment, scoring, and mailing. Use this to spot bottlenecks and stalled stages.

## Pipeline Event Types

```sql event_types
select 'NEW_LISTING' as event_type, 'Property first observed for sale' as meaning, 'No' as triggers_enrichment
union all
select 'NEW_SALE', 'Property transitioned FOR_SALE → SOLD', 'Yes'
union all
select 'LATE_SALE', 'Property appeared directly in sold feed (no prior FOR_SALE observation)', 'Yes'
union all
select 'NO_CHANGE', 'Re-observed in expected state', 'No'
union all
select 'R22_SOLD_RELIST_ANOMALY', 'Property re-appeared for sale after being SOLD', 'No (flagged for review)'
```

{% table data="event_types" /%}

Only **NEW_SALE** and **LATE_SALE** events progress a property through enrichment and scoring.

States: **FOR_SALE** · **SOLD** · **UNKNOWN**. If a property appears in both feeds in the same cycle, SOLD wins.

## Pipeline Funnel

```sql pipeline_funnel
SELECT 'All Properties' as stage, count(*) as properties FROM google_cloud_postgresql_public_property_state
UNION ALL
SELECT 'Sold', countIf(current_state = 'SOLD') FROM google_cloud_postgresql_public_property_state
UNION ALL
SELECT 'Enriched', countIf(enrichment_status = 'enriched') FROM google_cloud_postgresql_public_property_state
UNION ALL
SELECT 'Scored', count(distinct property_id) FROM google_cloud_postgresql_public_property_renovation_scores
UNION ALL
SELECT 'Candidates', countIf(is_renovation_candidate) FROM google_cloud_postgresql_public_property_renovation_scores
UNION ALL
SELECT 'Mailed', count(distinct property_id) FROM google_cloud_postgresql_public_mailing_sends
```

{% funnel_chart
    data="pipeline_funnel"
    category="stage"
    value="properties"
    title="Property Pipeline Funnel"
    subtitle="All Properties → Sold → Enriched → Scored → Candidates → Mailed"
    show_percent=true
    value_fmt="num0"
/%}

## Property Enrichment Status

```sql enrichment_status
SELECT
    enrichment_status,
    count(*) AS properties,
    round(count(*) * 100.0 / sum(count(*)) OVER (), 1) AS pct
FROM google_cloud_postgresql_public_property_state
GROUP BY 1
ORDER BY 2 DESC
```

{% bar_chart
    data="enrichment_status"
    title="Property Enrichment Status"
    x="enrichment_status"
    y="properties"
    y_fmt="num0"
/%}

{% table data="enrichment_status" /%}

## Recent Batch Health

Every pipeline cycle writes one row per geography to `town_runs`. Each stage has a status: `completed`, `partial`, `failed`, `skipped`, or `not_started`.

```sql recent_batch_health
SELECT
    geography,
    status,
    sold_discovery_status,
    for_sale_discovery_status,
    state_transition_status,
    enrichment_enqueue_status,
    scoring_status,
    new_sale_count + late_sale_count AS total_sales,
    new_listing_count,
    enrichment_enqueued,
    scoring_scored,
    scoring_eligible,
    started_at
FROM google_cloud_postgresql_public_town_runs
WHERE started_at >= now() - INTERVAL 7 DAY
ORDER BY started_at DESC
```

{% table data="recent_batch_health" search=true /%}

## Stage Status (Last 30 Days)

```sql stage_status
SELECT 'Sold Discovery' as stage, sold_discovery_status as status, count(*) as runs
FROM google_cloud_postgresql_public_town_runs WHERE started_at >= now() - INTERVAL 30 DAY GROUP BY 2
UNION ALL
SELECT 'For-Sale Discovery', for_sale_discovery_status, count(*)
FROM google_cloud_postgresql_public_town_runs WHERE started_at >= now() - INTERVAL 30 DAY GROUP BY 2
UNION ALL
SELECT 'State Transition', state_transition_status, count(*)
FROM google_cloud_postgresql_public_town_runs WHERE started_at >= now() - INTERVAL 30 DAY GROUP BY 2
UNION ALL
SELECT 'Enrichment Enqueue', enrichment_enqueue_status, count(*)
FROM google_cloud_postgresql_public_town_runs WHERE started_at >= now() - INTERVAL 30 DAY GROUP BY 2
UNION ALL
SELECT 'GCS Archive', gcs_archive_status, count(*)
FROM google_cloud_postgresql_public_town_runs WHERE started_at >= now() - INTERVAL 30 DAY GROUP BY 2
UNION ALL
SELECT 'Scoring', scoring_status, count(*)
FROM google_cloud_postgresql_public_town_runs WHERE started_at >= now() - INTERVAL 30 DAY GROUP BY 2
ORDER BY 1, 2
```

{% bar_chart
    data="stage_status"
    x="stage"
    y="runs"
    series="status"
    title="Pipeline Stage Status (Last 30 Days)"
    subtitle="Each bar segment = run count by status per stage"
    stacked=true
    y_fmt="num0"
/%}

{% table data="stage_status" /%}

## Throughput by Geography (Last 7 Days)

```sql throughput_by_geography
SELECT
    geography,
    sum(new_listing_count) as new_listings,
    sum(new_sale_count) as new_sales,
    sum(late_sale_count) as late_sales,
    sum(no_change_count) as no_change,
    sum(anomaly_count) as anomalies,
    sum(enrichment_enqueued) as enrichment_enqueued,
    sum(scoring_scored) as scored
FROM google_cloud_postgresql_public_town_runs
WHERE started_at >= now() - INTERVAL 7 DAY
GROUP BY geography
ORDER BY new_listings + new_sales + late_sales DESC
```

{% bar_chart
    data="throughput_by_geography"
    x="geography"
    y=["new_listings", "new_sales", "late_sales"]
    order="new_listings desc"
    stacked=true
    title="Event Throughput by Geography (Last 7 Days)"
    subtitle="NEW_LISTING + NEW_SALE + LATE_SALE events"
    y_fmt="num0"
/%}

{% table data="throughput_by_geography" /%}

## Enrichment Queue

Enrichment is triggered by **NEW_SALE** and **LATE_SALE** events. Each job fetches Zillow detail pages for a single property. Watch for growing `pending` queues or `failed` jobs.

```sql enrichment_queue
SELECT
    status,
    count(*) AS job_count,
    min(created_at) AS oldest_job,
    max(created_at) AS newest_job
FROM google_cloud_postgresql_public_enrichment_jobs
GROUP BY 1
ORDER BY 1
```

{% bar_chart
    data="enrichment_queue"
    x="status"
    y="job_count"
    title="Enrichment Queue Depth"
    y_fmt="num0"
/%}

{% table data="enrichment_queue" /%}

## Score Coverage

The pipeline currently scores for **home renovation** applicability (construction trade targeting). The scoring module is versioned (`model_version`) and the architecture supports future modules:

| Future module | `service_type` value |
|---|---|
| Landscaping | `landscaper` |
| Cleaning | `cleaner` |
| Plumbing | `plumber` |
| Electrical | `electrician` |
| Carpentry | `carpenter` |
| Insurance | *(future)* |

Each module produces its own rows in `property_renovation_scores` under a distinct `model_version`. All scoring views below are segmented by model version.

```sql score_by_version
select
  model_version,
  count(*) as properties,
  round(avg(renovation_score), 1) as avg_score,
  countIf(is_renovation_candidate) as candidates
from google_cloud_postgresql_public_property_renovation_scores
group by model_version
order by properties desc
```

{% table data="score_by_version" /%}

```sql score_distribution
select
  model_version,
  renovation_band,
  count(*) as properties,
  round(avg(renovation_score), 1) as avg_score,
  countIf(is_renovation_candidate = true) as candidates
from google_cloud_postgresql_public_property_renovation_scores
group by model_version, renovation_band
order by model_version, avg_score desc
```

{% bar_chart
  data="score_distribution"
  x="renovation_band"
  y="properties"
  series="model_version"
  y_fmt="num0"
  title="Properties by Renovation Band & Model Version"
  x_sort=["High", "Medium", "Low"]
/%}

{% table data="score_distribution" /%}

## Mailing Operations

Mailing batches target scored renovation candidates. Each batch is tracked from creation through delivery.

```sql mailing_batches
select
  b.batch_id,
  b.created_at,
  b.created_by,
  b.row_count_total,
  b.row_count_inserted,
  b.row_count_skipped,
  count(ms.send_id) as sends_recorded
from google_cloud_postgresql_public_mailing_send_batches b
left join google_cloud_postgresql_public_mailing_sends ms on ms.batch_id = b.batch_id
group by b.batch_id, b.created_at, b.created_by, b.row_count_total, b.row_count_inserted, b.row_count_skipped
order by b.created_at desc
```

{% table data="mailing_batches" /%}

## Stage Failure Rates (Last 30 Days)

```sql stage_failures
SELECT
    countIf(sold_discovery_status = 'failed') AS sold_disc_failed,
    countIf(for_sale_discovery_status = 'failed') AS for_sale_disc_failed,
    countIf(state_transition_status = 'failed') AS state_trans_failed,
    countIf(enrichment_enqueue_status = 'failed') AS enrich_enqueue_failed,
    countIf(scoring_status = 'failed') AS scoring_failed,
    count(*) AS total_runs
FROM google_cloud_postgresql_public_town_runs
WHERE started_at >= now() - INTERVAL 30 DAY
```

{% big_value data="stage_failures" value="total_runs" title="Total Runs (30d)" fmt="num0" /%}
{% big_value data="stage_failures" value="sold_disc_failed" title="Sold Discovery Failures" fmt="num0" /%}
{% big_value data="stage_failures" value="for_sale_disc_failed" title="For-Sale Discovery Failures" fmt="num0" /%}
{% big_value data="stage_failures" value="state_trans_failed" title="State Transition Failures" fmt="num0" /%}
{% big_value data="stage_failures" value="enrich_enqueue_failed" title="Enrichment Enqueue Failures" fmt="num0" /%}
{% big_value data="stage_failures" value="scoring_failed" title="Scoring Failures" fmt="num0" /%}