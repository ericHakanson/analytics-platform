# Signals Overview

Data coverage across property listings, sales, renovation scoring, and geographic reach. All statistics reflect the **trailing 30 days**.

## At a Glance

```sql portfolio_overview
select
  (select count(*) from google_cloud_postgresql_public_zillow_listings where scraped_at >= now() - INTERVAL 30 DAY)
    + (select count(*) from google_cloud_postgresql_public_redfin_listings where scraped_at >= now() - INTERVAL 30 DAY) as listed_count,
  (select count(distinct property_id) from google_cloud_postgresql_public_sales where sale_date >= toDate(now() - INTERVAL 30 DAY)) as sold_count,
  (select count(distinct property_id) from google_cloud_postgresql_public_property_renovation_scores where computed_at >= now() - INTERVAL 30 DAY) as scored_count,
  (select count(*) from google_cloud_postgresql_public_property_renovation_scores where is_renovation_candidate and computed_at >= now() - INTERVAL 30 DAY) as candidate_count
```

{% big_value data="portfolio_overview" value="listed_count" title="Properties Listed" fmt="num0" /%}

{% big_value data="portfolio_overview" value="sold_count" title="Properties Sold" fmt="num0" /%}

{% big_value data="portfolio_overview" value="scored_count" title="Renovation Scores" fmt="num0" /%}

{% big_value data="portfolio_overview" value="candidate_count" title="Renovation Candidates" fmt="num0" /%}

## Geographic Coverage

```sql coverage_overview
SELECT
    count(DISTINCT geography) AS active_geographies,
    sum(for_sale_obs_count) AS for_sale_observed,
    sum(new_listing_count) AS new_listings,
    sum(new_sale_count + late_sale_count) AS sales_detected
FROM google_cloud_postgresql_public_town_runs
WHERE started_at >= now() - INTERVAL 30 DAY
```

{% big_value data="coverage_overview" value="active_geographies" title="Active Geographies" fmt="num0" /%}

{% big_value data="coverage_overview" value="for_sale_observed" title="For-Sale Observed" fmt="num0" /%}

{% big_value data="coverage_overview" value="new_listings" title="New Listings" fmt="num0" /%}

{% big_value data="coverage_overview" value="sales_detected" title="Sales Detected" fmt="num0" /%}

```sql county_map_data
SELECT
  p.state || '-' || p.county AS state_county_id,
  p.county,
  count(DISTINCT p.property_id) AS total_properties
FROM google_cloud_postgresql_public_properties p
WHERE p.county IS NOT NULL
  AND p.county != ''
  AND p.created_at >= now() - INTERVAL 30 DAY
GROUP BY p.state || '-' || p.county, p.county
ORDER BY total_properties DESC
```

{% map title="Properties by County" height=450 initial_position=[42.2, -71.8] zoom=6 %}
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

## Renovation Funnel

```sql funnel
SELECT * FROM (
  SELECT 1 as step_order, 'MA Properties' as stage, count(DISTINCT property_id) as record_count
  FROM google_cloud_postgresql_public_properties
  WHERE state = 'MA'
    AND created_at >= now() - INTERVAL 30 DAY
  UNION ALL
  SELECT 2, 'With Sale Record', count(DISTINCT p.property_id)
  FROM google_cloud_postgresql_public_properties p
  JOIN google_cloud_postgresql_public_sales s ON p.property_id = s.property_id
  WHERE p.state = 'MA'
    AND s.sale_date >= toDate(now() - INTERVAL 30 DAY)
  UNION ALL
  SELECT 3, 'With Detail Snapshot', count(DISTINCT p.property_id)
  FROM google_cloud_postgresql_public_properties p
  JOIN google_cloud_postgresql_public_property_detail_snapshots d ON p.property_id = d.property_id
  WHERE p.state = 'MA'
    AND d.scraped_at >= now() - INTERVAL 30 DAY
  UNION ALL
  SELECT 4, 'Scored (v2 Model)', count(DISTINCT property_id)
  FROM google_cloud_postgresql_public_property_renovation_scores
  WHERE model_version = 'v2'
    AND computed_at >= now() - INTERVAL 30 DAY
  UNION ALL
  SELECT 5, 'Renovation Candidate', count(DISTINCT property_id)
  FROM google_cloud_postgresql_public_property_renovation_scores
  WHERE model_version = 'v2' AND is_renovation_candidate = true
    AND computed_at >= now() - INTERVAL 30 DAY
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
  title="Property → Candidate Funnel"
  subtitle="Percent shown relative to first stage"
/%}