# Properties For Sale

Active for-sale inventory tracked by the pipeline. New listings are detected via `NEW_LISTING` events from the for-sale feed.

```sql for_sale_summary
SELECT count(*) AS active_for_sale
FROM google_cloud_postgresql_public_property_state
WHERE current_state = 'FOR_SALE'
```

```sql sold_summary
SELECT count(*) AS total_sold
FROM google_cloud_postgresql_public_property_state
WHERE current_state = 'SOLD'
```

{% big_value data="for_sale_summary" value="active_for_sale" title="Active For Sale" fmt="num0" /%}

{% big_value data="sold_summary" value="total_sold" title="Total Sold" fmt="num0" /%}

## New Listings per Week

```sql new_listings_weekly
SELECT
    toStartOfWeek(pe.detected_at) AS week,
    dr.geography,
    count(*) AS new_listings
FROM google_cloud_postgresql_public_property_events pe
JOIN google_cloud_postgresql_public_discovery_runs dr ON dr.run_id = pe.run_id
WHERE pe.event_type = 'NEW_LISTING'
  AND pe.detected_at >= now() - INTERVAL 12 WEEK
GROUP BY 1, 2
ORDER BY 1, 2
```

{% bar_chart
  data="new_listings_weekly"
  x="week"
  y="new_listings"
  series="geography"
  title="New Listings per Week by Geography"
  subtitle="NEW_LISTING events from the for-sale feed (trailing 12 weeks)"
  y_fmt="num0"
/%}

## Days on Market Distribution

Time since first observed in the for-sale feed. Proxy for days on market.

```sql dom_distribution
SELECT
    CASE
        WHEN dateDiff('day', first_seen_at, now()) < 7  THEN '0-7 days'
        WHEN dateDiff('day', first_seen_at, now()) < 30 THEN '8-30 days'
        WHEN dateDiff('day', first_seen_at, now()) < 90 THEN '31-90 days'
        ELSE '90+ days'
    END AS dom_bucket,
    count(*) AS properties,
    min(dateDiff('day', first_seen_at, now())) as sort_order
FROM google_cloud_postgresql_public_property_state
WHERE current_state = 'FOR_SALE'
GROUP BY 1
ORDER BY sort_order
```

{% bar_chart
  data="dom_distribution"
  x="dom_bucket"
  y="properties"
  x_sort="data"
  title="Active Listings by Days on Market"
  y_fmt="num0"
/%}

## For-Sale Inventory by Geography

```sql for_sale_by_geography
SELECT
    dr.geography,
    count(distinct ps.property_key) AS for_sale_count
FROM google_cloud_postgresql_public_property_state ps
JOIN google_cloud_postgresql_public_discovery_runs dr ON dr.run_id = ps.last_discovery_run_id
WHERE ps.current_state = 'FOR_SALE'
GROUP BY 1
ORDER BY 2 DESC
```

{% bar_chart
  data="for_sale_by_geography"
  x="geography"
  y="for_sale_count"
  x_sort="data"
  title="Active For-Sale Inventory by Geography"
  y_fmt="num0"
/%}

{% table data="for_sale_by_geography" /%}

# Properties Sold

Sales detected by the pipeline via **NEW_SALE** (transitioned from FOR_SALE → SOLD) and **LATE_SALE** (appeared directly in the sold feed). A rising NEW_SALE share means the for-sale feed is seeding `property_state` effectively, giving earlier signal.

```sql sale_event_counts
SELECT
    event_type,
    count(*) AS cnt,
    round(count(*) * 100.0 / sum(count(*)) OVER (), 1) AS pct
FROM google_cloud_postgresql_public_property_events
WHERE event_type IN ('NEW_SALE', 'LATE_SALE')
  AND detected_at >= now() - INTERVAL 30 DAY
GROUP BY 1
ORDER BY cnt DESC
```

{% big_value data="sale_event_counts" value="cnt" title="Sale Events (30d)" fmt="num0" /%}

{% table data="sale_event_counts" /%}

## Sales Detected per Week

```sql sales_weekly
SELECT
    toStartOfWeek(pe.detected_at) AS week,
    pe.event_type,
    count(*) AS sales_detected
FROM google_cloud_postgresql_public_property_events pe
WHERE pe.event_type IN ('NEW_SALE', 'LATE_SALE')
  AND pe.detected_at >= now() - INTERVAL 12 WEEK
GROUP BY 1, 2
ORDER BY 1, 2
```

{% bar_chart
  data="sales_weekly"
  x="week"
  y="sales_detected"
  series="event_type"
  title="Sales Detected per Week"
  subtitle="NEW_SALE vs LATE_SALE (trailing 12 weeks)"
  y_fmt="num0"
/%}

## R22 Anomalies: Sold Properties Re-Listed

Properties that re-appeared for sale after being marked SOLD. Flagged for review — not sent to enrichment.

```sql r22_anomalies
SELECT
    dr.geography,
    count(*) AS r22_count,
    max(pe.detected_at) AS most_recent
FROM google_cloud_postgresql_public_property_events pe
JOIN google_cloud_postgresql_public_discovery_runs dr ON dr.run_id = pe.run_id
WHERE pe.raw_reason = 'R22_SOLD_RELIST_ANOMALY'
  AND pe.detected_at >= now() - INTERVAL 30 DAY
GROUP BY 1
ORDER BY 2 DESC
```

{% bar_chart
  data="r22_anomalies"
  x="geography"
  y="r22_count"
  order="r22_count desc"
  title="R22 Anomalies by Geography (Last 30 Days)"
  y_fmt="num0"
/%}

{% table data="r22_anomalies" /%}

## Median Sale Price by Geography (Last 30 Days)

```sql sale_prices
SELECT
    p.city || ', ' || p.state AS geography,
    count(*) AS sales_count,
    round(quantile(0.5)(s.sale_price)) AS median_sale_price
FROM google_cloud_postgresql_public_sales s
JOIN google_cloud_postgresql_public_properties p ON p.property_id = s.property_id
WHERE s.sale_date >= today() - 30
  AND s.sale_price IS NOT NULL
GROUP BY 1
HAVING count(*) >= 3
ORDER BY sales_count DESC
```

{% bar_chart
  data="sale_prices"
  x="geography"
  y="median_sale_price"
  order="median_sale_price desc"
  title="Median Sale Price by Geography"
  subtitle="Last 30 days, minimum 3 sales"
  y_fmt="usd0"
  limit=25
/%}

{% table data="sale_prices" /%}

# Next Best Action (Scoring)

Which recently sold properties are the strongest renovation candidates? What is the scoring distribution and signal quality?

Only **NEW_SALE** and **LATE_SALE** events progress a property through enrichment and scoring. Filter or group all scoring views by `model_version`.

## Model Version Comparison

```sql model_comparison
SELECT
    model_version,
    count(*) AS total_scored,
    countIf(renovation_band = 'High') AS high_band,
    countIf(renovation_band = 'Medium') AS medium_band,
    countIf(renovation_band = 'Low') AS low_band,
    round(avg(renovation_score), 1) AS avg_score
FROM google_cloud_postgresql_public_property_renovation_scores
GROUP BY 1
ORDER BY 1
```

{% table data="model_comparison" /%}

## Score Distribution by Band

```sql score_distribution
SELECT
    model_version,
    renovation_band,
    count(*) AS properties,
    round(avg(renovation_score), 1) AS avg_score
FROM google_cloud_postgresql_public_property_renovation_scores
GROUP BY 1, 2
ORDER BY 1, avg_score DESC
```

{% bar_chart
  data="score_distribution"
  x="renovation_band"
  y="properties"
  series="model_version"
  title="Score Distribution by Band & Model Version"
  x_sort=["Low", "Medium", "High"]
  y_fmt="num0"
/%}

{% table data="score_distribution" /%}

## Score Component Breakdown (v2, Last 30 Days)

Average contribution of each scoring component. `text_score` ranges from -40 to +50 (keyword signal), `age_score` rewards older homes, `ppsf_score` rewards below-median price/sqft.

```sql score_components
SELECT
    round(avg(text_score), 1) AS avg_text_score,
    round(avg(age_score), 1) AS avg_age_score,
    round(avg(ppsf_score), 1) AS avg_ppsf_score,
    round(avg(price_history_score), 1) AS avg_price_history_score,
    round(avg(renovation_score), 1) AS avg_total,
    count(*) AS n
FROM google_cloud_postgresql_public_property_renovation_scores
WHERE model_version = 'v2'
  AND computed_at >= now() - INTERVAL 30 DAY
```

{% big_value data="score_components" value="avg_total" title="Avg Total Score" fmt="num1" /%}
{% big_value data="score_components" value="avg_text_score" title="Avg Text Score" fmt="num1" /%}
{% big_value data="score_components" value="avg_age_score" title="Avg Age Score" fmt="num1" /%}
{% big_value data="score_components" value="avg_ppsf_score" title="Avg PPSF Score" fmt="num1" /%}
{% big_value data="score_components" value="avg_price_history_score" title="Avg Price History Score" fmt="num1" /%}
{% big_value data="score_components" value="n" title="Properties Scored" fmt="num0" /%}

## Scoring Coverage per Geography (Last 7 Days)

How completely each geography was scored in recent pipeline cycles. A low `scored_pct` indicates missing detail snapshots or scoring failures.

```sql scoring_coverage
SELECT
    geography,
    scoring_eligible,
    scoring_scored,
    scoring_skipped,
    scoring_failed,
    round(scoring_scored * 100.0 / nullIf(scoring_eligible, 0), 1) AS scored_pct,
    toDate(started_at) AS run_date
FROM google_cloud_postgresql_public_town_runs
WHERE started_at >= now() - INTERVAL 7 DAY
ORDER BY started_at DESC
```

{% table data="scoring_coverage" /%}

## Top Candidates Not Yet Mailed

Highest-scoring renovation candidates (v2) that have not received a mailing. Sorted by score descending — the top of this list is your next mailing batch. An empty table means all candidates have been mailed.

```sql top_unmailed
SELECT
    p.street_address,
    p.city,
    p.state,
    p.zip_code,
    coalesce(tr.county, 'Unknown') AS county,
    prs.renovation_score,
    prs.renovation_band,
    prs.text_score,
    prs.age_score,
    prs.ppsf_score,
    s.sale_date,
    s.sale_price
FROM google_cloud_postgresql_public_property_renovation_scores prs
JOIN google_cloud_postgresql_public_properties p ON p.property_id = prs.property_id
LEFT JOIN google_cloud_postgresql_public_target_regions tr ON tr.zip_code = p.zip_code AND tr.state = p.state
LEFT JOIN google_cloud_postgresql_public_sales s ON s.property_id = p.property_id
LEFT JOIN google_cloud_postgresql_public_mailing_sends ms ON ms.property_id = p.property_id
WHERE prs.is_renovation_candidate = true
  AND prs.model_version = 'v2'
  AND ms.send_id IS NULL
ORDER BY prs.renovation_score DESC, s.sale_date DESC NULLS LAST
LIMIT 100
```

{% table data="top_unmailed" search=true /%}