# Signals Overview

Real-time coverage across Massachusetts property listings, sales activity, renovation scoring, and geographic reach. All statistics reflect the **trailing 30 days** and are refreshed each time this page is built.

> **Data freshness:** This dashboard is built from live database snapshots. The figures below reflect activity observed through {portfolio_overview[0].built_at}. Scores are computed by Fort Island's v2 renovation model; candidate thresholds are reviewed quarterly.

## At a Glance

```sql portfolio_overview
select * from google_cloud_postgresql.signals_overview_portfolio
```

<BigValue data={portfolio_overview} value="listed_count" title="Properties Listed" fmt="num0" />

<BigValue data={portfolio_overview} value="sold_count" title="Properties Sold" fmt="num0" />

<BigValue data={portfolio_overview} value="scored_count" title="Renovation Scores" fmt="num0" />

<BigValue data={portfolio_overview} value="candidate_count" title="Renovation Candidates" fmt="num0" />

## Geographic Coverage

Active geographies are Massachusetts towns and cities where Fort Island's pipeline observed at least one listing event in the trailing 30 days.

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

Properties enter the funnel when observed in a listing feed. Each subsequent stage requires an additional data signal — a recorded sale, a detail snapshot, a computed renovation score, and finally meeting the renovation candidate threshold.

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

---

*Fort Island tracks Massachusetts residential properties using automated listing feeds and public records. Renovation scores are produced by a proprietary model trained on historical renovation outcomes. Candidate designation indicates a property meets minimum score and data-completeness thresholds — it is not a recommendation to buy or sell.*
