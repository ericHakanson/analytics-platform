# Geographic Coverage

Which towns and counties are actively covered? What is the scraping yield and completeness per geography?

`town_runs.geography` is a free-text label (e.g. `haverhill-ma`). It is not a foreign key to `target_regions`. County-level views join through `properties` and `target_regions` via ZIP code.

## Overview (Last 30 Days)

```sql coverage_overview
SELECT
    count(DISTINCT geography) AS active_geographies,
    count(*) AS total_runs,
    countIf(status = 'completed') AS clean_runs,
    sum(new_listing_count) AS new_listings,
    sum(new_sale_count + late_sale_count) AS sales_detected,
    sum(for_sale_obs_count) AS for_sale_observed
FROM google_cloud_postgresql_public_town_runs
WHERE started_at >= now() - INTERVAL 30 DAY
```

{% big_value data="coverage_overview" value="active_geographies" title="Active Geographies" fmt="num0" /%}

{% big_value data="coverage_overview" value="total_runs" title="Total Runs" fmt="num0" /%}

{% big_value data="coverage_overview" value="clean_runs" title="Clean Runs" fmt="num0" /%}

{% big_value data="coverage_overview" value="new_listings" title="New Listings" fmt="num0" /%}

{% big_value data="coverage_overview" value="sales_detected" title="Sales Detected" fmt="num0" /%}

{% big_value data="coverage_overview" value="for_sale_observed" title="For-Sale Observed" fmt="num0" /%}

## Active Geographies (Last 30 Days)

Each row is a `town_runs.geography` label with its run history and event throughput.

```sql active_geographies
SELECT
    geography,
    max(started_at) AS last_run,
    count(*) AS total_runs,
    countIf(status = 'completed') AS clean_runs,
    sum(new_listing_count) AS new_listings,
    sum(new_sale_count + late_sale_count) AS sales_detected,
    sum(for_sale_obs_count) AS for_sale_observed,
    sum(anomaly_count) AS anomalies
FROM google_cloud_postgresql_public_town_runs
WHERE started_at >= now() - INTERVAL 30 DAY
GROUP BY 1
ORDER BY last_run DESC
```

{% bar_chart
  data="active_geographies"
  x="geography"
  y=["new_listings", "sales_detected"]
  order="new_listings desc"
  stacked=true
  title="Event Throughput by Geography (Last 30 Days)"
  subtitle="NEW_LISTING + sales (NEW_SALE + LATE_SALE)"
  y_fmt="num0"
/%}

{% table data="active_geographies" search=true /%}

## County Coverage

ZIP-level completeness from `target_regions` joined to `properties`. Shows how many ZIPs in each county have at least one property in the database.

```sql county_coverage
SELECT
    tr.county,
    tr.state,
    count(DISTINCT tr.zip_code) AS zips_in_region,
    count(DISTINCT p.zip_code) AS zips_with_properties,
    count(DISTINCT p.property_id) AS total_properties
FROM google_cloud_postgresql_public_target_regions tr
LEFT JOIN google_cloud_postgresql_public_properties p ON p.zip_code = tr.zip_code AND p.state = tr.state
GROUP BY 1, 2
ORDER BY total_properties DESC
```

{% bar_chart
  data="county_coverage"
  x="county"
  y=["zips_in_region", "zips_with_properties"]
  order="total_properties desc"
  title="ZIP Coverage by County"
  subtitle="Target ZIPs vs ZIPs with properties"
  y_fmt="num0"
/%}

{% table data="county_coverage" /%}

### Properties by County (Map)

```sql county_map_data
SELECT
  p.state || '-' || p.county AS state_county_id,
  p.county,
  count(DISTINCT p.property_id) AS total_properties
FROM google_cloud_postgresql_public_properties p
WHERE p.county IS NOT NULL
  AND p.county != ''
GROUP BY p.state || '-' || p.county, p.county
ORDER BY total_properties DESC
```

{% map title="Properties by County" height=450 initial_position=[42.2, -71.8] zoom=8 %}
    {% area_layer
        geography="us_counties"
        match_by="state-county"
        data="county_map_data"
        area_id="state_county_id"
        value="total_properties"
        value_fmt="num0"
        color_palette=["#084594"]
        show_unmatched=false
        legend=true
    /%}
{% /map %}

## Scraping Yield Trend (Last 12 Weeks)

Weekly scraping volume per geography — sold records scraped, for-sale observations, and sales detected.

```sql yield_trend
SELECT
    geography,
    toStartOfWeek(started_at) AS week,
    sum(sold_record_count) AS sold_scraped,
    sum(for_sale_obs_count) AS for_sale_scraped,
    sum(new_sale_count + late_sale_count) AS sales_detected
FROM google_cloud_postgresql_public_town_runs
WHERE started_at >= now() - INTERVAL 12 WEEK
GROUP BY 1, 2
ORDER BY 1, 2
```

{% bar_chart
  data="yield_trend"
  x="week"
  y="sales_detected"
  series="geography"
  title="Sales Detected per Week by Geography"
  y_fmt="num0"
/%}

{% bar_chart
  data="yield_trend"
  x="week"
  y="for_sale_scraped"
  series="geography"
  title="For-Sale Observations per Week by Geography"
  y_fmt="num0"
/%}

{% table data="yield_trend" /%}

## Coverage Gaps

Geographies that have had at least one run historically but no run in the last 14 days. An empty table means all geographies are actively covered.

```sql coverage_gaps
SELECT DISTINCT geography
FROM google_cloud_postgresql_public_town_runs
WHERE geography NOT IN (
    SELECT geography FROM google_cloud_postgresql_public_town_runs
    WHERE started_at >= now() - INTERVAL 14 DAY
)
ORDER BY 1
```

{% table data="coverage_gaps" /%}