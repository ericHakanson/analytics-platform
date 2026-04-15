# Signals Overview

Data coverage across property listings, sales, renovation scoring, and geographic reach. All statistics reflect the **trailing 30 days**.

## At a Glance

```sql portfolio_overview
select * from google_cloud_postgresql.signals_overview_portfolio
```

<BigValue data={portfolio_overview} value="listed_count" title="Properties Listed" fmt="num0" />

<BigValue data={portfolio_overview} value="sold_count" title="Properties Sold" fmt="num0" />

<BigValue data={portfolio_overview} value="scored_count" title="Renovation Scores" fmt="num0" />

<BigValue data={portfolio_overview} value="candidate_count" title="Renovation Candidates" fmt="num0" />

## Geographic Coverage

```sql coverage_overview
select * from google_cloud_postgresql.signals_overview_coverage
```

<BigValue data={coverage_overview} value="active_geographies" title="Active Geographies" fmt="num0" />

<BigValue data={coverage_overview} value="for_sale_observed" title="For-Sale Observed" fmt="num0" />

<BigValue data={coverage_overview} value="new_listings" title="New Listings" fmt="num0" />

<BigValue data={coverage_overview} value="sales_detected" title="Sales Detected" fmt="num0" />

```sql county_map_data
select * from google_cloud_postgresql.signals_overview_county_map
```

<AreaMap
    data={county_map_data}
    geoJsonUrl="/geo/ma-counties.geojson"
    geoId="NAME"
    areaCol="county"
    value="total_properties"
    valueFmt="num0"
    title="Properties by County (Trailing 30 Days)"
    startingLat=42.2
    startingLong=-71.8
    startingZoom=7
    legend=true
/>

## Renovation Funnel

```sql funnel
select * from google_cloud_postgresql.signals_overview_funnel
order by step_order
```

<FunnelChart
    data={funnel}
    nameCol=stage
    valueCol=record_count
    valueFmt=num0
    showPercent=true
    title="Property → Candidate Funnel"
    subtitle="Percent shown relative to first stage"
/>
