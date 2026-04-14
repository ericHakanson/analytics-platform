# Data Quality

Monitors pipeline completeness, data freshness, field quality, and duplicate patterns. Use this page to catch gaps before they become operational problems.

## Pipeline Record Counts

```sql record_counts
SELECT
  (SELECT count() FROM google_cloud_postgresql_public_properties) as total_properties,
  (SELECT count() FROM google_cloud_postgresql_public_property_renovation_scores) as total_scores,
  (SELECT count() FROM google_cloud_postgresql_public_property_detail_snapshots) as total_snapshots,
  (SELECT count() FROM google_cloud_postgresql_public_sales) as total_sales,
  (SELECT count() FROM google_cloud_postgresql_public_mailing_sends) as total_mailings
```

{% big_value data="record_counts" value="total_properties" title="Properties" fmt="num0" /%}

{% big_value data="record_counts" value="total_scores" title="Renovation Scores" fmt="num0" /%}

{% big_value data="record_counts" value="total_snapshots" title="Detail Snapshots" fmt="num0" /%}

{% big_value data="record_counts" value="total_sales" title="Sales" fmt="num0" /%}

{% big_value data="record_counts" value="total_mailings" title="Mailings Sent" fmt="num0" /%}

## Pipeline Coverage Gaps

These checks identify records that are missing expected downstream data. Each gap represents a potential pipeline issue or enrichment backlog.

```sql coverage_gaps
SELECT * FROM (
  SELECT 'Properties without snapshots' as gap_type, count() as gap_count
  FROM google_cloud_postgresql_public_properties p
  LEFT JOIN google_cloud_postgresql_public_property_detail_snapshots d ON p.property_id = d.property_id
  WHERE d.property_id IS NULL

  UNION ALL

  SELECT 'Properties without sales', count()
  FROM google_cloud_postgresql_public_properties p
  LEFT JOIN google_cloud_postgresql_public_sales s ON p.property_id = s.property_id
  WHERE s.property_id IS NULL

  UNION ALL

  SELECT 'Candidates without mailings', count()
  FROM google_cloud_postgresql_public_property_renovation_scores rs
  LEFT JOIN google_cloud_postgresql_public_mailing_sends ms ON rs.property_id = ms.property_id
  WHERE rs.is_renovation_candidate = true AND ms.property_id IS NULL

  UNION ALL

  SELECT 'Sales with zero price', countIf(sale_price = 0 OR sale_price IS NULL)
  FROM google_cloud_postgresql_public_sales
) sub
ORDER BY gap_count DESC
```

{% bar_chart
  data="coverage_gaps"
  x="gap_type"
  y="gap_count"
  x_sort="data"
  title="Coverage Gaps by Type"
  subtitle="Records missing expected downstream data"
  y_fmt="num0"
/%}

## Data Freshness

Shows the most recent record timestamp for each key table. Stale tables (high days since last update) may indicate a broken scraper, failed run, or sync issue.

```sql freshness
SELECT * FROM (
  SELECT
    'Properties' as table_name,
    max(created_at) as latest_record,
    dateDiff('day', max(created_at), now()) as days_since_update,
    max(dateDiff('day', created_at, now())) as max_record_age_days,
    median(dateDiff('day', created_at, now())) as median_record_age_days,
    round(avg(dateDiff('day', created_at, now())), 1) as avg_record_age_days
  FROM google_cloud_postgresql_public_properties
  UNION ALL
  SELECT
    'Sales',
    max(created_at),
    dateDiff('day', max(created_at), now()),
    max(dateDiff('day', created_at, now())),
    median(dateDiff('day', created_at, now())),
    round(avg(dateDiff('day', created_at, now())), 1)
  FROM google_cloud_postgresql_public_sales
  UNION ALL
  SELECT
    'Detail Snapshots',
    max(created_at),
    dateDiff('day', max(created_at), now()),
    max(dateDiff('day', created_at, now())),
    median(dateDiff('day', created_at, now())),
    round(avg(dateDiff('day', created_at, now())), 1)
  FROM google_cloud_postgresql_public_property_detail_snapshots
  UNION ALL
  SELECT
    'Renovation Scores',
    max(computed_at),
    dateDiff('day', max(computed_at), now()),
    max(dateDiff('day', computed_at, now())),
    median(dateDiff('day', computed_at, now())),
    round(avg(dateDiff('day', computed_at, now())), 1)
  FROM google_cloud_postgresql_public_property_renovation_scores
) sub
ORDER BY days_since_update DESC
```

{% table data="freshness" /%}

## Property Field Completeness

Checks how many property records are missing key fields. High counts for lat/long or property_type indicate the scraper or enrichment pipeline isn't populating these fields.

```sql property_field_gaps
SELECT * FROM (
  SELECT 'Missing lat/long' as field, countIf(latitude = '' OR latitude IS NULL OR longitude = '' OR longitude IS NULL) as missing_count, count() as total_records
  FROM google_cloud_postgresql_public_properties
  UNION ALL
  SELECT 'Missing property_type', countIf(property_type = '' OR property_type IS NULL), count()
  FROM google_cloud_postgresql_public_properties
  UNION ALL
  SELECT 'Missing street_address', countIf(street_address = '' OR street_address IS NULL), count()
  FROM google_cloud_postgresql_public_properties
  UNION ALL
  SELECT 'Missing city', countIf(city = '' OR city IS NULL), count()
  FROM google_cloud_postgresql_public_properties
  UNION ALL
  SELECT 'Missing zip_code', countIf(zip_code = '' OR zip_code IS NULL), count()
  FROM google_cloud_postgresql_public_properties
) sub
ORDER BY missing_count DESC
```

{% bar_chart
  data="property_field_gaps"
  x="field"
  y="missing_count"
  x_sort="data"
  title="Properties: Missing Fields"
  subtitle="Count of property records missing each key field"
  y_fmt="num0"
/%}

### Snapshot Detail Completeness

Missing beds, baths, or sqft on detail snapshots reduces the accuracy of renovation scoring.

```sql snapshot_field_gaps
SELECT * FROM (
  SELECT 'Missing beds' as field, countIf(summary_beds IS NULL) as missing_count, count() as total_records
  FROM google_cloud_postgresql_public_property_detail_snapshots
  UNION ALL
  SELECT 'Missing baths', countIf(summary_baths IS NULL), count()
  FROM google_cloud_postgresql_public_property_detail_snapshots
  UNION ALL
  SELECT 'Missing sqft', countIf(summary_sqft IS NULL OR summary_sqft = 0), count()
  FROM google_cloud_postgresql_public_property_detail_snapshots
  UNION ALL
  SELECT 'Missing price', countIf(summary_price IS NULL), count()
  FROM google_cloud_postgresql_public_property_detail_snapshots
) sub
ORDER BY missing_count DESC
```

{% bar_chart
  data="snapshot_field_gaps"
  x="field"
  y="missing_count"
  x_sort="data"
  title="Snapshots: Missing Fields"
  subtitle="Count of detail snapshots missing key enrichment fields"
  y_fmt="num0"
/%}

## Duplicate Address Patterns

Multiple property records at the same address likely represent repeat sales of the same property (e.g., condos, multi-family). High-count addresses (10+) may indicate data issues worth investigating.

```sql dupe_summary
SELECT
  (SELECT count() FROM (
    SELECT 1 FROM google_cloud_postgresql_public_properties
    WHERE street_address != ''
    GROUP BY street_address, city, state, zip_code
    HAVING count() > 1
  )) as addresses_with_dupes,
  (SELECT sum(cnt) FROM (
    SELECT count() as cnt FROM google_cloud_postgresql_public_properties
    WHERE street_address != ''
    GROUP BY street_address, city, state, zip_code
    HAVING count() > 1
  )) as total_dupe_records
```

{% big_value data="dupe_summary" value="addresses_with_dupes" title="Addresses with Duplicates" fmt="num0" /%}

{% big_value data="dupe_summary" value="total_dupe_records" title="Total Duplicate Records" fmt="num0" /%}

```sql dupe_distribution
SELECT
  CASE
    WHEN property_count = 2 THEN '2'
    WHEN property_count = 3 THEN '3'
    WHEN property_count BETWEEN 4 AND 5 THEN '4-5'
    WHEN property_count BETWEEN 6 AND 10 THEN '6-10'
    WHEN property_count BETWEEN 11 AND 20 THEN '11-20'
    ELSE '21+'
  END as dupes_per_address,
  count() as address_count
FROM (
  SELECT street_address, city, state, zip_code, count() as property_count
  FROM google_cloud_postgresql_public_properties
  WHERE street_address != ''
  GROUP BY street_address, city, state, zip_code
  HAVING count() > 1
)
GROUP BY dupes_per_address
ORDER BY dupes_per_address
```

{% bar_chart
  data="dupe_distribution"
  x="dupes_per_address"
  y="address_count"
  x_sort="data"
  title="Duplicate Distribution"
  subtitle="Number of addresses by how many duplicate records they have"
  y_fmt="num0"
/%}

### Worst Duplicate Offenders

Addresses with the most duplicate property records. These may be condos/apartments or data ingestion issues.

```sql worst_dupes
SELECT
  street_address,
  city,
  state,
  zip_code,
  count() as property_count
FROM google_cloud_postgresql_public_properties
WHERE street_address != ''
GROUP BY street_address, city, state, zip_code
HAVING count() > 5
ORDER BY property_count DESC
LIMIT 25
```

{% table data="worst_dupes" /%}

## Run-Level Pipeline Health

Aggregated from the `run_data_quality_snapshot` table. Tracks scrape yield, record creation, and exclusion patterns per day.

```sql run_dq_daily
SELECT
  toDate(snapshot_created_at) as run_date,
  count() as runs_that_day,
  sum(total_source_records) as source_records,
  sum(properties_created) as properties_created,
  sum(sales_created) as sales_created,
  sum(records_excluded_by_deduplication) as dedup_excluded,
  sum(records_excluded_by_recency_rule) as recency_excluded,
  sum(records_eligible_for_mailing) as mailing_eligible,
  avg(scrape_yield_pct) as avg_scrape_yield
FROM google_cloud_postgresql_public_run_data_quality_snapshot
GROUP BY run_date
ORDER BY run_date
```

{% line_chart
  data="run_dq_daily"
  x="run_date"
  y="avg_scrape_yield"
  title="Average Scrape Yield % by Day"
  subtitle="Higher is better — low yield means the scraper is returning fewer usable records"
/%}

{% bar_chart
  data="run_dq_daily"
  x="run_date"
  y=["properties_created", "recency_excluded", "mailing_eligible"]
  title="Records Created vs Excluded per Day"
  subtitle="Breakdown of what happened to ingested records"
  y_fmt="num0"
  stacked=true
/%}

## Enrichment Checkpoint Health

Shows the status of detail enrichment batches. Aborted or stuck-running checkpoints may need manual intervention.

```sql enrichment_status
SELECT
  status,
  count() as checkpoint_count,
  sum(total_properties) as total_properties_targeted,
  sum(success_count) as total_success,
  sum(failure_count) as total_failures
FROM google_cloud_postgresql_public_detail_enrichment_checkpoints
GROUP BY status
ORDER BY checkpoint_count DESC
```

{% bar_chart
  data="enrichment_status"
  x="status"
  y=["total_success", "total_failures"]
  title="Enrichment Results by Status"
  subtitle="Success vs failure counts across checkpoint batches"
  y_fmt="num0"
  stacked=true
/%}

{% table data="enrichment_status" /%}