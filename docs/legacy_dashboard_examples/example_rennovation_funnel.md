
# Renovation Funnel

Tracks every property from ingestion through scoring, candidacy, and mailing. Identifies where volume drops off, what drives high scores, and where mailing outreach has gaps.

## Funnel Overview

```sql funnel
SELECT * FROM (
  SELECT 1 as step_order, 'MA Properties' as stage, count(DISTINCT property_id) as record_count
  FROM google_cloud_postgresql_public_properties WHERE state = 'MA'
  UNION ALL
  SELECT 2, 'With Sale Record', count(DISTINCT p.property_id)
  FROM google_cloud_postgresql_public_properties p
  JOIN google_cloud_postgresql_public_sales s ON p.property_id = s.property_id
  WHERE p.state = 'MA'
  UNION ALL
  SELECT 3, 'With Detail Snapshot', count(DISTINCT p.property_id)
  FROM google_cloud_postgresql_public_properties p
  JOIN google_cloud_postgresql_public_property_detail_snapshots d ON p.property_id = d.property_id
  WHERE p.state = 'MA'
  UNION ALL
  SELECT 4, 'Scored (v2 Model)', count(DISTINCT property_id)
  FROM google_cloud_postgresql_public_property_renovation_scores
  WHERE model_version = 'v2'
  UNION ALL
  SELECT 5, 'Renovation Candidate', count(DISTINCT property_id)
  FROM google_cloud_postgresql_public_property_renovation_scores
  WHERE model_version = 'v2' AND is_renovation_candidate = true
  UNION ALL
  SELECT 6, 'Mailed', count(DISTINCT property_id)
  FROM google_cloud_postgresql_public_mailing_sends
) sub
ORDER BY step_order
```

{% funnel_chart
  data="funnel"
  category="stage"
  value="record_count"
  value_fmt="num0"
  show_percent=true
  align="left"
  title="Property → Mailing Funnel"
  subtitle="Percent shown relative to first stage"
/%}

```sql funnel_rates
SELECT * FROM (
  SELECT
    1 as step_order,
    'Properties → Sale' as transition,
    (SELECT count(DISTINCT p.property_id) FROM google_cloud_postgresql_public_properties p JOIN google_cloud_postgresql_public_sales s ON p.property_id = s.property_id WHERE p.state = 'MA')
    / (SELECT count(DISTINCT property_id) FROM google_cloud_postgresql_public_properties WHERE state = 'MA') as conversion_rate
  UNION ALL
  SELECT
    2,
    'Sale → Snapshot',
    (SELECT count(DISTINCT p.property_id) FROM google_cloud_postgresql_public_properties p JOIN google_cloud_postgresql_public_property_detail_snapshots d ON p.property_id = d.property_id WHERE p.state = 'MA')
    / (SELECT count(DISTINCT p.property_id) FROM google_cloud_postgresql_public_properties p JOIN google_cloud_postgresql_public_sales s ON p.property_id = s.property_id WHERE p.state = 'MA')
  UNION ALL
  SELECT
    3,
    'Snapshot → Scored',
    (SELECT count(DISTINCT property_id) FROM google_cloud_postgresql_public_property_renovation_scores WHERE model_version = 'v2')
    / (SELECT count(DISTINCT p.property_id) FROM google_cloud_postgresql_public_properties p JOIN google_cloud_postgresql_public_property_detail_snapshots d ON p.property_id = d.property_id WHERE p.state = 'MA')
  UNION ALL
  SELECT
    4,
    'Scored → Candidate',
    (SELECT count(DISTINCT property_id) FROM google_cloud_postgresql_public_property_renovation_scores WHERE model_version = 'v2' AND is_renovation_candidate = true)
    / (SELECT count(DISTINCT property_id) FROM google_cloud_postgresql_public_property_renovation_scores WHERE model_version = 'v2')
  UNION ALL
  SELECT
    5,
    'Candidate → Mailed',
    (SELECT count(DISTINCT property_id) FROM google_cloud_postgresql_public_mailing_sends)
    / (SELECT count(DISTINCT property_id) FROM google_cloud_postgresql_public_property_renovation_scores WHERE model_version = 'v2' AND is_renovation_candidate = true)
) sub
ORDER BY step_order
```

{% bar_chart
  data="funnel_rates"
  x="transition"
  y="conversion_rate"
  x_sort="data"
  title="Step-over-Step Conversion Rates"
  subtitle="The big drop: only 30% of scored properties become candidates, and only 3% of candidates have been mailed"
  y_fmt="pct1"
/%}

## Score Distribution

How renovation scores are distributed across all v2-scored properties. The candidate threshold sits around score 35 — everything above is a renovation candidate.

```sql score_histogram
SELECT
  floor(renovation_score / 10) * 10 as score_bucket,
  count() as total_properties,
  countIf(is_renovation_candidate = true) as candidates
FROM google_cloud_postgresql_public_property_renovation_scores
WHERE model_version = 'v2'
GROUP BY score_bucket
ORDER BY score_bucket
```

{% bar_chart
  data="score_histogram"
  x="score_bucket"
  y=["total_properties", "candidates"]
  x_sort="data"
  title="Score Distribution (10-point buckets)"
  subtitle="Orange = renovation candidates. The 0–20 range holds the bulk of non-candidates."
  y_fmt="num0"
/%}

### Score Band Summary

```sql band_summary
SELECT
  renovation_band,
  count() as properties,
  avg(renovation_score) as avg_score,
  countIf(is_renovation_candidate = true) as candidates,
  countIf(is_renovation_candidate = true) / count() as candidate_rate
FROM google_cloud_postgresql_public_property_renovation_scores
WHERE model_version = 'v2'
GROUP BY renovation_band
ORDER BY avg_score DESC
```

{% table data="band_summary" /%}

## What Drives the Score

The renovation score is composed of four sub-scores: **age_score** (property age), **ppsf_score** (price per square foot), **text_score** (listing text signals), and **price_history_score**. Age and PPSF dominate — price_history_score is currently zero across all bands.

```sql score_components
SELECT * FROM (
  SELECT 'High (60+)' as score_tier, 1 as tier_order, 'Age Score' as component, avg(age_score) as avg_points
  FROM google_cloud_postgresql_public_property_renovation_scores WHERE model_version = 'v2' AND renovation_score >= 60
  UNION ALL
  SELECT 'High (60+)', 1, 'PPSF Score', avg(ppsf_score)
  FROM google_cloud_postgresql_public_property_renovation_scores WHERE model_version = 'v2' AND renovation_score >= 60
  UNION ALL
  SELECT 'High (60+)', 1, 'Text Score', avg(text_score)
  FROM google_cloud_postgresql_public_property_renovation_scores WHERE model_version = 'v2' AND renovation_score >= 60
  UNION ALL
  SELECT 'Medium (35-59)', 2, 'Age Score', avg(age_score)
  FROM google_cloud_postgresql_public_property_renovation_scores WHERE model_version = 'v2' AND renovation_score >= 35 AND renovation_score < 60
  UNION ALL
  SELECT 'Medium (35-59)', 2, 'PPSF Score', avg(ppsf_score)
  FROM google_cloud_postgresql_public_property_renovation_scores WHERE model_version = 'v2' AND renovation_score >= 35 AND renovation_score < 60
  UNION ALL
  SELECT 'Medium (35-59)', 2, 'Text Score', avg(text_score)
  FROM google_cloud_postgresql_public_property_renovation_scores WHERE model_version = 'v2' AND renovation_score >= 35 AND renovation_score < 60
  UNION ALL
  SELECT 'Low (<35)', 3, 'Age Score', avg(age_score)
  FROM google_cloud_postgresql_public_property_renovation_scores WHERE model_version = 'v2' AND renovation_score < 35
  UNION ALL
  SELECT 'Low (<35)', 3, 'PPSF Score', avg(ppsf_score)
  FROM google_cloud_postgresql_public_property_renovation_scores WHERE model_version = 'v2' AND renovation_score < 35
  UNION ALL
  SELECT 'Low (<35)', 3, 'Text Score', avg(text_score)
  FROM google_cloud_postgresql_public_property_renovation_scores WHERE model_version = 'v2' AND renovation_score < 35
) sub
ORDER BY tier_order, component
```

{% horizontal_bar_chart
  data="score_components"
  y="score_tier"
  x="avg_points"
  series="component"
  y_sort="data"
  stacked=true
  title="Average Score Component Contribution by Tier"
  subtitle="Age score is the largest driver. PPSF separates High from Low. Text contributes minimally."
  x_fmt="num1"
/%}

## Mailing Outreach

One batch of 493 mailings has been sent (Feb 22, 2026). All were unique properties — no repeat sends yet. The new DM campaign system (`dm_campaigns`, `dm_mail_jobs`) has been built but has zero records so far.

```sql mailing_stats
SELECT
  count() as total_sends,
  count(DISTINCT property_id) as unique_properties,
  count() - count(DISTINCT property_id) as repeat_sends,
  count(DISTINCT batch_id) as batches
FROM google_cloud_postgresql_public_mailing_sends
```

{% big_value data="mailing_stats" value="total_sends" title="Total Sends" fmt="num0" /%}

{% big_value data="mailing_stats" value="unique_properties" title="Unique Properties Mailed" fmt="num0" /%}

{% big_value data="mailing_stats" value="batches" title="Batches" fmt="num0" /%}

### What Score Bands Were Mailed?

Shows which score buckets the 493 mailed properties fell into. Mailings were concentrated in the 50–80 range — the strongest candidates.

```sql mailed_by_score
SELECT
  floor(rs.renovation_score / 10) * 10 as score_bucket,
  count(DISTINCT ms.property_id) as mailed_count
FROM google_cloud_postgresql_public_mailing_sends ms
JOIN google_cloud_postgresql_public_property_renovation_scores rs ON ms.property_id = rs.property_id
WHERE rs.model_version = 'v2'
GROUP BY score_bucket
ORDER BY score_bucket
```

{% bar_chart
  data="mailed_by_score"
  x="score_bucket"
  y="mailed_count"
  x_sort="data"
  title="Mailed Properties by Score Bucket"
  subtitle="Concentrated in 50–80 range"
  y_fmt="num0"
/%}

## City-Level Funnel

Full funnel by city — properties, scored, candidates, mailed. Cities with 50+ properties shown. Sorted by total candidates to highlight where the biggest pools of opportunity are.

```sql city_funnel
SELECT
  p.city,
  count(DISTINCT p.property_id) as properties,
  count(DISTINCT rs.property_id) as scored,
  countIf(rs.is_renovation_candidate = true) as candidates,
  count(DISTINCT ms.property_id) as mailed,
  countIf(rs.is_renovation_candidate = true) - count(DISTINCT ms.property_id) as unmailed_candidates,
  count(DISTINCT ms.property_id) / greatest(countIf(rs.is_renovation_candidate = true), 1) as mail_rate
FROM google_cloud_postgresql_public_properties p
LEFT JOIN (
  SELECT property_id, is_renovation_candidate
  FROM google_cloud_postgresql_public_property_renovation_scores
  WHERE model_version = 'v2'
) rs ON p.property_id = rs.property_id
LEFT JOIN google_cloud_postgresql_public_mailing_sends ms ON p.property_id = ms.property_id
WHERE p.state = 'MA' AND p.city != ''
GROUP BY p.city
HAVING properties >= 50
ORDER BY candidates DESC
```

{% bar_chart
  data="city_funnel"
  x="city"
  y=["candidates", "mailed"]
  x_sort="data"
  title="Renovation Candidates vs. Mailed by City"
  subtitle="Most cities have zero mailings. Belmont leads with 138 mailed out of 300 candidates."
  y_fmt="num0"
  limit=30
/%}

{% table data="city_funnel" /%}

## Candidate Economics

Sale price comparison between renovation candidates and non-candidates. Candidates tend to sell at slightly lower prices — consistent with properties that need work.

```sql candidate_economics
SELECT * FROM (
  SELECT
    'Candidate' as segment,
    count() as sales,
    avg(s.sale_price) as avg_sale_price,
    median(s.sale_price) as median_sale_price
  FROM google_cloud_postgresql_public_property_renovation_scores rs
  JOIN google_cloud_postgresql_public_sales s ON rs.property_id = s.property_id
  WHERE rs.model_version = 'v2' AND rs.is_renovation_candidate = true AND s.sale_price > 1000
  UNION ALL
  SELECT
    'Non-Candidate',
    count(),
    avg(s.sale_price),
    median(s.sale_price)
  FROM google_cloud_postgresql_public_property_renovation_scores rs
  JOIN google_cloud_postgresql_public_sales s ON rs.property_id = s.property_id
  WHERE rs.model_version = 'v2' AND rs.is_renovation_candidate = false AND s.sale_price > 1000
) sub
ORDER BY segment
```

{% bar_chart
  data="candidate_economics"
  x="segment"
  y=["avg_sale_price", "median_sale_price"]
  title="Sale Price: Candidates vs. Non-Candidates"
  subtitle="Candidates sell slightly lower — consistent with properties needing renovation"
  y_fmt="usd0"
/%}

## Top Unmailed Candidates

Highest-scoring renovation candidates that have never been mailed. These are your best next targets for outreach.

```sql top_unmailed
SELECT
  p.street_address,
  p.city,
  p.zip_code,
  rs.renovation_score,
  rs.renovation_band,
  rs.age_score,
  rs.ppsf_score,
  s.sale_price,
  s.sale_date
FROM google_cloud_postgresql_public_property_renovation_scores rs
JOIN google_cloud_postgresql_public_properties p ON rs.property_id = p.property_id
LEFT JOIN google_cloud_postgresql_public_sales s ON rs.property_id = s.property_id
LEFT JOIN google_cloud_postgresql_public_mailing_sends ms ON rs.property_id = ms.property_id
WHERE rs.model_version = 'v2'
  AND rs.is_renovation_candidate = true
  AND ms.property_id IS NULL
  AND p.state = 'MA'
ORDER BY rs.renovation_score DESC
LIMIT 50
```

{% table data="top_unmailed" /%}